import APP_CONFIG, { DEFAULT_OG_IMAGE_URL, SITE_URL } from "@/config/brand.config";
import { Metadata } from "next";
import PageTransitionWrapper from "@/components/Animate/PageTransitionWrapper/PageTransitionWrapper";
import ReferencesPageClient from "./ReferencesPageClient";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema/site";
import {
  collectionPageSchema,
  itemListSchema
} from "@/lib/schema/collection";
import { getPageMeta } from "@/lib/page-content";
import { getAllReferences } from "@/lib/db/references";

// ISR - 1 saatte bir yenilenir, API yükünü azaltır
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${SITE_URL}/references`;
  const meta = await getPageMeta("references");
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
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: canonical,
      siteName: APP_CONFIG.title,
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      images: [{ url: DEFAULT_OG_IMAGE_URL, width: 1200, height: 630, alt: "XipSoft Referanslar" }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      images: [DEFAULT_OG_IMAGE_URL],
    },
  };
}

export default async function ReferencesPage() {
  const meta = await getPageMeta("references");
  const dbReferences = await getAllReferences(true);

  const jsonLd = [
    collectionPageSchema({
      name: meta?.jsonLd?.name || APP_CONFIG.title,
      description: meta?.jsonLd?.description || APP_CONFIG.description,
      url: "/references",
    }),
    breadcrumbSchema([
      { name: "Ana Sayfa", url: "/" },
      { name: "Referanslarımız", url: "/references" },
    ]),
    dbReferences.length > 0
      ? itemListSchema({
          name: "XipSoft Referansları",
          description: "XipSoft tarafından geliştirilen projeler ve referanslar.",
          items: dbReferences.map((ref) => ({
            name: ref.title ?? "Referans",
            url: "/references",
            description: ref.description ?? undefined,
          })),
        })
      : null,
  ];

  return (
    <PageTransitionWrapper>
      <JsonLd schemas={jsonLd} id="references" />
      <ReferencesPageClient dbReferences={dbReferences} />
    </PageTransitionWrapper>
  );
}
