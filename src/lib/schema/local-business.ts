/**
 * schema/local-business.ts — Yerel işletme (LocalBusiness / ProfessionalService)
 * JSON-LD üreticisi.
 *
 * TEK KAYNAK: Ana Sayfa ve İletişim sayfası aynı kaynaktan beslenir.
 * Adres, telefon, çalışma saatleri ve coğrafi koordinatlar `BRAND_COMPANY`
 * config'inden gelir; ikinci bir kopya tutulmaz.
 */

import { SITE_URL } from "@/lib/site-url";
import { BRAND_COMPANY } from "@/config/brand.config";
import { SCHEMA_CONTEXT } from "./shared";

export function localBusinessSchema(opts?: {
  /** İşletme düğümünün işaret ettiği sayfa (varsayılan: ana sayfa). */
  url?: string;
  /** Ek sosyal profiller — E-E-A-T sameAs sinyali. */
  sameAs?: string[];
}) {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "LocalBusiness",
    // Organization'dan AYRI düğüm kimliği: iki farklı @type aynı @id'yi
    // paylaşırsa Google varlıkları birleştirirken tip çakışması yaşayabilir.
    "@id": `${SITE_URL}/#localbusiness`,
    name: BRAND_COMPANY.legalName,
    // Üst kuruluş: Organization düğümüne bağlanır (varlık grafiği)
    parentOrganization: { "@type": "Organization", "@id": `${SITE_URL}/#organization` },
    url: opts?.url ?? SITE_URL,
    telephone: BRAND_COMPANY.phone,
    email: BRAND_COMPANY.email,
    foundingDate: String(BRAND_COMPANY.foundingYear),
    image: `${SITE_URL}/media/xipsoft-seo.webp`,
    logo: `${SITE_URL}/media/xipsoft-seo.webp`,
    address: {
      "@type": "PostalAddress",
      streetAddress: BRAND_COMPANY.address,
      addressLocality: BRAND_COMPANY.district,
      addressRegion: BRAND_COMPANY.city,
      postalCode: BRAND_COMPANY.postalCode,
      addressCountry: BRAND_COMPANY.countryCode,
    },
    // Coğrafi konum: Google Maps eşleşmesi için en güçlü yerel sinyal
    geo: {
      "@type": "GeoCoordinates",
      latitude: BRAND_COMPANY.geo.lat,
      longitude: BRAND_COMPANY.geo.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    areaServed: { "@type": "Country", name: BRAND_COMPANY.country },
    sameAs: opts?.sameAs ?? [
      "https://www.linkedin.com/company/xipsoft",
      "https://github.com/xiplarexs",
      "https://t.me/xipsoft",
    ],
  };
}
