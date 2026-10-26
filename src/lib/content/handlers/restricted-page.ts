/**
 * Kısıtlı İçerik Güncelleme Handler'ı — YALNIZCA MEVCUT sayfa içeriğini günceller.
 *
 * Katı kurallar (yerel sayfalar için):
 *  1) Yeni sayfa AÇILAMAZ (INSERT yasak): slug pages tablosunda MUTLAKA kayıtlı
 *     olmalıdır; yoksa 404 + "Sadece mevcut sayfaların içerikleri güncellenebilir".
 *  2) Slug DEĞİŞTİRİLEMEZ: yalnızca lookup anahtarıdır, UPDATE set listesinde yoktur.
 *  3) Payload tam olarak şu alanları içermelidir (başka alan kabul edilmez):
 *     slug, content, summary (→ Yerel giriş paragrafı: lokal_aciklama),
 *     meta_title, meta_description, lokal_sss, status.
 *  4) Kalite sınırları (eksik/yüzeysel içerik DB'ye yazılmadan reddedilir):
 *     content ≥ 1000 karakter VEYA ≥ 250 kelime; summary ≥ 50 karakter;
 *     lokal_sss ≥ 3 dolu soru-cevap; meta_title / meta_description boş olamaz.
 *  5) Sadece UPDATE: markdown_content, lokal_aciklama, meta_title,
 *     meta_description, lokal_sss, source_type='manual', status WHERE slug = $1.
 *  6) Başarı sonrası revalidateTag + revalidatePath → değişiklik anında canlıya.
 *  7) Yanıt yalnızca işlem özeti (id/hash/user sızdırılmaz).
 *
 * /api/content (POST type'siz veya PUT) ve /api/content/update üzerinden çağrılır.
 */

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import pool from "@/lib/db/pool";
import { hashPageContent } from "@/lib/pages/hash";
import { sanitizeHTML } from "@/lib/security";
import { SITE_URL } from "@/lib/site-url";
import { servicePath } from "@/lib/content-path";
import { invalidatePageCaches } from "@/lib/redis/page-cache";
import { fail } from "../response";
import { isPlainRecord } from "../validation";
import { PAGE_STATUSES } from "../constants";

const RESTRICTED_PAGE_FIELDS: ReadonlySet<string> = new Set([
  "slug",
  "content",
  "summary",
  "meta_title",
  "meta_description",
  "lokal_sss",
  "status",
]);

// Slug: "<hizmet>/<konum>" — yalnızca küçük harf a-z0-9 ve tire; tek "/".
const RESTRICTED_PAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RESTRICTED_PAGE_LIMITS = {
  contentMinChars: 1000,
  contentMinWords: 250,
  contentMaxChars: 200_000,
  summaryMinChars: 50,
  summaryMaxChars: 400,
  metaTitleMaxChars: 160,
  metaDescriptionMaxChars: 320,
  faqMinItems: 3,
  faqMaxItems: 10,
  faqTextMaxChars: 500,
  slugMaxChars: 255,
} as const;

/** lokal_sss: yalnızca {question, answer}; dolu, XSS temizlikli. */
function cleanRestrictedFaq(raw: unknown): Array<{ question: string; answer: string }> | string {
  if (!Array.isArray(raw)) return "lokal_sss bir dizi olmalı";
  if (raw.length < RESTRICTED_PAGE_LIMITS.faqMinItems) {
    return `lokal_sss en az ${RESTRICTED_PAGE_LIMITS.faqMinItems} soru-cevap içermelidir`;
  }
  if (raw.length > RESTRICTED_PAGE_LIMITS.faqMaxItems) {
    return `lokal_sss en fazla ${RESTRICTED_PAGE_LIMITS.faqMaxItems} soru-cevap içerebilir`;
  }
  const out: Array<{ question: string; answer: string }> = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!isPlainRecord(item)) {
      return `lokal_sss[${i}] bir nesne olmalı`;
    }
    const record = item;
    const unknownKeys = Object.keys(record).filter((k) => k !== "question" && k !== "answer");
    if (unknownKeys.length > 0) {
      return `lokal_sss[${i}] izin verilmeyen alan(lar): ${unknownKeys.join(", ")}`;
    }
    const q = record.question;
    const a = record.answer;
    if (typeof q !== "string" || !q.trim() || typeof a !== "string" || !a.trim()) {
      return `lokal_sss[${i}] question ve answer boş olamaz`;
    }
    out.push({
      question: sanitizeHTML(q.trim().slice(0, RESTRICTED_PAGE_LIMITS.faqTextMaxChars)),
      answer: sanitizeHTML(a.trim().slice(0, RESTRICTED_PAGE_LIMITS.faqTextMaxChars)),
    });
  }
  return out;
}

