"use client";

import { cn } from "@/utils";
import {
  motion,
  useInView,
} from "motion/react";
import { useRef } from "react";
import TitleText from "../Common/TitleText/TitleText";
import BodyText from "../Common/BodyText/BodyText";
import SpacingDivider from "../Common/SpacingDivider/SpacingDivider";
import { Monitor, Smartphone, Cloud, Server } from "lucide-react";
import { useTranslations } from "next-intl";
import { BRAND_COLORS } from "@/config/brand.config";
import { GlassCard } from "@/components/Ui/Card";

// Platform icon/color config
const platformConfigs = [
  { icon: Monitor,    key: "desktop",  color: BRAND_COLORS.secondary },
  { icon: Smartphone, key: "mobile",   color: BRAND_COLORS.primary },
  { icon: Cloud,      key: "cloud",    color: BRAND_COLORS.accent },
  { icon: Server,     key: "backend",  color: BRAND_COLORS.gold },
];

type PlatformData = {
  icon: typeof Monitor;
  label: string;
  color: string;
  description: string;
};

// ─── Platform Card ────────────────────────────────────────
const PlatformCard = ({
  platform,
  index,
  isInView,
}: {
  platform: PlatformData;
  index: number;
  isInView: boolean;
}) => {
  const Icon = platform.icon;
  const c = platform.color;

  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -24 : 24, y: 18, scale: 0.96 }}
      animate={isInView ? { opacity: 1, x: 0, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.7, delay: 0.4 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="relative group h-full"
    >
      <GlassCard
        className="relative flex flex-col items-start gap-5 p-6 md:p-8 cursor-default h-full min-h-[220px] transition-all duration-500 group-hover:-translate-y-1.5"
      >
        {/* Üst renk çizgisi — hover'da beliriyor */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `linear-gradient(90deg, transparent, ${c}dd, transparent)` }}
        />

        {/* Arka plan ambient glow — hover'da beliriyor */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 100% 55% at 50% 0%, ${c}16, transparent 70%)`, transform: "scale(0.98)" }}
        />

        {/* Ikon kutusu */}
        <div
          className="relative flex items-center justify-center w-14 h-14 rounded-2xl flex-shrink-0 transition-all duration-500 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${c}22, ${c}0a)`,
            border: `1px solid ${c}30`,
          }}
        >
          {/* Blur glow arkada */}
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 blur-lg scale-[1.8] pointer-events-none"
            style={{ background: c }}
          />
          <Icon className="w-6 h-6 relative z-10" style={{ color: c }} />
        </div>

        {/* Etiket */}
        <p className="text-[15px] font-bold text-zinc-100 group-hover:text-white transition-colors duration-300 tracking-wide leading-tight">
          {platform.label}
        </p>

        {/* Açıklama */}
        <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300 leading-relaxed mt-auto">
          {platform.description}
        </p>

        {/* Alt sag köse dekor */}
        <div
          className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl pointer-events-none"
          style={{ background: c }}
        />
      </GlassCard>
    </motion.div>
  );
};

// ─── Main ─────────────────────────────────────────────────
const SectionHeader = ({
  isInView,
  t,
}: {
  isInView: boolean;
  t: ReturnType<typeof useTranslations>;
}) => (
  <div className="max-w-[860px] text-center mx-auto px-5">
    {/* Badge */}
    <motion.div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm mb-6"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        <Server className="w-3.5 h-3.5 text-prism-rose" />
      </motion.div>
      <span className="font-mono text-xs text-zinc-400 tracking-wider uppercase">
        {t("badge")}
      </span>
    </motion.div>

    {/* Title */}
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <TitleText tag="h2" className="text-3xl md:text-4xl font-bold mb-5">
        <span className="text-zinc-100">{t("title.prefix")}</span>
        {t("title.highlight") && (
          <span className="bg-prism-gradient bg-clip-text text-transparent">
            {t("title.highlight")}
          </span>
        )}
      </TitleText>
    </motion.div>

    {/* Description */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <BodyText className="text-base text-zinc-400 leading-relaxed max-w-2xl mx-auto">
        {t("description.intro")}
        <span className="text-prism-cyan font-medium">{t("description.desktop")}</span>,{" "}
        <span className="text-prism-violet font-medium">{t("description.mobile")}</span>,{" "}
        <span className="text-prism-rose font-medium">{t("description.cloud")}</span>,{" "}
        <span className="text-accent-gold font-medium">{t("description.backend")}</span>
        {t("description.outro")}
      </BodyText>
    </motion.div>
  </div>
);

// ─── Prism Divider ────────────────────────────────────────
const PrismDivider = ({ isInView }: { isInView: boolean }) => (
  <motion.div
    className="relative h-[1px] max-w-xs mx-auto overflow-hidden rounded-full"
    initial={{ scaleX: 0, opacity: 0 }}
    animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
    transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
    style={{ transformOrigin: "center" }}
  >
    <div className="absolute inset-0 bg-prism-gradient opacity-40" />
    <motion.div
      className="absolute top-0 w-12 h-full rounded-full"
      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)" }}
      animate={{ x: ["-48px", "320px"] }}
      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
    />
  </motion.div>
);

// ─── Main ─────────────────────────────────────────────────
const PlatformSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.2, once: true });
  const t = useTranslations("platform");

  const platforms: PlatformData[] = platformConfigs.map((cfg) => ({
    icon: cfg.icon,
    color: cfg.color,
    label: t(`${cfg.key}.label`),
    description: t(`${cfg.key}.description`),
  }));

  return (
    <div ref={ref} className="relative py-10">
      <SectionHeader isInView={isInView} t={t} />

      <SpacingDivider size="base" />
      <PrismDivider isInView={isInView} />
      <SpacingDivider size="base" />

      {/* Platform cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 max-w-5xl mx-auto px-4 md:px-8">
        {platforms.map((platform, index) => (
          <PlatformCard
            key={platform.label}
            platform={platform}
            index={index}
            isInView={isInView}
          />
        ))}
      </div>

      <SpacingDivider size="lg" />
      <SpacingDivider size="lg" />
    </div>
  );
};

export default PlatformSection;
