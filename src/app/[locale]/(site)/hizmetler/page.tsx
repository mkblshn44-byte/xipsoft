import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE_URL, SITE_URL } from "@/config/brand.config";
import APP_CONFIG from "@/config/brand.config";
import { getServicesHubData } from "@/lib/services-hub";
import { getPageMeta } from "@/lib/page-content";
import { servicePath } from "@/lib/content-path";
import { buildPageMetadata, generateDynamicTitle } from "@/lib/seo-helpers";
import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbSchema,
  faqSchema
} from "@/lib/schema/site";
import {
  collectionPageSchema,
  itemListSchema
} from "@/lib/schema/collection";
import HizmetlerHubClient from "./HizmetlerHubClient";

// ISR - 1 saatte bir güncellenir
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${SITE_URL}/hizmetler`;
  const meta = await getPageMeta("hizmetler");

  // Dinamik title: DB'den varsa kullan, yoksa sayfa türüne göre üret
  const dynamicTitle = meta?.title || generateDynamicTitle("services");
  const description = meta?.description || APP_CONFIG.description;

  return buildPageMetadata({
    title: dynamicTitle,
    titleAbsolute: true, // DB'den gelen veya dinamik ürettiğimiz başlık zaten marka suffix içeriyor
    description,
    keywords: meta?.keywords?.length ? meta.keywords : undefined,
    canonicalPath: "/hizmetler",
    shareTitle: meta?.ogTitle || dynamicTitle,
    shareDescription: meta?.ogDescription || description,
  });
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
        url: servicePath(svc.slug),
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
