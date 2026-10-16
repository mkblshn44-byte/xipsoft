/**
 * database.ts — GERİYE DÖNÜK UYUMLULUK (barrel)
 *
 * Bu dosya artık tek başına bir "mega modül" değil; veri katmanı
 * `src/lib/db/*` altına sorumluluk bazında bölünmüştür. Dışarıya aynı
 * genel yüzey (`@/lib/database`) sunulur, böylece mevcut ~70 import
 * değişmeden çalışmaya devam eder.
 *
 *   db/pool.ts         → bağlantı havuzu, health, router, proxy, query/queryOne/transaction
 *   db/admin-2fa.ts    → admin_2fa_otps
 *   db/services.ts     → services
 *   db/service-city.ts → service_city_seo
 *   db/references.ts   → site_references
 *   db/types.ts        → paylaşılan tipler (User)
 *
 * Yeni kod doğrudan ilgili alt dosyayı import etmelidir; bu barrel yalnızca
 * uyumluluk içindir.
 */

export { default } from "./db/pool";
export * from "./db/pool";
export * from "./db/admin-2fa";
export * from "./db/services";
export * from "./db/service-city";
export * from "./db/references";
export * from "./db/types";
