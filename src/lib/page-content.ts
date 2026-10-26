/**
 * Sayfa İçeriği — Veri Erişim Katmanı (NeonDB)
 *
 * Sayfa bazlı SSS içerikleri (anasayfa, iletişim, blog, ürünler, ürün detay)
 * `xip_dynamic_content` tablosunda `content_type = 'page_faq'` olarak tutulur.
 * Kod içinde statik SSS metni TUTULMAZ.
 */
import pool from "@/lib/db/pool";
import { unstable_cache } from "next/cache";
import { pageCacheKey, withPageCache } from "@/lib/redis/page-cache";
import type { HomeHeroCopy } from "@/types/common";

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

/** Bir sayfa kategorisinin SSS'lerini DB'den döndürür (1 saat cache). */
export function getPageFaqs(category: string): Promise<PageFaqItem[]> {
  return withPageCache(pageCacheKey("cat", `faq:${category}`), () =>
    unstable_cache(
      () => queryPageFaqs(category),
      ["page-faq", category],
      { revalidate: 3600, tags: ["page-content", `page-faq:${category}`] },
    )(),
  );
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

async function queryPageMeta(key: string): Promise<PageMeta | null> {
  try {
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
 * Bir sayfanın <head> meta içeriğini DB'den döndürür (1 saat cache).
 * Kayıt yoksa `null` döner; çağıran taraf kendi güvenli varsayılanını uygular.
 */
export function getPageMeta(key: string): Promise<PageMeta | null> {
  return withPageCache(pageCacheKey("cat", `meta:${key}`), () =>
    unstable_cache(
      () => queryPageMeta(key),
      ["page-meta", key],
      { revalidate: 3600, tags: ["page-content", `page-meta:${key}`] },
    )(),
  );
}

