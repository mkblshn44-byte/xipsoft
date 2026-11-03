import type { Metadata } from "next";
import APP_CONFIG, { DEFAULT_OG_IMAGE_URL, SITE_URL } from "@/config/brand.config";
import AboutPageClient, { type AboutSections } from "./AboutPageClient";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema/site";
import { getPageMeta, type PageMeta } from "@/lib/page-content";

// ISR - 1 saatte bir yenilenir
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("hakkimizda");
  const title = meta?.title || APP_CONFIG.title;
  const description = meta?.description || APP_CONFIG.description;

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: meta?.keywords?.length ? meta.keywords : undefined,
    alternates: {
      canonical: `${SITE_URL}/hakkimizda`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/hakkimizda`,
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      siteName: APP_CONFIG.title,
      locale: "tr_TR",
      alternateLocale: ["en_US"],
      images: [{ url: DEFAULT_OG_IMAGE_URL, width: 1200, height: 630, alt: "XipSoft Hakkımızda" }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      images: [DEFAULT_OG_IMAGE_URL],
    },
  };
}

function buildJsonLd(meta: PageMeta | null) {
  // Organization düğümü kök layout'taki site geneli @graph'tan gelir.
  return [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: meta?.jsonLd?.name || APP_CONFIG.title,
      description: meta?.jsonLd?.description || APP_CONFIG.description,
      url: `${SITE_URL}/hakkimizda`,
      // @id referansları grafiği tamamlar (organizationSchema ile eşleşir)
      isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
      publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization` },
    },
    breadcrumbSchema([
      { name: "Ana Sayfa", url: "/" },
      { name: "Hakkımızda", url: "/hakkimizda" },
    ]),
  ];
}

export default async function AboutPage() {
  const meta = await getPageMeta("hakkimizda");
  const jsonLd = buildJsonLd(meta);
  return (
    <>
      <JsonLd schemas={jsonLd} id="hakkimizda" />
      <AboutPageClient
        heroCopy={meta?.hero}
        sections={meta?.sections as AboutSections | undefined}
      />
    </>
  );
}
