import type { Metadata } from "next";
import HomePageComponent from "./HomePageComponents";
import {
  faqSchema,
  webPageSchema
} from "@/lib/schema/site";
import JsonLd from "@/components/seo/JsonLd";
import Container from "@/components/Common/Container/Container";
import FaqSection from "@/components/seo/FaqSection";
import { getPageFaqs, getPageMeta } from "@/lib/page-content";
import { buildPageMetadata } from "@/lib/seo-helpers";
import APP_CONFIG, { DEFAULT_OG_IMAGE_URL, SITE_URL } from "@/config/brand.config";

export const revalidate = 300;

const OG_IMAGE_ALT = `XipSoft | Kurumsal Web Tasarım, Özel Yazılım & Siber Güvenlik`;

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("home");
  const title = meta?.title || APP_CONFIG.title;
  const description = meta?.description || APP_CONFIG.description;
  const shareTitle = meta?.ogTitle || title;
  const shareDescription = meta?.ogDescription || description;

  return {
    ...buildPageMetadata({
      title,
      description,
      canonicalPath: "/",
      titleAbsolute: true,
      keywords: meta?.keywords?.length ? meta.keywords : undefined,
      imageAlt: OG_IMAGE_ALT,
      shareTitle,
      shareDescription,
    }),
    icons: {
      icon: "/favicon.ico",
      apple: "/favicon.ico",
    },
    other: {
      // LCP kritik görsellerin ön yüklemesi: tarayıcıya önce bunları almasını söylüyoruz
      "image": DEFAULT_OG_IMAGE_URL,
    },
  };
}

export default async function HomePage() {
  const homeMeta = await getPageMeta("home");
  const faqItems = await getPageFaqs("home");

  // ── JSON-LD: WebPage + Breadcrumb + FAQ ──────────────────────────────────
  // Organization / WebSite / LocalBusiness düğümleri kök layout'ta site geneli
  // tek @graph olarak basılır; burada tekrar üretilmez (aynı @id çakışması olmaz).
  const jsonLd = [
    webPageSchema({
      name: "XipSoft | Kurumsal Web Tasarım, Özel Yazılım & Siber Güvenlik",
      description: "Next.js 15 ile yüksek hızlı kurumsal web siteleri, özel yazılım ve mobil uygulamalar. 15 yıl deneyim, 200+ proje. İstanbul merkezli — ücretsiz analiz alın.",
      url: "/",
      breadcrumbs: [{ name: "Ana Sayfa", url: "/" }],
    }),
    faqItems.length > 0 ? faqSchema(faqItems) : null,
  ];

  return (
    <>
      <JsonLd schemas={jsonLd} id="home" />
      <HomePageComponent heroCopy={homeMeta?.hero} />

      {/* Sayfaya özel SSS — DB'de `home` kategorisi doluysa gösterilir, yoksa render edilmez */}
      {faqItems.length > 0 && (
        <Container withPadding>
          <FaqSection
            items={faqItems}
            eyebrow="SSS"
            title="Sıkça Sorulan Sorular"
            subtitle="XipSoft hizmetleri, çalışma sürecimiz ve teklif akışı hakkında en çok merak edilenler."
          />
        </Container>
      )}
    </>
  );
}
