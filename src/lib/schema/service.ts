/**
 * schema/service.ts — Hizmet sayfaları için `Service` / `ProfessionalService`
 * JSON-LD üreticisi.
 *
 * TEK KAYNAK: `/hizmetler/[slug]` (hizmet) ile `/hizmetler/[slug]/[sehir]`
 * (hizmet × konum) bu aynı üreticiden beslenir; yalnız `areaServed` konum
 * türüne göre değişir. Böylece üç ayrı yerde aynı şema bloğu kopyalanmaz.
 */

import { SITE_URL } from "@/lib/site-url";
import { BRAND } from "@/config/brand.config";
import { SCHEMA_CONTEXT } from "./shared";

/** Konum kapsamı — schema.org areaServed karşılığı. */
export interface ServiceAreaServed {
  type: "Country" | "AdministrativeArea" | "City";
  name: string;
  /** İl/ilçe için üst ülke: { name: "Turkey" } */
  parentCountry?: string;
}

export interface ServiceSchemaInput {
  /** Sayfa başlığı — sayfadaki H1 ile birebir aynı metin olmalı. */
  name: string;
  /** Meta açıklama ile aynı metin (Google snippet'i bu metni kullanır). */
  description: string;
  /** Göreli (`/hizmetler/x`) veya mutlak URL. */
  url: string;
  /** Hizmet tipi — genelde hizmet başlığı. */
  serviceType: string;
  /** Verilirse `areaServed` üretilir; verilmezse tüm ülke kapsamı. */
  areaServed?: ServiceAreaServed;
  /** OG görseli; verilmezse site varsayılanı kullanılır. */
  image?: string;
  /**
   * `true` → `ProfessionalService` (LocalBusiness alt tipi; adres + geo
   * sinyali ekler). Yerel işletme görünürlüğü istenen sayfalar için.
   */
  professional?: boolean;
}

export function serviceSchema(input: ServiceSchemaInput) {
  const url = input.url.startsWith("http") ? input.url : `${SITE_URL}${input.url}`;
  const image = input.image ?? `${SITE_URL}/images/xipsoft-seo.png`;
  const area = input.areaServed ?? { type: "Country" as const, name: "Turkey" };

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": input.professional ? "ProfessionalService" : "Service",
    name: input.name,
    description: input.description,
    url,
    image,
    serviceType: input.serviceType,
    // @id ile Organization/LocalBusiness düğümüne bağlanır → varlık birleştirme
    provider: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: BRAND.name,
      url: SITE_URL,
    },
    areaServed: {
      "@type": area.type,
      name: area.name,
      // İl/ilçe kapsamını açıkça Türkiye'ye bağla (coğrafi bağlam sinyali)
      ...(area.parentCountry
        ? { containedInPlace: { "@type": "Country", name: area.parentCountry } }
        : {}),
    },
  };
}

/**
 * Hizmet sayfası için standart breadcrumb yolu.
 *
 * Konumlu sayfalar için `locationName`/`locationUrl` verilir; verilmezse
 * yalnızca Ana Sayfa > Hizmetler > Hizmet üçlüsü üretilir.
 */
export function serviceBreadcrumbs(opts: {
  serviceName: string;
  serviceSlug: string;
  locationName?: string;
  locationUrl?: string;
}): Array<{ name: string; url: string }> {
  return [
    { name: "Ana Sayfa", url: "/" },
    { name: "Hizmetler", url: "/hizmetler" },
    { name: opts.serviceName, url: `/hizmetler/${opts.serviceSlug}` },
    ...(opts.locationName && opts.locationUrl
      ? [{ name: opts.locationName, url: opts.locationUrl }]
      : []),
  ];
}
