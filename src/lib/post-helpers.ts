/**
 * post-helpers.ts — GERİYE DÖNÜK UYUMLULUK (barrel)
 *
 * Post yardımcıları sorumluluk bazında `src/lib/blog/*` altına bölünmüştür.
 * Dışarıya aynı genel yüzey (`@/lib/post-helpers`) sunulur.
 *
 *   blog/slug.ts       → generateSlug, sanitizeSlugInput, stripAutoSlugSuffix,
 *                        ensureUniqueSlug, SLUG_TABLES, SlugTable
 *   blog/pagination.ts → buildPaginatedResult
 *   blog/mutations.ts  → softDelete, setPublishStatus
 */

export * from "./blog/slug";
export * from "./blog/pagination";
export * from "./blog/mutations";
