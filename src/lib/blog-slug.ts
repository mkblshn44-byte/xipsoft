/**
 * blog-slug.ts — Blog slug normalizasyonu (client + server ortak).
 *
 * Bu modül **bilinçli olarak bağımlılıksızdır**: hem sunucu tarafı
 * (`src/lib/blog/*`) hem de `"use client"` bileşenleri aynı davranışı
 * paylaşsın diye ayrı tutulur. Sunucu modülü (pool, unstable_cache)
 * buradan import edilmez; aksi halde client paketine sızar (D2).
 */

/**
 * URL/segment slug'ını normalize eder: baştaki `/` ve `blog/` ön ekini kaldırır,
 * URL-encode'u çözer, rastgele sayı dizilerini temizler. Boş sonuç `null` döner.
 *
 * Temizlenen patternler:
 * - ,-YYYY-MM-DD$ (örn: ",2024-01-15")
 * - -\d{10,}-\d{3,4}$ (örn: "-1788902519527-6440" gibi rastgele ID dizileri)
 * - -\d+$ (örn: "-12345" gibi tek sayı dizileri)
 */
export function normalizeBlogSlug(value: string | null | undefined): string | null {
  if (!value) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value.trim());
  } catch {
    decoded = value.trim();
  }

  const withoutPrefix = decoded.replace(/^\/+/, "").replace(/^blog\//i, "");
  const hasDateSuffix = /,\d{4}-\d{2}-\d{2}$/.test(withoutPrefix);

  const withoutDateSuffix = withoutPrefix.replace(/,\d{4}-\d{2}-\d{2}$/, "");

  const cleaned = hasDateSuffix
    ? withoutDateSuffix.replace(/-\d{10,}-\d{3,4}$/, "")
    : withoutDateSuffix
        .replace(/-\d{10,}-\d{3,4}$/, "")
        .replace(/-\d+$/, "");

  return cleaned || null;
}
