/**
 * schema/site.ts — Site geneli JSON-LD üreticileri (breadcrumb, webPage,
 * organization, faq).
 */

import { SITE_URL } from "@/lib/site-url";
import {
  APP_CONFIG,
  BRAND,
  BRAND_COMPANY,
  DEFAULT_OG_IMAGE_URL,
} from "@/config/brand.config";
import { websiteSchema } from "./website";
import { localBusinessSchema } from "./local-business";
import { AREA_SERVED, SCHEMA_CONTEXT, SOCIAL_PROFILES } from "./shared";

export function breadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function faqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function webPageSchema(opts: {
  name: string;
  description: string;
  url: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
}) {
  const url = opts.url.startsWith("http") ? opts.url : `${SITE_URL}${opts.url}`;
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebPage",
    name: opts.name,
    description: opts.description,
    url,
    isPartOf: { "@type": "WebSite", url: SITE_URL, name: "XipSoft Yazılım ve Teknoloji Sistemleri" },
    publisher: { "@type": "Organization", name: "XipSoft Yazılım ve Teknoloji Sistemleri", url: SITE_URL },
    ...(opts.breadcrumbs && { breadcrumb: breadcrumbSchema(opts.breadcrumbs) }),
  };
}

export function organizationSchema() {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BRAND.name,
    legalName: BRAND_COMPANY.legalName,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: DEFAULT_OG_IMAGE_URL,
      width: 1200,
      height: 630,
    },
    image: DEFAULT_OG_IMAGE_URL,
    description: APP_CONFIG.description,
    foundingDate: String(BRAND_COMPANY.foundingYear),
    numberOfEmployees: { "@type": "QuantitativeValue", value: "20-50" },
    areaServed: AREA_SERVED,
    address: {
      "@type": "PostalAddress",
      streetAddress: BRAND_COMPANY.address,
      addressLocality: BRAND_COMPANY.district,
      addressRegion: BRAND_COMPANY.city,
      postalCode: BRAND_COMPANY.postalCode,
      addressCountry: BRAND_COMPANY.countryCode,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: BRAND_COMPANY.phone,
        email: BRAND_COMPANY.email,
        contactType: "customer service",
        areaServed: "TR",
        availableLanguage: ["Turkish", "English"],
      },
      {
        "@type": "ContactPoint",
        email: BRAND_COMPANY.email,
        contactType: "technical support",
        areaServed: "TR",
      },
    ],
    sameAs: SOCIAL_PROFILES,
  };
}

/**
 * Site geneli varlık grafiği — Organization + WebSite + LocalBusiness düğümleri
 * tek `@graph` altında. Kök layout bu tek bloğu her sayfaya basar; sayfalar
 * yalnızca kendi sayfaya özel şemalarını (WebPage, Breadcrumb, Service, FAQ,
 * BlogPosting...) ekler. Böylece aynı `@id` düğümleri hiçbir sayfada
 * tekrarlanmaz.
 */
export function siteGraphSchema() {
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [organizationSchema(), websiteSchema(), localBusinessSchema()],
  };
}
