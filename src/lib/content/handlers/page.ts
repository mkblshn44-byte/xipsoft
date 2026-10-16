/**
 * Page ingest handler'ı — `{ type: "Page" }` isteklerini `pages` tablosuna yazar.
 *
 * `/hizmetler/[slug]/[sehir]` şablonunu besleyen yayınlanmış (veya taslak)
 * içeriği `pages` tablosuna yazar. Kod/rota değişikliği olmadan yeni şehir×hizmet
 * sayfası üretilir; slug çakışması DB'nin partial unique index'leri ile
 * engellenir. Yazma sonrası ilgili ISR tag'leri ve sitemap tazelenir.
 */

import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import pool from "@/lib/database";
import {
  hashPageContent,
  CENTRAL_LOCATION_COLUMNS,
  type CentralLocation,
  type LocalFaqItem,
} from "@/lib/pages";
import { SITE_URL } from "@/lib/site-url";
import { slugify } from "@/utils/slugify";
import { PAGE_STATUSES, PAGE_SOURCE_TYPES, UUID_RE } from "../constants";

async function resolveServiceRef(
  service: unknown,
): Promise<{ id: string; slug: string } | null> {
  if (service == null) return null;
  if (typeof service === "number" && Number.isInteger(service)) {
    const r = await pool.query<{ id: string; slug: string }>(
      `SELECT id::text, slug FROM services WHERE id = $1::int AND is_active = TRUE LIMIT 1`,
      [service],
    );
    return r.rows[0] ?? null;
  }
  if (typeof service === "string" && service.trim()) {
    const v = service.trim();
    if (/^\d+$/.test(v)) {
      const r = await pool.query<{ id: string; slug: string }>(
        `SELECT id::text, slug FROM services WHERE id = $1::int AND is_active = TRUE LIMIT 1`,
        [Number(v)],
      );
      if (r.rows[0]) return r.rows[0];
    }
    const r = await pool.query<{ id: string; slug: string }>(
      `SELECT id::text, slug FROM services WHERE slug = $1 AND is_active = TRUE LIMIT 1`,
      [v],
    );
    return r.rows[0] ?? null;
  }
  return null;
}

async function resolveLocationId(
  location: unknown,
  province: unknown,
): Promise<{ id: string } | { error: "ambiguous" | "not_found" }> {
  const locStr =
    typeof location === "number"
      ? String(location)
      : typeof location === "string"
        ? location.trim()
        : "";
  if (!locStr) return { error: "not_found" };

  if (UUID_RE.test(locStr)) {
    const r = await pool.query<{ id: string }>(
      `SELECT id::text FROM locations WHERE id = $1::uuid AND is_active = TRUE LIMIT 1`,
      [locStr],
    );
    return r.rows[0] ? { id: r.rows[0].id } : { error: "not_found" };
  }

  const normLoc = slugify(locStr);
  if (!normLoc) return { error: "not_found" };

  const params: unknown[] = [normLoc];
  let provinceFilter = "";
  if (province != null && typeof province === "string" && province.trim()) {
    params.push(slugify(province.trim()));
    provinceFilter = ` AND parent.slug = $2`;
  }

  const r = await pool.query<{ id: string }>(
    `SELECT l.id::text
       FROM locations l
       LEFT JOIN locations parent ON parent.id = l.parent_id AND parent.is_active = TRUE
      WHERE l.slug = $1 AND l.is_active = TRUE${provinceFilter}
      ORDER BY l.id
      LIMIT 2`,
    params,
  );
  if (r.rows.length === 0) return { error: "not_found" };
  if (r.rows.length > 1) return { error: "ambiguous" };
  return { id: r.rows[0]!.id };
}

/** Opsiyonel tam slug override'ını hizmet ön ekiyle doğrular. */
function normalizeCompositeSlug(raw: unknown, serviceSlug: string): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const parts = raw
    .split("/")
    .map((part) => slugify(part))
    .filter(Boolean);
  if (parts.length !== 2) return null;
  const joined = parts.join("/");
  if (!joined.startsWith(`${serviceSlug}/`)) return null;
  return joined;
}

function parseLocalSss(
  raw: unknown,
): { ok: true; value: LocalFaqItem[] | null } | { ok: false; msg: string } {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (!Array.isArray(raw)) return { ok: false, msg: "lokalSss bir dizi olmalıdır" };
  const value: LocalFaqItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return { ok: false, msg: "Her SSS { question, answer } olmalıdır" };
    }
    const q = (item as Record<string, unknown>).question;
    const a = (item as Record<string, unknown>).answer;
    if (typeof q !== "string" || !q.trim() || typeof a !== "string" || !a.trim()) {
      return { ok: false, msg: "Her SSS question ve answer alanlarını içermelidir" };
    }
    value.push({ question: q.trim(), answer: a.trim() });
  }
  return { ok: true, value };
}

