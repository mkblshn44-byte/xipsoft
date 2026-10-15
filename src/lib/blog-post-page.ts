/**
 * blog-post-page.ts — GERİYE DÖNÜK UYUMLULUK (barrel)
 *
 * Blog detay verisi `src/lib/blog/detail.ts`'e taşındı. `normalizeBlogSlug` ise
 * client-safe `src/lib/blog-slug.ts`'ten yeniden dışa aktarılır (sunucu
 * bağımlılıkları istemci paketine sızmasın diye ayrı tutulur).
 *
 *   blog/detail.ts  → DbBlogRow, getDbBlogBySlug, serializeDbBlog,
 *                     buildBlogPostMetadata, resolvePublishedBlogPost, …
 */

export * from "./blog/detail";
export { normalizeBlogSlug } from "./blog-slug";
