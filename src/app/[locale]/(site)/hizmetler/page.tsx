import type { Metadata } from "next";
import { SITE_URL } from "@/config/brand.config";
import APP_CONFIG from "@/config/brand.config";
import { getServicesHubData } from "@/lib/services-hub";
import { getPageMeta } from "@/lib/page-content";
import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbSchema,
  collectionPageSchema,
  faqSchema,
  itemListSchema,
} from "@/lib/schema-helpers";
import HizmetlerHubClient from "./HizmetlerHubClient";

// ISR - 1 saatte bir güncellenir
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${SITE_URL}/hizmetler`;
  const meta = await getPageMeta("hizmetler");
  const title = meta?.title || APP_CONFIG.title;
  const description = meta?.description || APP_CONFIG.description;

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: meta?.keywords?.length ? meta.keywords : undefined,
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      siteName: APP_CONFIG.title,
      locale: "tr_TR",
      images: [
        {
          url: `${SITE_URL}/media/xipsoft-seo.webp`,
          width: 1200,
          height: 630,
          alt: "XipSoft Teknoloji & Yazılım Hizmetleri",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      images: [`${SITE_URL}/media/xipsoft-seo.webp`],
    },
  };
}

export default async function HizmetlerPage() {
  // Mimari kural (MIMARI.md): içerik NeonDB'den gelir; bu dosya yalnızca
  // şablon iskeletidir ve sabit hizmet/SSS metni tutmaz.
  const { services, faq } = await getServicesHubData();
  const meta = await getPageMeta("hizmetler");

  const jsonLd = [
    collectionPageSchema({
      name: meta?.jsonLd?.name || APP_CONFIG.title,
      description: meta?.jsonLd?.description || APP_CONFIG.description,
      url: "/hizmetler",
    }),
    itemListSchema({
      name: meta?.jsonLd?.itemListName || APP_CONFIG.title,
      description: meta?.jsonLd?.itemListDescription || APP_CONFIG.description,
      items: services.map((svc) => ({
        name: svc.title,
        url: `/hizmetler/${svc.slug}`,
        description: svc.shortDesc,
      })),
    }),
    breadcrumbSchema([
      { name: "Ana Sayfa", url: "/" },
      { name: "Hizmetlerimiz", url: "/hizmetler" },
    ]),
    faq.length > 0 ? faqSchema(faq) : null,
  ];

  return (
    <>
      <JsonLd schemas={jsonLd} id="hizmetler-hub" />
      <HizmetlerHubClient services={services} faq={faq} />
    </>
  );
}