interface PageIngestCoreResult {
  status: number;
  payload: Record<string, unknown>;
}

/**
 * Page ingest çekirdeği — HTTP katmanından bağımsızdır. `handlePageIngest` tek
 * istek için bunu `NextResponse`'a sarar; `handlePageBatchIngest` ise yeniden
 * serileştirme (NextResponse.json round-trip) yapmadan doğrudan çağırır.
 *
 * `options.revalidate` (varsayılan true): `false` verilirse Next.js request
 * bağlamı dışında çalışan script'ler (ör. seed/zenginleştirme) için
 * `revalidateTag/revalidatePath` atlanır; cache tazeleme çağıran tarafa
 * bırakılır (bkz. POST /api/revalidate/locations).
 */
export async function pageIngestCore(
  body: Record<string, unknown>,
  options: { revalidate?: boolean } = {},
): Promise<PageIngestCoreResult> {
  const shouldRevalidate = options.revalidate !== false;
  const res = (status: number, payload: Record<string, unknown>): PageIngestCoreResult => ({
    status,
    payload,
  });

  const {
    service,
    location,
    province,
    title,
    content,
    metaTitle,
    metaDescription,
    lokalAciklama,
    ozelMetaDesc,
    lokalSss,
    slug: customSlug,
    status: statusRaw,
    sourceType: sourceTypeRaw,
    publish,
  } = body;

  if (!content || typeof content !== "string" || !content.trim()) {
    return res(422, {
      success: false,
      error: "VALIDATION_ERROR",
      message: "content: Markdown içeriği zorunludur",
    });
  }
  if (content.trim().length > 200_000) {
    return res(422, {
      success: false,
      error: "VALIDATION_ERROR",
      message: "content: max 200000 karakter",
    });
  }

  const svc = await resolveServiceRef(service);
  if (!svc) {
    return res(422, {
      success: false,
      error: "VALIDATION_ERROR",
      message: "service: geçerli ve aktif bir hizmet slug'ı veya id'si gerekli",
    });
  }

  const loc = await resolveLocationId(location, province);
  if ("error" in loc) {
    if (loc.error === "ambiguous") {
      return res(409, {
        success: false,
        error: "AMBIGUOUS_LOCATION",
        message: "location birden fazla il ile eşleşiyor; province (üst il slug'ı) belirtin",
      });
    }
    return res(422, {
      success: false,
      error: "VALIDATION_ERROR",
      message: "location: geçerli ve aktif bir konum (il/ilçe) slug'ı veya id'si gerekli",
    });
  }

  const sssResult = parseLocalSss(lokalSss);
  if (!sssResult.ok) {
    return res(422, { success: false, error: "VALIDATION_ERROR", message: sssResult.msg });
  }

  const sourceType =
    typeof sourceTypeRaw === "string" && PAGE_SOURCE_TYPES.has(sourceTypeRaw)
      ? sourceTypeRaw
      : "manual";

  const status =
    typeof statusRaw === "string" && PAGE_STATUSES.has(statusRaw)
      ? statusRaw
      : publish === true
        ? "published"
        : "review";

  // Konum + hizmet bağlamını tek sorguda çöz (admin createPage ile aynı desen).
  const context = await pool.query<CentralLocation>(
    `SELECT
            ${CENTRAL_LOCATION_COLUMNS}
       FROM services s
       JOIN locations l ON l.id = $2::uuid AND l.is_active = TRUE
       LEFT JOIN locations parent ON parent.id = l.parent_id
      WHERE s.id = $1::int AND s.is_active = TRUE LIMIT 1`,
    [svc.id, loc.id],
  );
  const centralLocation = context.rows[0];
  if (!centralLocation) {
    return res(422, {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Aktif hizmet veya konum bulunamadı",
    });
  }

  const locationSlug = centralLocation.locationSlug ?? centralLocation.locationName.toLowerCase().replace(/\s+/g, "-");
  const serviceSlug = centralLocation.serviceSlug ?? svc.slug;
  const defaults = {
    slug: `${serviceSlug}/${locationSlug}`,
    title: `${centralLocation.serviceTitle} ${centralLocation.locationName}`,
    metaTitle: `${centralLocation.serviceTitle} ${centralLocation.locationName} | XipSoft`,
    metaDescription: `${centralLocation.locationName} için ${centralLocation.serviceTitle}.`,
    canonicalUrl: `${SITE_URL}/hizmetler/${serviceSlug}/${locationSlug}`,
  };

  let finalSlug = defaults.slug;
  if (customSlug != null && String(customSlug).trim()) {
    const normalized = normalizeCompositeSlug(customSlug, svc.slug);
    if (!normalized) {
      return res(422, {
        success: false,
        error: "VALIDATION_ERROR",
        message: `slug: "${svc.slug}/<konum>" biçiminde (tek konum segmenti) olmalıdır`,
      });
    }
    finalSlug = normalized;
  }

  const safeTitle = (typeof title === "string" && title.trim()) || defaults.title;
  const safeMetaTitle = (typeof metaTitle === "string" && metaTitle.trim()) || defaults.metaTitle;
  const safeMetaDescription =
    (typeof metaDescription === "string" && metaDescription.trim()) || defaults.metaDescription;
  const safeLokalAciklama =
    typeof lokalAciklama === "string" && lokalAciklama.trim() ? lokalAciklama.trim() : null;
  const safeOzelMetaDesc =
    typeof ozelMetaDesc === "string" && ozelMetaDesc.trim() ? ozelMetaDesc.trim() : null;
  const markdownContent = content.trim();
  const canonicalUrl = `${SITE_URL}/hizmetler/${finalSlug}`;

  try {
    const result = await pool.query<{
      id: string;
      slug: string;
      status: string;
      is_insert: boolean;
    }>(
      `INSERT INTO pages
         (service_id, location_id, slug, title, markdown_content, meta_title, meta_description,
          canonical_url, status, content_hash, source_type, page_type,
          lokal_aciklama, ozel_meta_desc, lokal_sss, published_at, updated_at)
       VALUES ($1::int, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'location',
               $12, $13, $14::jsonb,
               CASE WHEN $9 = 'published' THEN NOW() ELSE NULL END, NOW())
       ON CONFLICT (service_id, location_id) WHERE is_deleted = FALSE
       DO UPDATE SET
         slug = EXCLUDED.slug,
         title = EXCLUDED.title,
         markdown_content = EXCLUDED.markdown_content,
         meta_title = EXCLUDED.meta_title,
         meta_description = EXCLUDED.meta_description,
         canonical_url = EXCLUDED.canonical_url,
         status = EXCLUDED.status,
         content_hash = EXCLUDED.content_hash,
         source_type = EXCLUDED.source_type,
         lokal_aciklama = EXCLUDED.lokal_aciklama,
         ozel_meta_desc = EXCLUDED.ozel_meta_desc,
         lokal_sss = EXCLUDED.lokal_sss,
         updated_at = NOW(),
         published_at = COALESCE(pages.published_at, EXCLUDED.published_at)
       RETURNING id::text, slug, status, (xmax = 0) AS is_insert`,
      [
        svc.id,
        loc.id,
        finalSlug,
        safeTitle,
        markdownContent,
        safeMetaTitle,
        safeMetaDescription,
        canonicalUrl,
        status,
        hashPageContent(markdownContent),
        sourceType,
        safeLokalAciklama,
        safeOzelMetaDesc,
        sssResult.value ? JSON.stringify(sssResult.value) : null,
      ],
    );

    const page = result.rows[0];
    if (!page) {
      return res(500, { success: false, error: "SERVER_ERROR", message: "Sayfa kaydedilemedi" });
    }

    // ── Cache + ISR + sitemap tazele (admin createPage ile aynı tag'ler) ──────
    if (shouldRevalidate) {
      revalidateTag(`local-page:${page.id}`);
      revalidateTag(
        `local-page:${centralLocation.serviceSlug}:${centralLocation.locationType}:${centralLocation.locationSlug}`,
      );
      revalidateTag("local-pages");
      revalidateTag("sitemap");
      revalidatePath(`/hizmetler/${finalSlug}`);
      revalidatePath("/sitemap.xml");
    }

    return res(page.is_insert ? 201 : 200, {
      success: true,
      page_id: page.id,
      slug: page.slug,
      url: `${SITE_URL}/hizmetler/${page.slug}`,
      status: page.status,
      created: page.is_insert,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    // Partial unique index ihlali → slug başka bir aktif sayfada kullanılıyor.
    if (/idx_pages_slug_active|duplicate key/i.test(message)) {
      return res(409, {
        success: false,
        error: "SLUG_CONFLICT",
        message: "Bu slug başka bir aktif sayfada kullanılıyor",
        slug: finalSlug,
      });
    }
    throw err;
  }
}

/**
 * Tek sayfa ingest — HTTP sarmalayıcı. İş mantığı `pageIngestCore` içindedir;
 * batch ingest aynı çekirdeği yeniden serileştirme yapmadan çağırır.
 */
export async function handlePageIngest(body: Record<string, unknown>): Promise<NextResponse> {
  const { status, payload } = await pageIngestCore(body);
  return NextResponse.json(payload, { status });
}
