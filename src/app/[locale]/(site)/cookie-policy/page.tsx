import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Common/Container/Container";
import Link from "next/link";
import { SITE_URL } from "@/config/brand.config";
import TitleText from "@/components/Common/TitleText/TitleText";
import JsonLd from "@/components/seo/JsonLd";
import { corporatePageSchema } from "@/lib/schema-helpers";
import { getPageMeta } from "@/lib/page-content";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [t, meta] = await Promise.all([
    getTranslations("cookies"),
    getPageMeta("cookie-policy"),
  ]);
  const title = meta?.title || t("title");
  const description = meta?.description || t("description");
  return {
    title: { absolute: title },
    description,
    keywords: meta?.keywords?.length ? meta.keywords : undefined,
    alternates: { canonical: `${SITE_URL}/cookie-policy` },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/cookie-policy`,
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      locale: "tr_TR",
      siteName: "XipSoft",
      images: [{ url: `${SITE_URL}/images/xipsoft-seo.png`, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function CookiePolicyPage() {
  const [t, meta] = await Promise.all([
    getTranslations("cookies"),
    getPageMeta("cookie-policy"),
  ]);

  const jsonLd = corporatePageSchema({
    name: meta?.title || t("title"),
    description: meta?.description || t("description"),
    url: "/cookie-policy",
    breadcrumbs: [
      { name: "Ana Sayfa", url: "/" },
      { name: "Çerez Politikası", url: "/cookie-policy" },
    ],
  });

  return (
    <Container withPadding className="py-16 max-w-4xl mx-auto">
      <JsonLd schemas={jsonLd} id="cookie-policy" />
      <div className="space-y-8">
        <div>
          <TitleText tag="h1" variant="glass" className="mb-4">
            {t("title")}
          </TitleText>
          <p className="text-zinc-400 text-sm">{t("lastUpdated")}</p>
        </div>

        <div className="prose prose-inverse max-w-none space-y-6">
          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.what.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.what.content")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.types.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">{t("sections.types.intro")}</p>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">{t("sections.types.essential.title")}</h3>
                <p className="text-zinc-300 text-sm">{t("sections.types.essential.content")}</p>
              </div>
              
              <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">{t("sections.types.analytics.title")}</h3>
                <p className="text-zinc-300 text-sm">{t("sections.types.analytics.content")}</p>
              </div>
              
              <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">{t("sections.types.advertising.title")}</h3>
                <p className="text-zinc-300 text-sm">{t("sections.types.advertising.content")}</p>
              </div>
              
              <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">{t("sections.types.functional.title")}</h3>
                <p className="text-zinc-300 text-sm">{t("sections.types.functional.content")}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.adsense.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.adsense.content")}
            </p>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.adsense.details")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.thirdParty.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">{t("sections.thirdParty.intro")}</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li>{t("sections.thirdParty.items.google")}</li>
              <li>{t("sections.thirdParty.items.analytics")}</li>
              <li>{t("sections.thirdParty.items.social")}</li>
              <li>{t("sections.thirdParty.items.advertising")}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.manage.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.manage.content")}
            </p>
            <p className="text-zinc-300 leading-relaxed mt-2">
              {t("sections.manage.browser")}
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 mt-2">
              <li>{t("sections.manage.browsers.chrome")}</li>
              <li>{t("sections.manage.browsers.firefox")}</li>
              <li>{t("sections.manage.browsers.safari")}</li>
              <li>{t("sections.manage.browsers.edge")}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.consent.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.consent.content")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.updates.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.updates.content")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.contact.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">{t("sections.contact.intro")}</p>
            <ul className="space-y-2 text-zinc-300">
              <li><strong>{t("sections.contact.email.label")}</strong> {t("sections.contact.email.value")}</li>
              <li><strong>{t("sections.contact.address.label")}</strong> {t("sections.contact.address.value")}</li>
            </ul>
          </section>
        </div>

        <div className="pt-8 border-t border-zinc-800">
          <Link 
            href="/" 
            className="text-prism-cyan hover:text-prism-violet transition-colors duration-300 inline-flex items-center gap-2"
          >
            ← {t("backToHome")}
          </Link>
        </div>
      </div>
    </Container>
  );
}
