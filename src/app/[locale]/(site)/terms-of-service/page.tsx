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
    getTranslations("terms"),
    getPageMeta("terms-of-service"),
  ]);
  const title = meta?.title || t("title");
  const description = meta?.description || t("description");
  return {
    title: { absolute: title },
    description,
    keywords: meta?.keywords?.length ? meta.keywords : undefined,
    alternates: { canonical: `${SITE_URL}/terms-of-service` },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/terms-of-service`,
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      locale: "tr_TR",
      siteName: "XipSoft",
      images: [{ url: `${SITE_URL}/media/xipsoft-seo.webp`, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function TermsOfServicePage() {
  const [t, meta] = await Promise.all([
    getTranslations("terms"),
    getPageMeta("terms-of-service"),
  ]);

  const jsonLd = corporatePageSchema({
    name: meta?.title || t("title"),
    description: meta?.description || t("description"),
    url: "/terms-of-service",
    breadcrumbs: [
      { name: "Ana Sayfa", url: "/" },
      { name: "Kullanım Şartları", url: "/terms-of-service" },
    ],
  });

  return (
    <Container withPadding className="py-16 max-w-4xl mx-auto">
      <JsonLd schemas={jsonLd} id="terms-of-service" />
      <div className="space-y-8">
        <div>
          <TitleText tag="h1" variant="glass" className="mb-4">
            {t("title")}
          </TitleText>
          <p className="text-zinc-400 text-sm">{t("lastUpdated")}</p>
        </div>

        <div className="prose prose-inverse max-w-none space-y-6">
          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.acceptance.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.acceptance.content")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.services.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.services.content")}
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li>{t("sections.services.items.web")}</li>
              <li>{t("sections.services.items.mobile")}</li>
              <li>{t("sections.services.items.desktop")}</li>
              <li>{t("sections.services.items.consulting")}</li>
              <li>{t("sections.services.items.community")}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.accounts.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">{t("sections.accounts.intro")}</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li>{t("sections.accounts.items.accurate")}</li>
              <li>{t("sections.accounts.items.secure")}</li>
              <li>{t("sections.accounts.items.responsible")}</li>
              <li>{t("sections.accounts.items.notify")}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.intellectual.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.intellectual.content")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.userContent.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">{t("sections.userContent.intro")}</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li>{t("sections.userContent.items.illegal")}</li>
              <li>{t("sections.userContent.items.harmful")}</li>
              <li>{t("sections.userContent.items.infringing")}</li>
              <li>{t("sections.userContent.items.spam")}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.prohibited.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">{t("sections.prohibited.intro")}</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li>{t("sections.prohibited.items.violate")}</li>
              <li>{t("sections.prohibited.items.exploit")}</li>
              <li>{t("sections.prohibited.items.interfere")}</li>
              <li>{t("sections.prohibited.items.unauthorized")}</li>
              <li>{t("sections.prohibited.items.scrape")}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.disclaimer.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.disclaimer.content")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.limitation.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.limitation.content")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.termination.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.termination.content")}
            </p>
          </section>

          <section className="space-y-4">
            <TitleText tag="h2" variant="content" className="text-zinc-100">{t("sections.governing.title")}</TitleText>
            <p className="text-zinc-300 leading-relaxed">
              {t("sections.governing.content")}
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
