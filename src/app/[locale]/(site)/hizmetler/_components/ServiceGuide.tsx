import type { ServiceGuideData } from "@/lib/db/services";

/**
 * ServiceGuide — hizmet sayfasının opsiyonel uzun rehber bölümü.
 *
 * İçerik tamamen `services.guide` (jsonb) alanından gelir; admin panelinden
 * düzenlenir/silinir. Kodda sabit metin yoktur — alan boşsa bölüm render edilmez.
 */
export default function ServiceGuide({ guide }: { guide: ServiceGuideData }) {
  const principles = guide.principles ?? [];
  const processIntro = guide.processIntro ?? [];
  const processSteps = guide.processSteps ?? [];
  const faq = guide.faq ?? [];

  const isEmpty =
    !guide.title &&
    !guide.intro &&
    principles.length === 0 &&
    processSteps.length === 0 &&
    !guide.seoText &&
    faq.length === 0;
  if (isEmpty) return null;

  return (
    <section
      aria-labelledby="web-tasarim-rehberi"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20"
    >
      {(guide.eyebrow || guide.title || guide.intro) && (
        <div className="max-w-3xl mb-12">
          {guide.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400 mb-3">
              {guide.eyebrow}
            </p>
          )}
          {guide.title && (
            <h2 id="web-tasarim-rehberi" className="text-3xl md:text-4xl font-black text-white mb-5 brand-gradient-text">
              {guide.title}
            </h2>
          )}
          {guide.intro && <p className="text-zinc-400 leading-8">{guide.intro}</p>}
        </div>
      )}

      {principles.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 mb-16">
          {principles.map((principle, index) => (
            <article
              key={index}
              className="rounded-2xl p-6 md:p-7"
              style={{
                background: "var(--color-card-bg)",
                border: "1px solid var(--color-border)",
              }}
            >
              <p className="text-xs font-mono text-violet-400 mb-3">0{index + 1}</p>
              <h3 className="text-lg font-bold text-white mb-2">{principle.title}</h3>
              <p className="text-sm text-zinc-400 leading-7">{principle.description}</p>
            </article>
          ))}
        </div>
      )}

      {(guide.processTitle || processIntro.length > 0 || processSteps.length > 0) && (
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] mb-16">
          <div>
            {guide.processTitle && (
              <h2 className="text-2xl md:text-3xl font-black text-white mb-5 brand-gradient-text">{guide.processTitle}</h2>
            )}
            {processIntro.map((paragraph, index) => (
              <p key={index} className={index === 0 ? "text-zinc-400 leading-8" : "text-zinc-400 leading-8 mt-4"}>
                {paragraph}
              </p>
            ))}
          </div>

          {processSteps.length > 0 && (
            <ol className="space-y-6">
              {processSteps.map((step, index) => (
                <li key={index} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-violet-300"
                    style={{
                      background: "rgba(42, 111, 212, 0.12)",
                      border: "1px solid rgba(42, 111, 212, 0.25)",
                    }}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-white mb-1">{step.title}</h3>
                    <p className="text-sm text-zinc-400 leading-7">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {(guide.seoTitle || guide.seoText) && (
        <div className="max-w-3xl mb-12">
          {guide.seoTitle && (
            <h2 className="text-2xl md:text-3xl font-black text-white mb-5 brand-gradient-text">{guide.seoTitle}</h2>
          )}
          {guide.seoText && <p className="text-zinc-400 leading-8">{guide.seoText}</p>}
        </div>
      )}

      {faq.length > 0 && (
        <div>
          {guide.faqTitle && (
            <h2 className="text-2xl md:text-3xl font-black text-white mb-6 brand-gradient-text">{guide.faqTitle}</h2>
          )}
          <div className="max-w-3xl divide-y divide-white/10 border-y border-white/10">
            {faq.map((item, index) => (
              <details key={index} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-zinc-100">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="text-xl text-violet-400 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pt-3 pr-8 text-sm leading-7 text-zinc-400">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
