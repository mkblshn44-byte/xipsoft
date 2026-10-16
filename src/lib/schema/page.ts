/**
 * schema/page.ts — Kurumsal / statik sayfalar için standart JSON-LD seti.
 *
 * TEK KAYNAK: Hakkımızda, İletişim, Gizlilik, Çerez Politikası, Kullanım
 * Şartları, Referanslar, Ürünler, Rehber (how-to) gibi tüm kurumsal sayfalar
 * aynı üçlüyü (WebPage + BreadcrumbList + varsa FAQPage) buradan alır.
 *
 * Kural (MIMARI.md): Sayfa türü başına tek şema seti; sayfa dosyaları
 * JSON-LD gövdesi yazmaz, yalnızca girdiyi sağlar.
 */

import { breadcrumbSchema, faqSchema, webPageSchema } from "./site";

export interface CorporatePageSchemaInput {
  /** WebPage adı — sayfadaki H1 ile uyumlu olmalı. */
  name: string;
  /** Meta açıklama ile aynı metin. */
  description: string;
  /** Göreli (`/privacy-policy`) veya mutlak URL. */
  url: string;
  /** Ana Sayfa'dan başlayan kırıntı yolu (son eleman bu sayfa). */
  breadcrumbs: Array<{ name: string; url: string }>;
  /** Sayfada SSS bölümü varsa (ör. İletişim) FAQPage eklenir. */
  faqs?: Array<{ question: string; answer: string }>;
}

/** WebPage + BreadcrumbList (+ FAQPage) şemalarını dizi olarak döner. */
export function corporatePageSchema(input: CorporatePageSchemaInput) {
  return [
    webPageSchema({
      name: input.name,
      description: input.description,
      url: input.url,
      breadcrumbs: input.breadcrumbs,
    }),
    breadcrumbSchema(input.breadcrumbs),
    ...(input.faqs && input.faqs.length > 0 ? [faqSchema(input.faqs)] : []),
  ];
}
