"use client";

import Link from "next/link";
import XipIcon from "@/components/Ui/Icon";
import MarkdownContent from "@/components/Common/MarkdownContent/MarkdownContent";
import TitleText from "@/components/Common/TitleText/TitleText";
import FaqSection from "@/components/seo/FaqSection";
import type { CentralLocation, PublishedPage } from "@/lib/pages/types";
import { servicePath } from "@/lib/content-path";

export default function PageTemplate({ page, location }: { page: PublishedPage; location: CentralLocation }) {
  const lokalSss = page.lokalSss ?? [];
  const lokalAciklama = page.lokalAciklama?.trim() || null;

  // Generate breadcrumb items
  const breadcrumbs = [
    { label: "Ana Sayfa", href: "/" },
    { label: location.serviceTitle, href: servicePath(location.serviceSlug) },
    { label: location.locationName, href: undefined },
  ];

  return (
    <main className="min-h-screen bg-brand-neutral-bg text-brand-text-primary">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-container sm:px-6 lg:px-8 py-section-lg lg:py-section-xl">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-secondary/30 to-transparent" />
        
        <div className="relative mx-auto max-w-4xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-brand-text-tertiary">
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumbs.map((item, index) => (
                <li key={item.label} className="flex items-center gap-2">
                  {index > 0 && (
                    <span className="text-brand-text-muted" aria-hidden="true">/</span>
                  )}
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="hover:text-brand-secondary transition-colors duration-fast"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-brand-text-primary font-medium">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Title */}
          <TitleText tag="h1" variant="hero" className="max-w-4xl text-brand-text-primary">
            {page.title}
          </TitleText>

          {/* Meta Description */}
          <p className="mt-6 max-w-3xl text-body-lg leading-8 text-brand-text-secondary">
            {page.metaDescription}
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/contact-us"
              className="site-cta-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-[0_6px_20px_rgba(167, 139, 250,0.14)] transition-all duration-200 hover:-translate-y-0.5"
            >
              Teklif Al
              <XipIcon name="arrow-right" glow="strong" halo="red" className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            </Link>
            <a
              href="https://wa.me/905444548444"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-btn border-2 border-brand-secondary px-6 py-3 text-body-md font-semibold text-brand-secondary hover:bg-brand-secondary hover:text-white transition-all duration-normal"
            >
              <XipIcon name="message-circle" glow="soft" className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              Bize Ulaşın
            </a>
          </div>
        </div>
      </section>

      {/* Local Intro Section - Alternating background */}
      {lokalAciklama && (
        <section className="px-container sm:px-6 lg:px-8 py-section-lg bg-brand-neutral-bgAlt">
          <div className="mx-auto max-w-4xl rounded-card border border-brand-neutral-border bg-brand-neutral-surface p-6 md:p-8">
            <p className="text-body-lg leading-8 text-brand-text-secondary">{lokalAciklama}</p>
          </div>
        </section>
      )}

      {/* Main Content Section */}
      <section className="px-container sm:px-6 lg:px-8 py-section-lg bg-brand-neutral-bg">
        <article className="mx-auto max-w-4xl">
          <div className="rounded-card border border-brand-neutral-border bg-brand-neutral-surface p-6 md:p-8">
            <MarkdownContent content={page.markdownContent} />
          </div>
        </article>
      </section>

      {/* FAQ Section - Alternating background (sayfaya özel veri; yoksa render edilmez) */}
      {lokalSss.length > 0 && (
        <section className="px-container sm:px-6 lg:px-8 py-section-lg lg:py-section-xl bg-brand-neutral-bgAlt">
          <div className="mx-auto max-w-3xl">
            <TitleText tag="h2" variant="brand" className="mb-10 text-center text-brand-text-primary">
              Sıkça Sorulan Sorular
            </TitleText>
            <FaqSection items={lokalSss} showHeading={false} />
          </div>
        </section>
      )}
    </main>
  );
}
