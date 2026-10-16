import APP_CONFIg, { SITE_URL } from "@/config/brand.config";
import { Metadata } from "next";
import PageTransitionWrapper from "@/components/Animate/PageTransitionWrapper/PageTransitionWrapper";
import ContactPageClient from "./ContactPageClient";
import JsonLd from "@/components/seo/JsonLd";
import { faqSchema, localBusinessSchema, webPageSchema } from "@/lib/schema-helpers";
import { getPageFaqs, getPageMeta } from "@/lib/page-content";

// Static page - cache for 1 hour
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("contact");
  const title = meta?.title || APP_CONFIg.title;
  const description = meta?.description || APP_CONFIg.description;

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: meta?.keywords?.length ? meta.keywords : undefined,
    alternates: {
      canonical: `${SITE_URL}/contact-us`,
    },
    robots: { 
      index: true, 
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: `${SITE_URL}/contact-us`,
      siteName: APP_CONFIg.title,
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      images: [{ url: `${SITE_URL}/images/xipsoft-seo.png`, width: 1200, height: 630, alt: "XipSoft İletişim" }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      images: [`${SITE_URL}/images/xipsoft-seo.png`],
    },
  };
}

const ContactUsPage = async () => {
  const faqItems = await getPageFaqs("contact");

  // ── JSON-LD: LocalBusiness + WebPage + Breadcrumb + FAQ (tek kaynak) ──────
  const jsonLd = [
    localBusinessSchema({ url: `${SITE_URL}/contact-us` }),
    webPageSchema({
      name: "İletişim | XipSoft",
      description:
        "XipSoft ile iletişime geçin — web yazılım, mobil uygulama, siber güvenlik ve dijital pazarlama projeleriniz için ücretsiz analiz.",
      url: "/contact-us",
      breadcrumbs: [
        { name: "Ana Sayfa", url: "/" },
        { name: "İletişim", url: "/contact-us" },
      ],
    }),
    faqItems.length > 0 ? faqSchema(faqItems) : null,
  ];

  return (
    <PageTransitionWrapper>
      <JsonLd schemas={jsonLd} id="contact" />
      <ContactPageClient />
    </PageTransitionWrapper>
  );
};

export default ContactUsPage;
