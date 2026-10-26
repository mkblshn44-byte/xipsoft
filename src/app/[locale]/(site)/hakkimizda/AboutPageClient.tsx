"use client";

/**
 * AboutPageClient — Hakkımızda sayfasının TEK istemci dosyası.
 *
 * MIMARI.md tek-şablon/SRP ilkesi gereği daha önce `components/` altına dağılmış
 * tüm bölümler (AboutHero, SectionHeading, AboutMissionVision, AboutCTA,
 * AboutAddress) bu dosyada birleştirildi. Dağınık `components/` klasörü kaldırıldı.
 *
 * Neden istemci? `motion` / `useInView` giriş animasyonları, `useTranslations`
 * ve `teklifModal` (küresel modal) istemci gerektirir. SEO metadata'sı ise
 * `page.tsx` (sunucu) içinde `generateMetadata` ile üretilir.
 *
 * İçerik kaynağı: tüm metinler DB'den (`getPageMeta("hakkimizda")` → `hero`
 * ve `sections`) ezilebilir; DB boşsa kod içi varsayılanlar (mevcut metinler)
 * render edilir. Böylece tasarım ve varsayılan içerik birebir korunur.
 */

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import Link from "next/link";
import XipIcon from "@/components/Ui/Icon";
import { useTranslations } from "next-intl";
import type { ComponentPropsWithoutRef } from "react";
import Hero, { type HeroStat } from "@/components/Landing/Hero";
import WhyXipsoft from "@/components/MSE/WhyXipsoft";
import missionVisionStyles from "./MissionVisionBackground.module.css";
import { GlassCard } from "@/components/Ui/Card";
import TitleText from "@/components/Common/TitleText/TitleText";
import { teklifModal } from "@/components/Common/TeklifModal/teklif-modal-store";
import { BRAND_COMPANY } from "@/config/brand.config";
import type { HomeHeroCopy } from "@/types/common";
import { cn } from "@/utils";

// ── Dil desteği (DB) ─────────────────────────────────────────────────────────
// `page.tsx`, `getPageMeta("hakkimizda")` çıktısını bu iki prop ile geçirir.
// Hepsi opsiyoneldir; verilmezse aşağıdaki varsayılanlar kullanılır.
export interface AboutSections {
  hero?: {
    titleLine1?: string;
    titleLine2?: string;
    subtitle?: string;
    stats?: HeroStat[];
  };
  mission?: {
    title?: string;
    subtitle?: string;
    cards?: Array<{ title?: string; text?: string; items?: string[] }>;
  };
  cta?: {
    title?: string;
    text?: string;
    primary?: string;
    secondary?: string;
  };
}

interface AboutPageClientProps {
  /** DB `metadata.hero` (anasayfa ile aynı sözleşme). */
  heroCopy?: Partial<HomeHeroCopy>;
  /** DB `metadata.sections` — bölüm metinleri. */
  sections?: AboutSections;
}

// ── Varsayılan içerik (DB boşsa gösterilir) ──────────────────────────────────

const DEFAULT_HERO = {
  titleLine1: "XipSoft — 15 Yıllık",
  titleLine2: "Dijital Dönüşüm",
  subtitle:
    "2010'dan bu yana web, mobil, masaüstü, siber güvenlik ve dijital pazarlama alanlarında 200'den fazla proje tamamladık. Her satır kod, güvenin bir parçasıdır.",
};

const DEFAULT_STATS: HeroStat[] = [
  { value: "15+", label: "Yıl Deneyim" },
  { value: "200+", label: "Proje" },
  { value: "150+", label: "Müşteri" },
  { value: "10+", label: "Ülke" },
];

interface MissionCard {
  /** XipSoft özel ikon adı. */
  icon: string;
  title: string;
  accent: AccentName;
  text: string;
  items: string[];
}

