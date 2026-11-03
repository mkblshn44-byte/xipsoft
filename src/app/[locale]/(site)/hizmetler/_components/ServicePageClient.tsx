"use client";
/**
 * ServicePageClient — Hizmet detay + Hizmet×Konum (il/ilçe) için TEK şablon.
 *
 * - `district` yok  → hizmet detay sayfası (/hizmetler/[slug].html)
 * - `district` var  → yerel SEO sayfası (/hizmetler/[slug]/[sehir].html)
 *
 * Mimari: MIMARI.md §3 (şablon–içerik ayrımı) ve "sıfır kod tekrarı" ilkesi.
 * Daha önce `ServicePageClient` + `ServiceDistrictPageClient` ~%90 kopyaydı;
 * bu dosya ikisini birleştirir ve ortak kartları tek seferde tanımlar.
 */

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import XipIcon from "@/components/Ui/Icon";
import { teklifModal } from "@/components/Common/TeklifModal/teklif-modal-store";
import Hero from "@/components/Landing/Hero";
import SectionReveal from "@/components/Ui/SectionReveal/SectionReveal";
import FaqSection from "@/components/seo/FaqSection";
import type { ServicePageData } from "@/lib/db/services";
import type { ServiceDistrict } from "@/types/common";
import IceButton from "@/components/Ui/IceButton/IceButton";
import TechMarquee from "./TechMarquee";

// ─── Ikon haritası ─────────────────────────────────────────────────────────
// XipSoft ÖZEL ikon seti (src/components/Ui/Icon/icon-data.ts). Anahtarlar DB
// `badgeIcon` / içerik jsonb değerleriyle birebir aynı tutulur; listede
// olmayan bir ad geldiğinde `getIcon` güvenli varsayılana ("Globe") düşer.
const SERVICE_ICONS = new Set<string>([
  "Smartphone", "Palette", "Code", "Zap", "Shield", "Layers", "Globe", "Database",
  "Search", "BarChart2", "Monitor", "Terminal", "Cloud", "Lock", "Eye", "FileCheck",
  "AlertTriangle", "Server", "Brain", "Bot", "Workflow", "Cpu", "TrendingUp",
  "Target", "Users", "MousePointer", "GitBranch", "RefreshCw", "Code2", "Link2",
  "Webhook", "GitMerge", "PieChart", "FileText", "Filter", "CheckCircle",
  "ArrowRight", "Package", "MapPin",
]);

/** İkon adını doğrular; bilinmeyen adlarda güvenli varsayılana düşer. */
function getIcon(name: string): string {
  return SERVICE_ICONS.has(name) ? name : "Globe";
}

// ─── Accent rengi çözücü ────────────────────────────────────────────────────
function resolveAccent(badgeColor?: string): string {
  if (!badgeColor) return "#a78bfa";
  if (badgeColor.includes("cyan"))    return "#ddd6fe";
  if (badgeColor.includes("emerald")) return "#ddd6fe";
  if (badgeColor.includes("violet"))  return "#a78bfa";
  if (badgeColor.includes("rose"))    return "#a78bfa";
  return "#a78bfa";
}

