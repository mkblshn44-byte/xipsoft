import APP_CONFIg, { SITE_URL } from "@/config/brand.config";
import { Metadata } from "next";
import PageTransitionWrapper from "@/components/Animate/PageTransitionWrapper/PageTransitionWrapper";
import ReferencesPageClient from "./ReferencesPageClient";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema, collectionPageSchema, itemListSchema } from "@/lib/schema-helpers";
import { getPageMeta } from "@/lib/page-content";
import { getAllReferences } from "@/lib/database";

// ISR - 1 saatte bir yenilenir, API yükünü azaltır
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${SITE_URL}/references`;
  const meta = await getPageMeta("references");
  const title = meta?.title || APP_CONFIg.title;
  const description = meta?.description || APP_CONFIg.description;

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
      siteName: APP_CONFIg.title,
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      images: [{ url: `${SITE_URL}/images/xipsoft-seo.png`, width: 1200, height: 630, alt: "XipSoft Referanslar" }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      images: [`${SITE_URL}/images/xipsoft-seo.png`],
    },
  };
}

export default async function ReferencesPage() {
  const meta = await getPageMeta("references");
  const dbReferences = await getAllReferences(true);

  const jsonLd = [
    collectionPageSchema({
      name: meta?.jsonLd?.name || APP_CONFIg.title,
      description: meta?.jsonLd?.description || APP_CONFIg.description,
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
