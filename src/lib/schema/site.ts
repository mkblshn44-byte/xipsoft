/**
 * schema/site.ts — Site geneli JSON-LD üreticileri (breadcrumb, webPage,
 * organization, faq).
 */

import { SITE_URL } from "@/lib/site-url";
import { SCHEMA_CONTEXT } from "./shared";

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
    name: "XipSoft Yazılım ve Teknoloji Sistemleri",
    legalName: "XipSoft Yazilim ve Teknoloji Sistemleri",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/images/xipsoft-seo.png`,
      width: 1200,
      height: 630,
    },
    description:
      "Profesyonel web yazılım, mobil uygulama, siber Güvenlik ve dijital pazarlama hizmetleri sunan İstanbul merkezli teknoloji şirketi — 15 yıl deneyim, 200+ proje.",
    foundingDate: "2010",
    numberOfEmployees: { "@type": "QuantitativeValue", value: "20-50" },
    areaServed: [
      { "@type": "Country", name: "Turkey" },
      { "@type": "Country", name: "Europe" },
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Nurol Tower, İzzet Paşa, Yeni Yol Cd. No:3 Kat:22",
      addressLocality: "Şişli",
      addressRegion: "İstanbul",
      postalCode: "34381",
      addressCountry: "TR",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: "+90-544-454-84-44",
        email: "info@xipsoft.net",
        url: `${SITE_URL}/contact-us`,
        areaServed: "TR",
        availableLanguage: ["Turkish", "English"],
      },
    ],
    sameAs: [
      "https://www.linkedin.com/company/xipsoft",
      "https://github.com/xipsoft",
      "https://twitter.com/xipsoft",
    ],
  };
}
