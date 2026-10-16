/**
 * pages.ts — GERİYE DÖNÜK UYUMLULUK (barrel)
 *
 * Sayfa & yerel SEO veri katmanı sorumluluk bazında `src/lib/pages/*` altına
 * bölünmüştür. Dışarıya aynı genel yüzey (`@/lib/pages`) sunulur.
 *
 *   pages/types.ts     → LocationType, LocalSeoContext, CentralLocation,
 *                        LocalFaqItem, PublishedPage
 *   pages/sql.ts       → LOCATION_LOCAL_AREA_NAMES_SQL, CENTRAL_LOCATION_COLUMNS
 *   pages/hash.ts      → hashPageContent (+ iç normalizasyon yardımcıları)
 *   pages/location.ts  → getCentralLocationBySlug, getCentralLocationByIds
 *   pages/published.ts → getPublishedPageBySlug, getPublishedDistrictPageSegment,
 *                        getPublishedDistrictPageSlugs,
 *                        getProvinceSlugForLegacyLocation
 */

export * from "./pages/types";
export * from "./pages/sql";
export { hashPageContent } from "./pages/hash";
export * from "./pages/location";
export * from "./pages/published";
