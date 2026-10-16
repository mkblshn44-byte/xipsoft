/**
 * seo-audit.ts — GERİYE DÖNÜK UYUMLULUK (barrel)
 *
 * SEO denetim katmanı sorumluluk bazında `src/lib/seo/*` altına bölünmüştür.
 * Dışarıya aynı genel yüzey (`@/lib/seo-audit`) sunulur.
 *
 *   seo/page-audit.ts  → performSEOAudit, SEOAuditResult, PageAuditData
 *   seo/audit-store.ts → saveSEOAudit
 */

export { performSEOAudit } from "./seo/page-audit";
export type { SEOAuditResult, PageAuditData } from "./seo/page-audit";
export { saveSEOAudit } from "./seo/audit-store";
