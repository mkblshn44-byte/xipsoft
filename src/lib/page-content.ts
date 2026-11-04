/**
 * Sayfa İçeriği — Veri Erişim Katmanı (NeonDB)
 *
 * Sayfa bazlı SSS içerikleri (anasayfa, iletişim, blog, ürünler, ürün detay)
 * `xip_dynamic_content` tablosunda `content_type = 'page_faq'` olarak tutulur.
 * Kod içinde statik SSS metni TUTULMAZ.
 */
import pool from "@/lib/db/pool";
import { unstable_cache } from "next/cache";
import type { HomeHeroCopy } from "@/types/common";
import { getRedisClient } from "@/lib/redis/client";

/** Redis L1 önbellek için TTL (saniye) — unstable_cache ile aynı pencerede. */
const PAGE_CONTENT_REDIS_TTL = 3600;

export interface PageFaqItem {
  question: string;
  answer: string;
}

async function queryDynamicFaq(
  type: string,
  category?: string,
): Promise<PageFaqItem[]> {
  try {
    const { rows } = await pool.query<{ question: string; answer: string | null }>(
      `SELECT title AS question, metadata->>'answer' AS answer
         FROM xip_dynamic_content
        WHERE content_type = $1
          AND ($2::text IS NULL OR category = $2)
          AND is_active = TRUE
          AND deleted_at IS NULL
        ORDER BY order_index ASC, id ASC`,
      [type, category ?? null],
    );

    return rows
      .map((row) => ({
        question: (row.question ?? "").trim(),
        answer: (row.answer ?? "").trim(),
      }))
      .filter((item) => item.question !== "" && item.answer !== "");
  } catch (error) {
    console.warn(
      "[PageContent] Dynamic FAQ lookup unavailable:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

async function queryPageFaqs(category: string): Promise<PageFaqItem[]> {
  return queryDynamicFaq("page_faq", category);
}

/**
 * `xip_dynamic_content` tablosundan SSS kayıtlarını çözer (ortak sorgu).
 * `type` = `content_type`; `category` verilmezse kategori filtresi uygulanmaz.
 */
export async function queryDynamicContentFaq(
  type: string,
  category?: string,
): Promise<PageFaqItem[]> {
  return queryDynamicFaq(type, category);
}

/** Bir sayfa kategorisinin SSS'lerini DB'den döndürür (Redis L1 → unstable_cache L2, 1 saat). */
export async function getPageFaqs(category: string): Promise<PageFaqItem[]> {
  const fullPath = PAGE_META_PATHS[category];
  if (fullPath !== undefined) {
    try {
      const { rows } = await pool.query<{ content_i18n: Record<string, unknown> | null }>(
        `SELECT content_i18n
           FROM pages
          WHERE full_path = $1
            AND kind IN ('page', 'category')
            AND status = 'published'
            AND is_deleted = FALSE
          LIMIT 1`,
        [fullPath],
      );
      const trContent = rows[0]?.content_i18n?.tr;
      if (trContent && typeof trContent === "object" && !Array.isArray(trContent)) {
        const faqs = (trContent as Record<string, unknown>).faqs;
        if (Array.isArray(faqs)) {
          return faqs.filter(
            (item): item is PageFaqItem =>
              !!item &&
              typeof item === "object" &&
              typeof (item as PageFaqItem).question === "string" &&
              typeof (item as PageFaqItem).answer === "string",
          );
        }
      }
      return [];
    } catch (error) {
      console.warn(
        "[PageContent] Published page FAQ lookup unavailable:",
        error instanceof Error ? error.message : error,
      );
      return [];
    }
  }

  const redis = getRedisClient();
  const cacheKey = `page:faq:v3:${category}`;

  // L1: Redis
  if (redis) {
    try {
      const cached = await redis.get<PageFaqItem[]>(cacheKey);
      if (cached) return cached;
    } catch { /* Redis'e ulaşılamazsa devam */ }
  }

  // L2: Next.js unstable_cache → DB
  const result = await unstable_cache(
    () => queryPageFaqs(category),
    ["page-faq-v3", category],
    { revalidate: PAGE_CONTENT_REDIS_TTL, tags: ["page-content", `page-faq:${category}`] },
  )();

  // L1'e yaz
  if (redis && result.length > 0) {
    try {
      await redis.set(cacheKey, result, { ex: PAGE_CONTENT_REDIS_TTL });
    } catch { /* yazma hatası akışı bozmaz */ }
  }

  return result;
}

/** `{urun}` placeholder'ını gerçek ürün adıyla değiştirir. */
export function withProductName(items: PageFaqItem[], productName: string): PageFaqItem[] {
  return items.map((item) => ({
    question: item.question.replace(/\{urun\}/g, productName),
    answer: item.answer.replace(/\{urun\}/g, productName),
  }));
}

export interface PageMeta {
  title: string;
  description: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  /** Sayfaya özgü JSON-LD metin alanları (name/description vb.). */
  jsonLd?: Record<string, string>;
  hero?: Partial<HomeHeroCopy>;
  /** Sayfa gövdesindeki bölüm metinleri (opsiyonel; kod içi varsayılanı ezer). */
  sections?: Record<string, unknown>;
}

const PAGE_META_PATHS: Readonly<Record<string, string>> = {
  home: "anasayfa",
  hizmetler: "hizmetler",
  hakkimizda: "hakkimizda",
  contact: "contact-us",
  references: "references",
  "privacy-policy": "privacy-policy",
  "terms-of-service": "terms-of-service",
  "cookie-policy": "cookie-policy",
  "istanbul-yazilim-sirketi": "istanbul-yazilim-sirketi",
};

async function queryPageMetaFromPages(key: string): Promise<PageMeta | null> {
  const fullPath = PAGE_META_PATHS[key];
  if (fullPath === undefined) return null;

  const { rows } = await pool.query<{
    title: string;
    meta_title: string | null;
    meta_description: string | null;
    keywords: string[] | null;
    og_title: string | null;
    og_description: string | null;
    schema_markup: unknown;
    content_i18n: Record<string, unknown> | null;
  }>(
    `SELECT title, meta_title, meta_description, keywords, og_title, og_description,
            schema_markup, content_i18n
       FROM pages
      WHERE full_path = $1
        AND kind IN ('page', 'category')
        AND status = 'published'
        AND is_deleted = FALSE
      LIMIT 1`,
    [fullPath],
  );
  const row = rows[0];
  if (!row) return null;

  const content = row.content_i18n?.tr;
  const localized = content && typeof content === "object" && !Array.isArray(content)
    ? content as Record<string, unknown>
    : {};
  const schemas = Array.isArray(row.schema_markup)
    ? row.schema_markup
    : typeof row.schema_markup === "string"
      ? JSON.parse(row.schema_markup) as unknown
      : [];
  const firstSchema = Array.isArray(schemas) && schemas[0] &&
    typeof schemas[0] === "object" && !Array.isArray(schemas[0])
    ? schemas[0] as Record<string, string>
    : undefined;

  return {
    title: row.meta_title?.trim() || row.title,
    description: row.meta_description ?? "",
    keywords: row.keywords ?? [],
    ogTitle: row.og_title ?? undefined,
    ogDescription: row.og_description ?? undefined,
    jsonLd: firstSchema ?? (localized.jsonLd as Record<string, string> | undefined),
    hero: localized.hero && typeof localized.hero === "object"
      ? localized.hero as Partial<HomeHeroCopy>
      : undefined,
    sections: localized.sections && typeof localized.sections === "object"
      ? localized.sections as Record<string, unknown>
      : undefined,
  };
}

async function queryPageMeta(key: string): Promise<PageMeta | null> {
  try {
    if (PAGE_META_PATHS[key] !== undefined) {
      return await queryPageMetaFromPages(key);
    }

    const { rows } = await pool.query<{ title: string | null; metadata: Record<string, unknown> | null }>(
      `SELECT title, metadata
         FROM xip_dynamic_content
        WHERE content_type = 'page_meta'
          AND category = $1
          AND is_active = TRUE
          AND deleted_at IS NULL
        LIMIT 1`,
      [key],
    );

    const row = rows[0];
    if (!row) return null;

    const meta = row.metadata ?? {};
    const keywords = Array.isArray(meta.keywords)
      ? (meta.keywords as unknown[]).map((k) => String(k)).filter((k) => k !== "")
      : [];

    return {
      title: (row.title ?? "").trim(),
      description: typeof meta.description === "string" ? meta.description : "",
      keywords,
      ogTitle: typeof meta.ogTitle === "string" ? meta.ogTitle : undefined,
      ogDescription: typeof meta.ogDescription === "string" ? meta.ogDescription : undefined,
      jsonLd:
        meta.jsonLd && typeof meta.jsonLd === "object"
          ? (meta.jsonLd as Record<string, string>)
          : undefined,
      hero:
        meta.hero && typeof meta.hero === "object"
          ? (meta.hero as Partial<HomeHeroCopy>)
          : undefined,
      sections:
        meta.sections && typeof meta.sections === "object"
          ? (meta.sections as Record<string, unknown>)
          : undefined,
    };
  } catch (error) {
    console.warn(
      "[PageContent] Page meta lookup unavailable:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Bir sayfanın <head> meta içeriğini DB'den döndürür (Redis L1 → unstable_cache L2, 1 saat).
 * Kayıt yoksa `null` döner; çağıran taraf kendi güvenli varsayılanını uygular.
 */
export async function getPageMeta(key: string): Promise<PageMeta | null> {
  const redis = getRedisClient();
  const cacheKey = `page:meta:v3:${key}`;

  // L1: Redis
  if (redis) {
    try {
      const cached = await redis.get<PageMeta | null>(cacheKey);
      if (cached !== undefined && cached !== null) return cached;
      // "0" → negatif önbellek (kayıt yok, DB'ye gitme)
      const raw = await redis.get<string>(cacheKey);
      if (raw === "null") return null;
    } catch { /* devam */ }
  }

  // L2: unstable_cache → DB
  const result = await unstable_cache(
    () => queryPageMeta(key),
    ["page-meta-v3", key],
    { revalidate: PAGE_CONTENT_REDIS_TTL, tags: ["page-content", `page-meta:${key}`] },
  )();

  // L1'e yaz (null da önbelleklenir — negatif cache)
  if (redis) {
    try {
      await redis.set(cacheKey, result ?? "null", { ex: PAGE_CONTENT_REDIS_TTL });
    } catch { /* yazma hatası akışı bozmaz */ }
  }

  return result;
}
