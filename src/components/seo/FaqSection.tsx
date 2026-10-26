"use client";

/**
 * FaqSection — Sitedeki TEK ortak SSS (FAQ) bileşeni.
 *
 * Mimari:
 *   - Her sayfaya aynı jenerik listeyi basmak yerine, bileşen yalnızca
 *     kendisine verilen SAYFAYA ÖZEL veriyi render eder.
 *   - `items` boş/undefined ise HİÇBİR ŞEY render etmez (`null`). Böylece
 *     veritabanında SSS verisi olmayan sayfalarda SSS alanı görünmez.
 *   - Veri kaynakları çağıran sayfa tarafından belirlenir:
 *       • `services.faq_items` (JSONB)         → hizmet/şehir sayfaları
 *       • `xip_dynamic_content` page_faq       → anasayfa, iletişim, blog, özel sayfa
 *       • `xip_dynamic_content` content_type='faq' → hizmetler hub (merkezi SSS)
 *
 * SEO notu: FAQPage JSON-LD varsayılan olarak sayfa düzeyinde (`JsonLd` +
 * `faqSchema`) üretilir. Bu yüzden burada `includeSchema` varsayılan `false`
 * bırakılmıştır; mükerrer schema üretimini önler.
 */

import React, { useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import XipIcon from "@/components/Ui/Icon";
import { cn } from "@/utils";
import { faqSchema } from "@/lib/schema/site";
import { ldJson } from "@/lib/ld-json";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqSectionProps {
  /** Soru-cevap listesi. Boş/undefined ise bileşen hiçbir şey render etmez. */
  items: FaqItem[] | null | undefined;
  title?: string;
  subtitle?: string;
  /** Başlık üstündeki küçük etiket (ör. "Merak Edilenler"). */
  eyebrow?: string;
  /** false → yalnızca akordiyon listesi render edilir (başlık üst bileşende). */
  showHeading?: boolean;
  /** Vurgu rengi (chevron + aktif kenar). */
  accentColor?: string;
  className?: string;
  id?: string;
  /**
   * Sayfa düzeyinde FAQPage JSON-LD zaten üretiliyorsa false bırakılır
   * (mükerrer schema'yı önlemek için varsayılan false).
   */
  includeSchema?: boolean;
}

const DEFAULT_ACCENT = "#a78bfa";

export function FaqSection({
  items,
  title = "Sıkça Sorulan Sorular",
  subtitle,
  eyebrow,
  showHeading = true,
  accentColor,
  className,
  id,
  includeSchema = false,
}: FaqSectionProps) {
  const generatedId = useId();
  const sectionId = id ?? `faq-${generatedId}`;

  // Veri yoksa veya tüm kayıtlar boşsa hiçbir şey render etme.
  const list = (items ?? []).filter(
    (item) => Boolean(item?.question?.trim()) && Boolean(item?.answer?.trim()),
  );
  if (list.length === 0) return null;

  const accent = accentColor || DEFAULT_ACCENT;

  return (
    <>
      {includeSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson(faqSchema(list)) }}
        />
      )}

      <section
        id={sectionId}
        className={cn("faq-section w-full", className)}
        aria-labelledby={showHeading ? `${sectionId}-title` : undefined}
      >
        {showHeading && (
          <div className="mb-10 text-center">
            {eyebrow && (
              <span
                className="mb-2 block font-mono text-xs font-semibold uppercase tracking-widest"
                style={{ color: accent }}
              >
                {eyebrow}
              </span>
            )}
            <h2
              id={`${sectionId}-title`}
              className="mb-3 text-2xl font-extrabold text-white sm:text-3xl brand-gradient-text"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {list.map((item, index) => (
            <FaqAccordionItem
              key={`${index}-${item.question}`}
              question={item.question}
              answer={item.answer}
              accentColor={accent}
            />
          ))}
        </div>
      </section>
    </>
  );
}

/** Geriye dönük uyumluluk için alternatif isim. */
export function FAQSection(props: FaqSectionProps) {
  return <FaqSection {...props} />;
}

export default FaqSection;

function FaqAccordionItem({
  question,
  answer,
  accentColor,
}: {
  question: string;
  answer: string;
  accentColor: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div
      className="overflow-hidden rounded-2xl transition-colors"
      style={{
        border: isOpen ? `1px solid ${accentColor}40` : "1px solid rgba(255,255,255,0.08)",
        background: isOpen
          ? `${accentColor}0a`
          : "var(--color-card-bg, rgba(24,24,27,0.5))",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-semibold text-zinc-200 transition-colors hover:text-white sm:text-base"
      >
        <span>{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <XipIcon name="chevron-down" glow="soft" className="h-4 w-4" style={{ color: accentColor }} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="border-t border-white/[0.04] px-5 pb-5 pt-4 text-xs leading-relaxed text-zinc-400 sm:text-sm">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
