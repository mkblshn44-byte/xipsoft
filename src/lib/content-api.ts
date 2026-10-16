/**
 * content-api.ts — GERİYE DÖNÜK UYUMLULUK (barrel)
 *
 * Merkezi içerik yazma (ingest) katmanı, sorumluluk bazında
 * `src/lib/content/*` altına bölünmüştür. Dışarıya aynı genel yüzey
 * (`@/lib/content-api`) sunulur; rota dosyaları ve çağıranlar değişmeden çalışır.
 *
 *   content/auth.ts              → resolveBotAuthorId, verifyContentApiKey
 *   content/ssrf.ts              → isSafeExternalUrl
 *   content/validation.ts        → validateTags, isPlainRecord
 *   content/lexical.ts           → buildLexicalState
 *   content/response.ts          → fail
 *   content/constants.ts         → PAGE_STATUSES, PAGE_SOURCE_TYPES, UUID_RE
 *   content/request-guard.ts     → guardContentApiRequest, guardContentApiRead
 *   content/handlers/blog.ts     → handleBlogIngest
 *   content/handlers/page.ts     → handlePageIngest, pageIngestCore
 *   content/handlers/page-batch.ts     → handlePageBatchIngest
 *   content/handlers/restricted-page.ts → handleRestrictedPageUpdate
 *   content/handlers/redirect.ts       → handleRedirectIngest
 *
 * Bu modül iki rota tarafından paylaşılır:
 *   - /api/bot      → Blog, Redirect
 *   - /api/content  → Blog, Page/PageBatch, Redirect, Kısıtlı güncelleme
 */

export { resolveBotAuthorId, verifyContentApiKey } from "./content/auth";
export { isSafeExternalUrl } from "./content/ssrf";
export { validateTags } from "./content/validation";
export { buildLexicalState } from "./content/lexical";
export { handleBlogIngest } from "./content/handlers/blog";
export { handlePageIngest } from "./content/handlers/page";
export { handlePageBatchIngest } from "./content/handlers/page-batch";
export { handleRestrictedPageUpdate } from "./content/handlers/restricted-page";
export { handleRedirectIngest } from "./content/handlers/redirect";
