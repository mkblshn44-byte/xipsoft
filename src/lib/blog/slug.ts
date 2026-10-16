/**
 * blog/slug.ts — Post slug üretimi, temizliği ve benzersizliği.
 *
 * Tüm post tabloları için ortak; `blog_posts` dışındaki tablolar beyaz liste
 * ile reddedilir (SQL injection koruması).
 */

import pool from "@/lib/database";
import { slugify } from "@/utils/slugify";

/** Slug üretimi — slugify() üzerinden tek kaynak; max 80 karakter. */
function baseSlug(value: string): string {
  return slugify(value).slice(0, 80);
}

export function generateSlug(base: string): string {
  return baseSlug(base) || "post";
}

/**
 * Otomatik üretilmiş slug eklerini (zaman damgası / rastgele sonek) kırpar.
 *
 * Dış otomasyonlar benzersizlik için başlığa `-<timestamp>-<rastgele>` veya
 * base36 zaman damgası (`-mp4s5hwi`) ekleyebiliyor. Sunucu benzersizliği zaten
 * `ensureUniqueSlug` ile garanti ettiği için bu gürültü temizlenir.
 *
 * Örn:
 *   "...-nasil-calisir-1778080797715-7782" → "...-nasil-calisir"
 *   "...-modern-tasarim-mp4s5hwi"          → "...-modern-tasarim"
 */
const BASE36_TIMESTAMP_TOLERANCE_MS = 3 * 365 * 24 * 60 * 60 * 1000; // ±3 yıl

export function stripAutoSlugSuffix(slug: string): string {
  let s = slug;

  // 1) Milisaniye zaman damgası + rastgele sonek: -1778080797715-7782
  let previous = "";
  while (s !== previous) {
    previous = s;
    s = s.replace(/-\d{10,}(?:-\d{1,6})?$/, "");
  }

  // 2) base36 zaman damgası (7-9 karakter). Yanlış pozitifleri önlemek için
  //    token en az bir rakam içermeli ve bugüne makul uzaklıkta bir tarihe
  //    çözülmelidir: -mp4s5hwi
  const match = s.match(/-([0-9a-z]{7,9})$/);
  if (match && match[1]) {
    const token = match[1];
    if (/\d/.test(token)) {
      const asTimestamp = Number.parseInt(token, 36);
      if (
        Number.isFinite(asTimestamp) &&
        Math.abs(asTimestamp - Date.now()) <= BASE36_TIMESTAMP_TOLERANCE_MS
      ) {
        s = s.slice(0, s.length - token.length - 1);
      }
    }
  }

  return s.replace(/-+$/g, "");
}

/**
 * Dış kaynaklı (API / admin) slug girdisini standartlara uygun hale getirir:
 *   - yalnızca a-z, 0-9, '-' (slugify)
 *   - otomatik üretilmiş zaman damgası/rastgele sonekler kırpılır
 *   - max 80 karakter, baş/son '-' temizlenir
 *   - boş kalırsa fallbackBase'den üretir, o da boşsa 'post'
 *
 * Böylece dışarıdan slug eklenebilir ama sonuç her zaman "sağlıklı" olur.
 */
export function sanitizeSlugInput(raw: string, fallbackBase = ""): string {
  const cleaned = stripAutoSlugSuffix(baseSlug(raw)).replace(/-+$/g, "");
  if (cleaned) return cleaned;
  const fallback = baseSlug(fallbackBase).replace(/-+$/g, "");
  return fallback || "post";
}

/**
 * Benzersiz bir slug döndürür.
 * baseSlug zaten kullanılmıyorsa olduğu gibi döner.
 * Kullanılıyorsa son kullanılan numarayı bulup bir artırır.
 * excludeId verilirse o kaydı çakışma sayımına dahil etmez (güncelleme senaryosu).
 *
 * `table` yalnızca beyaz listedeki tablolar olabilir (SQL injection koruması).
 * `db` verilmezse paylaşılan `pool` kullanılır; transaction içinde çağrılacaksa
 * ilgili `PoolClient` geçirilebilir.
 */
export const SLUG_TABLES = ['blog_posts'] as const;
export type SlugTable = (typeof SLUG_TABLES)[number];

type SlugQueryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
};

export async function ensureUniqueSlug(
  baseSlug: string,
  excludeId?: number,
  table: SlugTable = 'blog_posts',
  db: SlugQueryable = pool,
): Promise<string> {
  if (!SLUG_TABLES.includes(table)) {
    throw new Error(`ensureUniqueSlug: desteklenmeyen tablo "${table}"`);
  }

  const base = baseSlug || 'post';
  const q = excludeId != null
    ? `SELECT slug FROM ${table} WHERE (slug = $1 OR slug LIKE $1 || '-%') AND deleted_at IS NULL AND id != $2 ORDER BY created_at DESC LIMIT 1`
    : `SELECT slug FROM ${table} WHERE (slug = $1 OR slug LIKE $1 || '-%') AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`;
  const params: unknown[] = excludeId != null ? [base, excludeId] : [base];
  const { rows } = await db.query(q, params);
  if (rows.length === 0) return base;
  const last = (rows[0] as { slug: string }).slug;
  const match = last.match(/-([0-9]+)$/);
  const num = match && match[1] ? parseInt(match[1], 10) + 1 : 2;
  return base + '-' + String(num);
}
