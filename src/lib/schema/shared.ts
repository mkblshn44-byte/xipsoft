/**
 * schema/shared.ts — JSON-LD şemalarında ortak sabitler.
 */

/** Tüm JSON-LD belgelerinde kullanılan schema.org bağlamı. */
export const SCHEMA_CONTEXT = "https://schema.org";

/**
 * Marka sosyal profilleri — Organization ve LocalBusiness şemalarında tek
 * kaynaktan beslenir (`sameAs`). Yeni profil eklemek için yalnızca burayı
 * güncelle.
 */
export const SOCIAL_PROFILES = [
  "https://www.linkedin.com/company/xipsoft",
  "https://github.com/xipsoft",
  "https://twitter.com/xipsoft",
];

/**
 * Hizmet verilen pazar (schema.org `areaServed`). Organization ve LocalBusiness
 * aynı kapsamı paylaşır.
 */
export const AREA_SERVED = [
  { "@type": "Country", name: "Turkey" },
  { "@type": "Country", name: "Europe" },
];
