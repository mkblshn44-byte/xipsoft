/**
 * schema/local-business.ts — Yerel işletme (LocalBusiness / ProfessionalService)
 * JSON-LD üreticisi.
 *
 * TEK KAYNAK: Ana Sayfa ve İletişim sayfası aynı kaynaktan beslenir.
 * Adres, telefon, çalışma saatleri ve coğrafi koordinatlar `BRAND_COMPANY`
 * config'inden gelir; ikinci bir kopya tutulmaz.
 */

import { SITE_URL } from "@/lib/site-url";
import { BRAND_COMPANY, DEFAULT_OG_IMAGE_URL } from "@/config/brand.config";
import { AREA_SERVED, SCHEMA_CONTEXT, SOCIAL_PROFILES } from "./shared";

export function localBusinessSchema(opts?: {
  /** İşletme düğümünün işaret ettiği sayfa (varsayılan: ana sayfa). */
  url?: string;
  /** Ek sosyal profiller — E-E-A-T sameAs sinyali. */
  sameAs?: string[];
}) {
  return {
    "@context": SCHEMA_CONTEXT,
    // ProfessionalService, LocalBusiness'ın alt türüdür; ana sayfa ve iletişim
    // sayfası aynı düğümü paylaşsın diye en özgül tip seçildi.
    "@type": "ProfessionalService",
    // Organization'dan AYRI düğüm kimliği: iki farklı @type aynı @id'yi
    // paylaşırsa Google varlıkları birleştirirken tip çakışması yaşayabilir.
    "@id": `${SITE_URL}/#localbusiness`,
    // Üst kuruluş: Organization düğümüne bağlanır (varlık grafiği)
    parentOrganization: { "@type": "Organization", "@id": `${SITE_URL}/#organization` },
    name: BRAND_COMPANY.legalName,
    url: opts?.url ?? SITE_URL,
    telephone: BRAND_COMPANY.phone,
    email: BRAND_COMPANY.email,
    foundingDate: String(BRAND_COMPANY.foundingYear),
    image: DEFAULT_OG_IMAGE_URL,
    logo: DEFAULT_OG_IMAGE_URL,
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
    areaServed: AREA_SERVED,
    sameAs: opts?.sameAs ?? SOCIAL_PROFILES,
  };
}