const DEFAULT_CARDS: MissionCard[] = [
  {
    icon: "target",
    title: "Misyonumuz",
    accent: "cyan",
    text: "Müşterilerimizin dijital dönüşüm süreçlerini en verimli, güvenli ve sürdürülebilir şekilde yönetmelerine yardımcı olmak temel misyonumuzdur.",
    items: [
      "Kalite standartlarına bağlı kalmak",
      "Şeffaf iletişim ve raporlama",
      "Güvenlik odaklı geliştirme",
      "Sürekli iyileştirme prensibi",
      "Müşteri memnuniyetini önceliklendirmek",
    ],
  },
  {
    icon: "star",
    title: "Vizyonumuz",
    accent: "neon",
    text: "Türkiye'nin ve bölgenin en güvenilir yazılım şirketlerinden biri olarak müşterilerimizin ilk tercih ettiği teknoloji ortağı olmak.",
    items: [
      "Türkiye'nin en güvenilir teknoloji şirketi",
      "Bölgenin önde gelen iş ortağı",
      "Sürdürülebilir teknoloji yatırımları",
      "Geleceğe hazırlayan çözümler",
      "Küresel ölçekte hizmet kalitesi",
    ],
  },
];

const DEFAULT_CTA = {
  title: "Geleceği Birlikte İnşa Edelim",
  text: "İster yeni bir girişim olun, ister kurumsal ölçekte faaliyet gösteren bir şirket — dijital dönüşüm yolculuğunuzda güvenilir teknoloji partneriniz olmaya hazırız.",
  primary: "Ücretsiz Teklif Al",
  secondary: "İletişime Geç",
};

/** DB `hero` içindeki stat* alanlarından istatistik şeridi türetir. */
function statsFromHeroCopy(copy?: Partial<HomeHeroCopy>): HeroStat[] | null {
  if (!copy) return null;
  const { statYears, statProjects, statClients, statServices } = copy;
  if (!statYears && !statProjects && !statClients && !statServices) return null;
  return [
    { value: statYears || DEFAULT_STATS[0].value, label: "Yıl Deneyim" },
    { value: statProjects || DEFAULT_STATS[1].value, label: "Proje" },
    { value: statClients || DEFAULT_STATS[2].value, label: "Müşteri" },
    { value: statServices || DEFAULT_STATS[3].value, label: "Hizmet" },
  ];
}

// ── SectionHeading (eski components/SectionHeading.tsx) ──────────────────────

/** Desteklenen vurgu renkleri — colors-glass.css içindeki aksan yardımcıları. */
export type AccentName = "neon" | "cyan" | "rose" | "gold";

/**
 * Aksan adı → CSS değişkenlerini set eden yardımcı sınıf.
 * Bileşenler ham renk kodu yerine bu sınıfı + Tailwind arbitrary value kullanır.
 */
export const ACCENT_CLASS: Record<AccentName, string> = {
  neon: "accent-neon",
  cyan: "accent-cyan",
  rose: "accent-rose",
  gold: "accent-gold",
};

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  /** Vurgu rengi anahtarı (merkezi aksan yardımcıları). */
  accent?: AccentName;
  isInView: boolean;
  delay?: number;
  tag?: ComponentPropsWithoutRef<typeof TitleText>["tag"];
}

/**
 * Hakkımızda sayfası section başlığı.
 * Motion fade-up + aksan gradient divider çizgisi.
 * Tüm stiller merkezi token'lardan gelir; inline stil YOKTUR.
 */
function SectionHeading({
  title,
  subtitle,
  accent = "neon",
  isInView,
  delay = 0,
  tag = "h2",
}: SectionHeadingProps) {
  return (
    <motion.div
      className={cn("text-center mb-12", ACCENT_CLASS[accent])}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <TitleText tag={tag} variant="brand" className="mb-3">
        {title}
      </TitleText>

      {/* Aksan gradient divider çizgisi */}
      <div className="flex justify-center mb-3">
        <div className="h-[1.5px] w-16 rounded-full bg-gradient-to-r from-transparent via-[color:var(--accent-line)] to-transparent" />
      </div>

      {subtitle && (
        <p className="text-ink-muted max-w-lg mx-auto text-sm leading-relaxed">{subtitle}</p>
      )}
    </motion.div>
  );
}