// ─── Feature kartı ─────────────────────────────────────────────────────────
const FeatureCard = ({
  icon, title, description, color, index, isInView,
}: {
  icon: string; title: string; description: string;
  color: string; index: number; isInView: boolean;
}) => {
  const iconName = getIcon(icon);
  return (
    <motion.div
      className="group relative flex flex-col gap-4 p-6 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1.5"
      style={{
        background: "var(--color-card-bg)",
        backdropFilter: "var(--glass-blur-card)",
        border: "1px solid var(--color-glass-border)",
      }}
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.55, delay: 0.1 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ boxShadow: `0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px ${color}25` }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-600 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${color}12, transparent 70%)` }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-400"
        style={{ background: `linear-gradient(90deg, transparent, ${color}cc, transparent)` }}
      />
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-400 group-hover:scale-105 relative"
        style={{
          background: `linear-gradient(135deg, ${color}20, ${color}0a)`,
          border: `1px solid ${color}30`,
        }}
      >
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-50 transition-opacity duration-400 blur-lg scale-[1.6] pointer-events-none"
          style={{ background: color }}
        />
        <XipIcon name={iconName} className="w-5 h-5 relative z-10" style={{ color }} strokeWidth={1.6} />
      </div>
      <p className="font-bold text-sm text-zinc-100 group-hover:text-white transition-colors leading-tight">{title}</p>
      <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors leading-relaxed mt-auto">{description}</p>
      <div
        className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-2xl pointer-events-none"
        style={{ background: color }}
      />
    </motion.div>
  );
};

// ─── Process adımı ─────────────────────────────────────────────────────────
const ProcessStep = ({
  step, title, description, color, index, isInView,
}: {
  step: string; title: string; description: string;
  color: string; index: number; isInView: boolean;
}) => (
  <motion.div
    className="relative flex gap-4"
    initial={{ opacity: 0, x: -24 }}
    animate={isInView ? { opacity: 1, x: 0 } : {}}
    transition={{ duration: 0.55, delay: 0.15 + index * 0.1 }}
  >
    {index !== 0 && (
      <div
        className="absolute left-5 -top-6 w-[1px] h-6"
        style={{ background: `linear-gradient(180deg, transparent, ${color}40)` }}
      />
    )}
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
      style={{
        background: `linear-gradient(135deg, ${color}25, ${color}10)`,
        border: `1px solid ${color}40`,
        color,
        boxShadow: `0 0 16px ${color}20`,
      }}
    >
      {step}
    </div>
    <div className="flex-1 pb-6">
      <h4 className="font-bold text-sm text-zinc-100 mb-1.5">{title}</h4>
      <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

// ─── Fiyat paketi kartı ─────────────────────────────────────────────────────
const PackageCard = ({
  name, price, desc, color, popular, features, index, isInView,
}: {
  name: string; price: string; desc: string; color: string;
  popular?: boolean; features: string[]; index: number; isInView: boolean;
}) => (
  <motion.div
    className={`relative flex flex-col p-7 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1.5 ${popular ? "ring-1" : ""}`}
    style={{
      background: popular
        ? `linear-gradient(160deg, ${color}15, var(--color-card-bg))`
        : "var(--color-card-bg)",
      border: popular ? `1px solid ${color}50` : "1px solid var(--color-border)",
    }}
    initial={{ opacity: 0, y: 28, scale: 0.97 }}
    animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
    transition={{ duration: 0.55, delay: 0.15 + index * 0.12 }}
  >
    {popular && (
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
    )}
    {popular && (
      <span
        className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
        style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
      >
        Popüler
      </span>
    )}
    <h3 className="text-lg font-black text-white mb-1">{name}</h3>
    <div
      className="text-3xl font-black mb-1 mt-2"
      style={{ color, filter: `drop-shadow(0 0 12px ${color}50)` }}
    >
      {price}
    </div>
    <p className="text-xs text-zinc-500 mb-6">{desc}</p>
    <ul className="flex flex-col gap-2.5 flex-1 mb-6">
      {features.map((f, j) => (
        <li key={j} className="flex items-start gap-2 text-sm text-zinc-300">
          <XipIcon name="check-circle" className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
          {f}
        </li>
      ))}
    </ul>
    <IceButton label="Teklif Al" service={name} fullWidth />
  </motion.div>
);

// ─── Mikro servis kartı ─────────────────────────────────────────────────────
const MicroServiceCard = ({
  title, keywords, color, description, index, isInView,
}: {
  title: string; keywords: string[]; color: string;
  description: string; index: number; isInView: boolean;
}) => (
  <motion.div
    className="group p-6 rounded-2xl overflow-hidden transition-all duration-400 hover:-translate-y-1"
    style={{
      background: "var(--color-card-bg)",
      border: "1px solid var(--color-border)",
    }}
    initial={{ opacity: 0, y: 24 }}
    animate={isInView ? { opacity: 1, y: 0 } : {}}
    transition={{ duration: 0.5, delay: 0.1 + index * 0.09 }}
    whileHover={{ boxShadow: `0 4px 32px rgba(0,0,0,0.25), 0 0 0 1px ${color}20` }}
  >
    <h3 className="font-bold text-sm text-zinc-100 mb-2 leading-snug" style={{ color }}>
      {title}
    </h3>
    <p className="text-xs text-zinc-500 leading-relaxed mb-4">
      {description.substring(0, 220)}{description.length > 220 ? "…" : ""}
    </p>
    <div className="flex flex-wrap gap-1.5">
      {keywords.slice(0, 5).map((k) => (
        <span
          key={k}
          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{
            background: `${color}0c`,
            border: `1px solid ${color}20`,
            color: `${color}cc`,
          }}
        >
          {k}
        </span>
      ))}
    </div>
  </motion.div>
);

// ─── Yerel içerik kartı (yalnızca konum sayfaları) ──────────────────────────
const LocalIntroCard = ({
  text, cityName, accentColor,
}: {
  text: string; cityName: string; accentColor: string;
}) => (
  <motion.div
    className="relative rounded-2xl overflow-hidden p-7"
    style={{
      background: `linear-gradient(135deg, ${accentColor}08, var(--color-card-bg))`,
      border: `1px solid ${accentColor}20`,
    }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
  >
    <div
      className="absolute top-0 left-0 right-0 h-[2px]"
      style={{ background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }}
    />
    <div className="flex items-center gap-2 mb-4">
      <XipIcon name="map-pin" className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
        {cityName} Bölgesel Bilgi
      </span>
    </div>
    <p className="text-sm text-zinc-400 leading-relaxed">{text}</p>
  </motion.div>
);

// ─── Props ──────────────────────────────────────────────────────────────────
interface Props {
  service: ServicePageData;
  /** Verilirse yerel (il/ilçe) şablonu devreye girer. */
  district?: ServiceDistrict;
  /** Konuma özel yerel giriş metni + SSS. */
  localContent?: {
    lokalAciklama: string;
    sss: Array<{ question: string; answer: string }>;
  } | null;
}

// ─── Ana bilesen ────────────────────────────────────────────────────────────
export default function ServicePageClient({ service, district, localContent }: Props) {
  const featuresRef = useRef(null);
  const processRef  = useRef(null);
  const packagesRef = useRef(null);
  const microRef    = useRef(null);
  const ctaRef      = useRef(null);

  const featuresInView = useInView(featuresRef, { once: true, amount: 0.1 });
  const processInView  = useInView(processRef,  { once: true, amount: 0.15 });
  const packagesInView = useInView(packagesRef, { once: true, amount: 0.1 });
  const microInView    = useInView(microRef,    { once: true, amount: 0.1 });
  const ctaInView      = useInView(ctaRef,      { once: true, amount: 0.3 });

  const primaryColor = resolveAccent(service.badgeColor);

  // Konum varsa başlık ve teklif bağlamına şehir eklenir.
  const pageTitle = district ? `${service.title} ${district.name}` : service.title;

  // Şehre özel SSS varsa onu, yoksa hizmetin genel SSS'ini kullan.
  const faqItems =
    localContent?.sss && localContent.sss.length > 0 ? localContent.sss : service.faqItems;

  const introText = localContent?.lokalAciklama?.trim() || "";

  return (
    <article className="site-ambient-led relative">
      {/* ══ NEON HERO — Semantic HTML: <header> elementi ═════════════════════ */}
      <header className="relative z-10">
        <Hero
          variant="page"
          className="min-h-[70vh]"
          onCtaPrimary={() => teklifModal.open(pageTitle)}
          copy={{
            title: pageTitle,
            subtitle: service.subtitle,
            ctaPrimary: service.heroCta,
            ctaSecondary: "Bize Ulaşın",
            ctaSecondaryHref: "/contact-us",
            stats: service.stats,
          }}
        />
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ══ BÖLGESEL GİRİŞ (yalnızca konum sayfaları) ═════════════════════ */}
        {introText && district && (
          <SectionReveal accentColor={primaryColor}>
            <LocalIntroCard text={introText} cityName={district.name} accentColor={primaryColor} />
          </SectionReveal>
        )}

        {/* ══ ÖZELLIKLER ═════════════════════════════════════════════════ */}
        {service.features.length > 0 && (
          <SectionReveal
            title={service.featuresTitle ?? undefined}
            subtitle={service.featuresDesc ?? undefined}
            accentColor={primaryColor}
            topBorder={!!introText}
          >
            <div ref={featuresRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {service.features.map((f, i) => (
                <FeatureCard
                  key={i}
                  icon={typeof f.icon === "string" ? f.icon : "Globe"}
                  title={f.title}
                  description={f.description}
                  color={f.color}
                  index={i}
                  isInView={featuresInView}
                />
              ))}
            </div>
          </SectionReveal>
        )}

        {/* ══ TEKNOLOJILER ════════════════════════════════════════════════ */}
        {(service.techStack.length > 0 || (service.servicesTag && service.servicesTag.length > 0)) && (
          <SectionReveal
            title={service.techTitle ?? undefined}
            accentColor={primaryColor}
            topBorder
          >
            <TechMarquee
              items={[
                ...(service.techStack ?? []).map((t) => ({ ...t, group: "tech" as const })),
                ...(service.servicesTag ?? []).map((t) => ({ ...t, group: "expertise" as const })),
              ]}
            />
          </SectionReveal>
        )}

        {/* ══ SÜREÇ ════════════════════════════════════════════════════════ */}
        {service.processSteps.length > 0 && (
          <SectionReveal
            title={service.processTitle ?? undefined}
            subtitle={service.processDesc ?? undefined}
            accentColor={primaryColor}
            topBorder
          >
            <div ref={processRef} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0 max-w-3xl mx-auto">
              {service.processSteps.map((p, i) => (
                <ProcessStep
                  key={i}
                  step={p.step}
                  title={p.title}
                  description={p.description}
                  color={p.color}
                  index={i}
                  isInView={processInView}
                />
              ))}
            </div>
          </SectionReveal>
        )}

        {/* ══ PAKETLER ════════════════════════════════════════════════════ */}
        {service.packages.length > 0 && (
          <SectionReveal
            title={service.packagesTitle ?? undefined}
            subtitle={service.packagesDesc ?? undefined}
            accentColor={primaryColor}
            topBorder
          >
            <div ref={packagesRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {service.packages.map((p, i) => (
                <PackageCard
                  key={i}
                  name={p.name}
                  price={p.price}
                  desc={p.desc}
                  color={p.color}
                  popular={p.popular}
                  features={p.features}
                  index={i}
                  isInView={packagesInView}
                />
              ))}
            </div>
          </SectionReveal>
        )}

        {/* ══ MIKRO SERVISLER ════════════════════════════════════════════ */}
        {service.microServices.length > 0 && (
          <SectionReveal
            title={service.microTitle ?? undefined}
            subtitle={service.microDesc ?? undefined}
            accentColor={primaryColor}
            topBorder
          >
            <div ref={microRef} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {service.microServices.map((m, i) => (
                <MicroServiceCard
                  key={i}
                  title={m.title}
                  keywords={m.keywords}
                  color={m.color}
                  description={m.description}
                  index={i}
                  isInView={microInView}
                />
              ))}
            </div>
          </SectionReveal>
        )}

        {/* ══ SSS ════════════════════════════════════════════════════════ */}
        {faqItems.length > 0 && (
          <SectionReveal
            title={service.faqTitle ?? undefined}
            accentColor={primaryColor}
            topBorder
          >
            <FaqSection
              items={faqItems}
              showHeading={false}
              accentColor={primaryColor}
              className="max-w-3xl mx-auto"
            />
          </SectionReveal>
        )}

        {/* ══ CTA ════════════════════════════════════════════════════════ */}
        <motion.section
          ref={ctaRef}
          className="py-20 mb-8"
          initial={{ opacity: 0, y: 24 }}
          animate={ctaInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div
            className="relative rounded-3xl p-10 md:p-16 text-center overflow-hidden"
            style={{
              background: `linear-gradient(160deg, ${primaryColor}10, var(--color-card-bg))`,
              border: `1px solid ${primaryColor}20`,
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at center, ${primaryColor}12 0%, transparent 70%)` }}
            />
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <div
                className="absolute w-[600px] h-[600px] rounded-full"
                style={{
                  left: "50%", top: "50%", transform: "translate(-50%,-50%)",
                  border: `1px solid ${primaryColor}30`,
                }}
              />
              <div
                className="absolute w-[400px] h-[400px] rounded-full"
                style={{
                  left: "50%", top: "50%", transform: "translate(-50%,-50%)",
                  border: `1px solid ${primaryColor}40`,
                }}
              />
            </div>

            <h2
              className="relative z-10 font-black text-3xl md:text-4xl mb-4 brand-gradient-text"
              style={{
                backgroundImage: "linear-gradient(90deg, #ddd6fe 0%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 24px rgba(167, 139, 250,0.20))",
              }}
            >
              {service.ctaTitle}
            </h2>
            <p className="relative z-10 text-zinc-400 max-w-xl mx-auto mb-8 leading-relaxed">
              {service.ctaDesc}
            </p>
            <div className="relative z-10 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => teklifModal.open(pageTitle)}
                className="site-cta-primary px-8 py-3.5 font-bold text-sm transition-all hover:scale-[1.03]"
              >
                {service.ctaBtn} <XipIcon name="arrow-right" className="w-4 h-4" />
              </button>
              <a
                href="https://wa.me/905444548444"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02]"
                style={{
                  background: "var(--color-card-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <XipIcon name="message-circle" className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </div>
        </motion.section>

      </div>
    </article>
  );
}