export async function handleRestrictedPageUpdate(
  body: Record<string, unknown>,
): Promise<NextResponse> {
  if (!isPlainRecord(body)) {
    return fail(400, "VALIDATION_ERROR", "İstek gövdesi bir JSON nesnesi olmalı");
  }

  // ── 3) Alan beyaz listesi: yalnızca izin verilen 7 alan ─────────────────────
  const unknownKeys = Object.keys(body).filter((k) => !RESTRICTED_PAGE_FIELDS.has(k));
  if (unknownKeys.length > 0) {
    return fail(400, "VALIDATION_ERROR", `İzin verilmeyen alan(lar): ${unknownKeys.join(", ")}`);
  }

  // Tüm alanlar zorunlu.
  const missing = ["slug", "content", "summary", "meta_title", "meta_description", "lokal_sss", "status"]
    .filter((f) => body[f] === undefined || body[f] === null);
  if (missing.length > 0) {
    return fail(400, "VALIDATION_ERROR", `Eksik alan(lar): ${missing.join(", ")}`);
  }

  // ── Slug: desen doğrulaması (değiştirilemez; yalnızca lookup) ──────────────
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (
    !slug ||
    slug.length > RESTRICTED_PAGE_LIMITS.slugMaxChars ||
    !RESTRICTED_PAGE_SLUG_PATTERN.test(slug)
  ) {
    return fail(
      400,
      "VALIDATION_ERROR",
      `slug "${slug}" geçersiz — "<hizmet>/<konum>" biçiminde, küçük harf a-z0-9 ve tire olmalı`,
    );
  }

  // ── Content: kalite sınırları (≥1000 karakter VEYA ≥250 kelime) ─────────────
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const wordCount = content ? content.split(/\s+/).length : 0;
  if (
    content.length < RESTRICTED_PAGE_LIMITS.contentMinChars &&
    wordCount < RESTRICTED_PAGE_LIMITS.contentMinWords
  ) {
    return fail(
      400,
      "CONTENT_TOO_SHORT",
      `İçerik yetersiz veya eksik formatta. content en az ${RESTRICTED_PAGE_LIMITS.contentMinChars} karakter VEYA ${RESTRICTED_PAGE_LIMITS.contentMinWords} kelime olmalı (gelen: ${content.length} karakter, ${wordCount} kelime)`,
    );
  }
  if (content.length > RESTRICTED_PAGE_LIMITS.contentMaxChars) {
    return fail(
      400,
      "VALIDATION_ERROR",
      `content en fazla ${RESTRICTED_PAGE_LIMITS.contentMaxChars} karakter olabilir`,
    );
  }

  // ── Summary (Yerel giriş paragrafı → lokal_aciklama) ──────────────────────
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  if (summary.length < RESTRICTED_PAGE_LIMITS.summaryMinChars) {
    return fail(
      400,
      "CONTENT_TOO_SHORT",
      `İçerik yetersiz veya eksik formatta. summary (Yerel giriş paragrafı) en az ${RESTRICTED_PAGE_LIMITS.summaryMinChars} karakter olmalı (gelen: ${summary.length})`,
    );
  }
  if (summary.length > RESTRICTED_PAGE_LIMITS.summaryMaxChars) {
    return fail(
      400,
      "VALIDATION_ERROR",
      `summary en fazla ${RESTRICTED_PAGE_LIMITS.summaryMaxChars} karakter olabilir`,
    );
  }

  // ── Meta title / description: boş olamaz ───────────────────────────────────
  const metaTitle = typeof body.meta_title === "string" ? body.meta_title.trim() : "";
  if (!metaTitle || metaTitle.length > RESTRICTED_PAGE_LIMITS.metaTitleMaxChars) {
    return fail(
      400,
      "VALIDATION_ERROR",
      `meta_title dolu olmalı ve en fazla ${RESTRICTED_PAGE_LIMITS.metaTitleMaxChars} karakter olabilir`,
    );
  }
  const metaDescription =
    typeof body.meta_description === "string" ? body.meta_description.trim() : "";
  if (!metaDescription || metaDescription.length > RESTRICTED_PAGE_LIMITS.metaDescriptionMaxChars) {
    return fail(
      400,
      "VALIDATION_ERROR",
      `meta_description dolu olmalı ve en fazla ${RESTRICTED_PAGE_LIMITS.metaDescriptionMaxChars} karakter olabilir`,
    );
  }

  // ── status: izin verilen değerler ──────────────────────────────────────────
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!PAGE_STATUSES.has(status)) {
    return fail(
      400,
      "VALIDATION_ERROR",
      'status "draft", "review", "published" veya "paused" olmalı',
    );
  }

  // ── lokal_sss: ≥3 dolu soru-cevap ──────────────────────────────────────────
  const faqResult = cleanRestrictedFaq(body.lokal_sss);
  if (typeof faqResult === "string") {
    return fail(400, "VALIDATION_ERROR", `İçerik yetersiz veya eksik formatta. ${faqResult}`);
  }

  // ── 1) Varlık kontrolü: slug mutlaka pages'te kayıtlı olmalı (INSERT yasak) ─
  let page: {
    id: string;
    service_slug: string;
    location_slug: string;
    location_type: string;
  };
  try {
    const context = await pool.query<{
      id: string;
      service_slug: string;
      location_slug: string;
      location_type: string;
    }>(
      `SELECT p.id::text AS id,
              s.slug AS service_slug,
              l.slug AS location_slug,
              l.location_type
         FROM pages p
         JOIN services s ON s.id = p.service_id
         JOIN locations l ON l.id = p.location_id
        WHERE p.slug = $1
          AND p.is_deleted = FALSE
        LIMIT 1`,
      [slug],
    );
    page = context.rows[0];
  } catch (err) {
    console.error("[RestrictedPageUpdate] varlık sorgusu başarısız:", err);
    return fail(500, "SERVER_ERROR", "Sayfa kaydı okunamadı. Lütfen daha sonra tekrar deneyin.");
  }

  if (!page) {
    return fail(
      404,
      "PAGE_NOT_FOUND",
      "Sadece mevcut sayfaların içerikleri güncellenebilir, yeni sayfa oluşturulamaz.",
    );
  }

  // ── 5) Yalnızca UPDATE (slug asla değiştirilmez) ───────────────────────────
  try {
    const contentHash = hashPageContent(content);
    const result = await pool.query(
      `UPDATE pages SET
         markdown_content = $2,
         lokal_aciklama = $3,
         meta_title = $4,
         meta_description = $5,
         lokal_sss = $6::jsonb,
         source_type = 'manual',
         status = $7,
         content_hash = $8,
         rendered_html = NULL,
         updated_at = NOW(),
         published_at = CASE WHEN $7 = 'published'
                               THEN COALESCE(published_at, NOW())
                             ELSE published_at END
       WHERE id = $1`,
      [
        page.id,
        sanitizeHTML(content),
        sanitizeHTML(summary),
        sanitizeHTML(metaTitle),
        sanitizeHTML(metaDescription),
        JSON.stringify(faqResult),
        status,
        contentHash,
      ],
    );
    if (!result.rowCount || result.rowCount === 0) {
      return fail(500, "SERVER_ERROR", "Sayfa güncellenemedi. Lütfen daha sonra tekrar deneyin.");
    }
  } catch (err) {
    console.error("[RestrictedPageUpdate] UPDATE başarısız:", err);
    return fail(500, "SERVER_ERROR", "Sayfa güncellenemedi. Lütfen daha sonra tekrar deneyin.");
  }

  // ── 6) Cache + ISR + sitemap tazele (admin createPage ile aynı tag'ler) ────
  revalidateTag(`local-page:${page.id}`);
  revalidateTag(
    `local-page:${page.service_slug}:${page.location_type}:${page.location_slug}`,
  );
  revalidateTag("local-pages");
  revalidateTag("sitemap");
  revalidatePath(servicePath(slug));
  revalidatePath("/sitemap.xml");
  await invalidatePageCaches({ slugs: [slug, servicePath(slug)], sitemap: true });

  // ── 7) Temiz yanıt: işlem özeti (id/hash/user yok) ─────────────────────────
  return NextResponse.json({
    success: true,
    target_table: "pages",
    updated: 1,
    slug,
    url: `${SITE_URL}${servicePath(slug)}`,
    status,
    message: "İçerik başarıyla güncellendi ve önbellek tazelendi.",
  });
}