// ── Alt bölümler ─────────────────────────────────────────────────────────────

/** Üst alan — parallax hero (eski components/AboutHero.tsx). */
function AboutHero({
  copy,
  stats,
}: {
  copy: typeof DEFAULT_HERO;
  stats: HeroStat[];
}) {
  return (
    <Hero
      variant="page"
      copy={{
        titleLine1: copy.titleLine1,
        titleLine2: copy.titleLine2,
        subtitle: copy.subtitle,
        stats,
      }}
    />
  );
}

/** Misyon & vizyon grid'i (eski components/AboutMissionVision.tsx). */
function AboutMissionVision({
  title,
  subtitle,
  cards,
}: {
  title: string;
  subtitle?: string;
  cards: MissionCard[];
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      ref={ref}
      className={cn(
        "relative isolate overflow-hidden py-20 lg:py-28 border-t border-edge",
        missionVisionStyles.section,
      )}
    >
      <div className={missionVisionStyles.backdrop} aria-hidden="true">
        <span className={missionVisionStyles.glow} />
        <span className={missionVisionStyles.orbit} />
        <span className={missionVisionStyles.orbitInner} />
        <span className={missionVisionStyles.signalLine} />
      </div>

      <div className="relative z-10">
        <SectionHeading title={title} subtitle={subtitle} isInView={isInView} />

        <div className="grid gap-5 lg:grid-cols-2">
          {cards.map((card, i) => {
            return (
              <motion.div
                key={card.title}
                className="group relative"
                initial={{ opacity: 0, x: i === 0 ? -28 : 28, y: 16, scale: 0.97 }}
                animate={isInView ? { opacity: 1, x: 0, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                <GlassCard
                  className={cn(
                    "relative p-8 overflow-hidden transition-all duration-500 hover:-translate-y-1.5",
                    ACCENT_CLASS[card.accent],
                  )}
                >
                  {/* Hover üst vurgu çizgisi */}
                  <div className="absolute inset-x-0 top-0 h-[1.5px] rounded-t-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-r from-transparent via-[color:var(--accent-line)] to-transparent" />
                  {/* Hover iç glow */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-700 group-hover:opacity-100 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,var(--accent-soft),transparent_70%)]" />
                  {/* Köşe orb */}
                  <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[var(--accent)] opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100 pointer-events-none" />

                  {/* Başlık */}
                  <div className="relative z-10 mb-4 flex items-center gap-3">
                    <div className="icon-backlight flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)]">
                      <XipIcon name={card.icon} glow="strong" className="h-5 w-5 text-[color:var(--accent)]" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-wide text-[color:var(--accent)]">
                      {card.title}
                    </h3>
                  </div>

                  <p className="relative z-10 mb-5 text-sm leading-relaxed text-ink-muted">
                    {card.text}
                  </p>

                  <ul className="relative z-10 space-y-2">
                    {card.items.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-sm text-ink-secondary">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Dekoratif eş merkezli halkalar — ölçü/sınır sınıfları (inline stil yok). */
const RINGS = [
  { key: "outer", size: "h-[500px] w-[500px]", border: "border-neon-500/30" },
  { key: "inner", size: "h-[340px] w-[340px]", border: "border-neon-500/40" },
] as const;

/** Kapanış CTA bölümü (eski components/AboutCTA.tsx). */
function AboutCTA({ cta }: { cta: typeof DEFAULT_CTA }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.section
      ref={ref}
      className="accent-neon mb-12 border-t border-edge py-20"
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
    >
      <div className="relative overflow-hidden rounded-3xl border border-neon-500/[0.18] bg-gradient-to-br from-neon-500/[0.08] to-white/[0.03] p-10 text-center md:p-16">
        {/* Merkez glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--accent-soft),transparent_70%)]" />

        {/* Dekoratif halkalar */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15">
          {RINGS.map((ring) => (
            <div
              key={ring.key}
              className={cn(
                "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border",
                ring.size,
                ring.border,
              )}
            />
          ))}
        </div>

        <TitleText tag="h2" variant="brand" className="relative z-10 mb-4">
          {cta.title}
        </TitleText>

        <p className="relative z-10 mx-auto mt-4 max-w-2xl leading-relaxed text-ink-secondary">
          {cta.text}
        </p>

        <div className="relative z-10 mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={() => teklifModal.open()}
            className="site-cta-primary px-8 py-3.5 text-sm font-bold transition-transform hover:scale-[1.03]"
          >
            {cta.primary} <XipIcon name="arrow-right" glow="strong" halo="red" className="h-4 w-4" />
          </button>
          <Link
            href="/contact-us"
            className="site-cta-secondary px-8 py-3.5 text-sm font-semibold transition-transform hover:scale-[1.02]"
          >
            {cta.secondary}
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

/** Adres & iletişim (eski components/AboutAddress.tsx). */
function AboutAddress() {
  return (
    <address className="not-italic grid gap-6 border-t border-edge pt-8 pb-16 text-sm text-ink-muted sm:grid-cols-2">
      <div>
        <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-ink-secondary">
          Adres
        </p>
        <p className="leading-relaxed">{BRAND_COMPANY.address}</p>
      </div>
      <div>
        <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-ink-secondary">
          İletişim
        </p>
        <a href={`mailto:${BRAND_COMPANY.email}`} className="block transition-colors hover:text-ink">
          {BRAND_COMPANY.email}
        </a>
        <a
          href={`tel:${BRAND_COMPANY.phone}`}
          className="block transition-colors hover:text-ink"
        >
          {BRAND_COMPANY.phone}
        </a>
        <p className="mt-1 text-ink-dim">{BRAND_COMPANY.workingHours}</p>
      </div>
    </address>
  );
}

// ── Ana bileşen ──────────────────────────────────────────────────────────────

/**
 * Hakkımızda sayfası — sade iskelet (tek dosya).
 * Bölümler tek sorumluluklu iç fonksiyonlara ayrılmıştır:
 *   AboutHero          → üst alan (parallax hero)
 *   WhyXipsoft         → neden biz / uzmanlık / değerler (MSE modülü)
 *   AboutMissionVision → misyon & vizyon grid'i
 *   AboutCTA           → kapanış CTA
 *   AboutAddress       → adres & iletişim
 */
export default function AboutPageClient({ heroCopy, sections }: AboutPageClientProps) {
  const tAbout = useTranslations("about");

  // DB değerleri varsa kod içi varsayılanları ezer.
  const hero = { ...DEFAULT_HERO, ...heroCopy, ...sections?.hero };
  const stats =
    sections?.hero?.stats ?? statsFromHeroCopy(heroCopy) ?? DEFAULT_STATS;

  const cards: MissionCard[] = DEFAULT_CARDS.map((card, i) => {
    const override = sections?.mission?.cards?.[i];
    return {
      ...card,
      title: override?.title ?? card.title,
      text: override?.text ?? card.text,
      items: override?.items?.length ? override.items : card.items,
    };
  });

  const cta = { ...DEFAULT_CTA, ...sections?.cta };

  return (
    <div className="min-h-screen">
      <AboutHero copy={hero} stats={stats} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <WhyXipsoft />
        <AboutMissionVision
          title={sections?.mission?.title ?? tAbout("mission.title")}
          subtitle={sections?.mission?.subtitle ?? tAbout("mission.subtitle")}
          cards={cards}
        />
        <AboutCTA cta={cta} />
        <AboutAddress />
      </div>
    </div>
  );
}
