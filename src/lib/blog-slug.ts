/**
 * blog-slug.ts — Blog slug normalizasyonu (client + server ortak).
 *
 * Bu modül **bilinçli olarak bağımlılıksızdır**: hem sunucu tarafı
 * (`blog-post-page.ts`) hem de `"use client"` bileşenleri (`BlogPostClient.tsx`)
 * aynı davranışı paylaşsın diye ayrı tutulur. Sunucu modülü (pool, unstable_cache)
 * buradan import edilmez; aksi halde client paketine sızar (D2).
 */

/**
 * URL/segment slug'ını normalize eder: baştaki `/` ve `blog/` ön ekini kaldırır,
 * URL-encode'u çözer. Boş sonuç `null` döner.
 */
export function normalizeBlogSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = decodeURIComponent(value.trim())
    .replace(/^\/+/, "")
    .replace(/^blog\//i, "");
  return normalized || null;
}
