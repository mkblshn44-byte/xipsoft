/**
 * Blog ingest handler'ı — `{ type: "Blog" }` isteklerini `blog_posts` tablosuna yazar.
 */

import { NextResponse } from "next/server";
import pool from "@/lib/db/pool";
import { generateSlug, ensureUniqueSlug, sanitizeSlugInput } from "@/lib/blog/slug";
import { shareBlogToTelegram } from "@/lib/telegram";
import { sanitizeHTML, sanitizeUserInput } from "@/lib/security";
import { SITE_URL } from "@/lib/site-url";
import { invalidateBlogCaches } from "@/lib/blog-cache";
import { buildLexicalState } from "../lexical";
import { validateTags } from "../validation";
import { fail } from "../response";
import { resolveBotAuthorId } from "../auth";

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^0\./,
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /\.corp$/i,
];

function isSafeExternalUrl(rawUrl: string): boolean {
  if (!rawUrl || rawUrl.length > 2048) return false;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    if (url.port && url.port !== "443") return false;
    const host = url.hostname.toLowerCase();
    return !PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(host));
  } catch {
    return false;
  }
}

export async function handleBlogIngest(body: Record<string, unknown>): Promise<NextResponse> {
  const {
    title,
    description,
    content,
    tags: rawTags,
    cover_image_url,
    publish: publishRaw = false,
    slug: customSlug,
    published_at: customPublishedAt,
  } = body;

  // Title: 5-500 karakter
  if (
    !title ||
    typeof title !== "string" ||
    title.trim().length < 5 ||
    title.trim().length > 500
  ) {
    return fail(422, "VALIDATION_ERROR", "title: 5-500 karakter olmalıdır");
  }

  // Content: min 200 kelime, max 100000 karakter
  if (
    !content ||
    typeof content !== "string" ||
    content.trim().split(/\s+/).filter(Boolean).length < 200 ||
    content.trim().length > 100_000
  ) {
    return fail(422, "VALIDATION_ERROR", "content: min 200 kelime, max 100000 karakter olmalıdır");
  }

  // Description: max 500 karakter
  if (
    description != null &&
    (typeof description !== "string" || description.trim().length > 500)
  ) {
    return fail(422, "VALIDATION_ERROR", "description: max 500 karakter");
  }

  // SSRF Koruması — cover_image_url
  if (cover_image_url != null) {
    if (!isSafeExternalUrl(String(cover_image_url))) {
      return fail(
        422,
        "VALIDATION_ERROR",
        "cover_image_url geçerli HTTPS URL olmalı, iç ağ adresleri yasak (max 2048 karakter)",
      );
    }
  }

  const tagsResult = validateTags(rawTags);
  if (!tagsResult.ok) {
    return fail(422, "VALIDATION_ERROR", tagsResult.msg);
  }

  const publish = publishRaw === true;

  let publishedAt: Date | null = null;
  if (publish) {
    if (customPublishedAt) {
      const parsed = new Date(String(customPublishedAt));
      if (isNaN(parsed.getTime())) {
        return fail(422, "VALIDATION_ERROR", "published_at geçerli bir ISO 8601 tarih olmalıdır");
      }
      publishedAt = parsed;
    } else {
      publishedAt = new Date();
    }
  }

  // XSS koruması
  const safeTitle = sanitizeUserInput(title.trim());
  const safeDescription = description ? sanitizeUserInput((description as string).trim()) : null;
  const safeContent = sanitizeHTML((content as string).trim());

  // ── Tekrar eden konu kontrolü ───────────────────────────────────────────────
  // Aynı başlık (büyük/küçük harf ve fazla boşluk farkı gözetmeksizin) zaten
  // kayıtlıysa yeni içerik oluşturulmaz; API 409 ile reddeder. Böylece aynı
  // konu ikinci kez gönderilemez (mükerrer içerik engellenir).
  const duplicate = await pool.query<{ id: number; slug: string; status: string }>(
    `SELECT id, slug, status FROM blog_posts
     WHERE deleted_at IS NULL
       AND LOWER(REGEXP_REPLACE(BTRIM(title), '\\s+', ' ', 'g'))
         = LOWER(REGEXP_REPLACE(BTRIM($1), '\\s+', ' ', 'g'))
     ORDER BY created_at DESC
     LIMIT 1`,
    [safeTitle],
  );

  if (duplicate.rows.length > 0) {
    const dup = duplicate.rows[0]!;
    return NextResponse.json(
      {
        success: false,
        error: "DUPLICATE_TOPIC",
        message: "Bu konu zaten mevcut. Aynı başlıkla ikinci kez içerik eklenemez.",
        existing_post_id: String(dup.id),
        existing_slug: dup.slug,
        url: `${SITE_URL}/blog/${dup.slug}`,
      },
      { status: 409 },
    );
  }

  // ── Lexical formatına dönüştür ──────────────────────────────────────────────
  const lexicalState = buildLexicalState(safeContent);

  // ── Slug — dış girdi standartlara göre temizlenir + benzersizlik ───────────
  const baseSlug =
    customSlug && typeof customSlug === "string"
      ? sanitizeSlugInput(customSlug, safeTitle)
      : generateSlug(safeTitle);
  const finalSlug = await ensureUniqueSlug(baseSlug, undefined, "blog_posts");

  const authorId = await resolveBotAuthorId();
  if (!authorId) {
    return fail(500, "SERVER_ERROR", "Bot yazarı bulunamadı");
  }

  // ── DB INSERT ───────────────────────────────────────────────────────────────
  const { rows } = await pool.query<{ id: number; slug: string }>(
    `INSERT INTO blog_posts
       (title, description, content, author_id, status, tags, cover_image_url, slug, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, slug`,
    [
      safeTitle,
      safeDescription,
      JSON.stringify(lexicalState), // ← Lexical uyumlu format
      authorId,
      publish ? "published" : "draft",
      tagsResult.tags,
      cover_image_url ?? null,
      finalSlug,
      publishedAt,
    ],
  );

  const { id, slug } = rows[0]!;

  // ── Yayınlandıysa cache + ISR temizle ──────────────────────────────────────
  if (publish) {
    await invalidateBlogCaches(slug);

    // Telegram paylaşımı (fire-and-forget)
    shareBlogToTelegram({
      title: safeTitle,
      description: safeDescription,
      slug,
      authorName: "XipBot",
      tags: tagsResult.tags,
    }).catch((err) => console.error("[ContentAPI] Telegram paylaşım hatası:", err));
  }

  return NextResponse.json(
    {
      success: true,
      post_id: String(id),
      slug,
      url: `${SITE_URL}/blog/${slug}`,
      status: publish ? "published" : "draft",
    },
    { status: 201 },
  );
}
