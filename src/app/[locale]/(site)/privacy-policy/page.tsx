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
    getTranslations("privacy"),
    getPageMeta("privacy-policy"),
  ]);
  const title = meta?.title || t("title");
  const description = meta?.description || t("description");
  return {
    title: { absolute: title },
    description,
    keywords: meta?.keywords?.length ? meta.keywords : undefined,
    alternates: { canonical: `${SITE_URL}/privacy-policy` },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/privacy-policy`,
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      locale: "tr_TR",
      siteName: "XipSoft",
      images: [{ url: `${SITE_URL}/media/xipsoft-seo.webp`, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function PrivacyPolicyPage() {
  const [t, meta] = await Promise.all([
    getTranslations("privacy"),
    getPageMeta("privacy-policy"),
  ]);

  const jsonLd = corporatePageSchema({
    name: meta?.title || t("title"),
    description: meta?.description || t("description"),
    url: "/privacy-policy",
    breadcrumbs: [
      { name: "Ana Sayfa", url: "/" },
      { name: "Gizlilik Politikası", url: "/privacy-policy" },
    ],
  });

  return (
    <Container withPadding className="py-16 max-w-4xl mx-auto">
      <JsonLd schemas={jsonLd} id="privacy-policy" />
      <div className="space-y-8">
        <div>
          <TitleText tag="h1" variant="glass" className="mb-4">
            {t("title")}
          </TitleText>
          <p className="text-zinc-400 text-sm">{t("lastUpdated")}</p>
        </div>

        <div className="prose prose-inverse max-w-none space-y-6">
          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.introduction.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.introduction.content")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.information.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">{t("sections.information.intro")}</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li>{t("sections.information.items.personal")}</li>
              <li>{t("sections.information.items.technical")}</li>
              <li>{t("sections.information.items.usage")}</li>
              <li>{t("sections.information.items.cookies")}</li>
              <li>{t("sections.information.items.advertising")}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.usage.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">{t("sections.usage.intro")}</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li>{t("sections.usage.items.provide")}</li>
              <li>{t("sections.usage.items.improve")}</li>
              <li>{t("sections.usage.items.personalize")}</li>
              <li>{t("sections.usage.items.communicate")}</li>
              <li>{t("sections.usage.items.advertising")}</li>
              <li>{t("sections.usage.items.security")}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.adsense.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.adsense.content")}
            </p>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.adsense.optout")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.sharing.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">{t("sections.sharing.intro")}</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li>{t("sections.sharing.items.service")}</li>
              <li>{t("sections.sharing.items.advertising")}</li>
              <li>{t("sections.sharing.items.analytics")}</li>
              <li>{t("sections.sharing.items.legal")}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.cookies.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.cookies.content")}
            </p>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.cookies.manage")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.security.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.security.content")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.rights.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">{t("sections.rights.intro")}</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li>{t("sections.rights.items.access")}</li>
              <li>{t("sections.rights.items.correct")}</li>
              <li>{t("sections.rights.items.delete")}</li>
              <li>{t("sections.rights.items.object")}</li>
              <li>{t("sections.rights.items.portable")}</li>
              <li>{t("sections.rights.items.withdraw")}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.children.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.children.content")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.changes.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.changes.content")}
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
