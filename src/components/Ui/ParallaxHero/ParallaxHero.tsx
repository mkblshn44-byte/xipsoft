"use client";
/**
 * ParallaxHero — geometrik / 3D grid tasarım
 * - Perspektif derinligi olan yatay grid zemin
 * - Mouse hareketi ile hafif 3D tilt
 * - Köse diamond aksanları
 * - accentColor / secondaryColor ile sayfa bazlı renk destegi
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/utils";
import { BRAND_COLORS } from "@/config/brand.config";
import { defaultParallaxHeroCta } from "./defaultHeroCta";

interface ParallaxHeroProps {
  title: string;
  titlegradient?: string;
  subtitle?: string;
  accentColor?: string;
  secondaryColor?: string;
  ctaPrimary?: { label: string; onClick: () => void };
  ctaSecondary?: { label: string; href: string };
  stats?: { value: string; label: string }[];
  className?: string;
  children?: React.ReactNode;
}

function Starfield({ count = 60 }: { count?: number }) {
  const stars = Array.from({ length: count }, (_, index) => ({
    id: index,
    left: `${(index * 19 + (index % 6) * 7) % 100}%`,
    top: `${(index * 23 + (index % 4) * 11) % 100}%`,
    size: `${(index % 3 + 1) * 1.1}px`,
    opacity: 0.2 + ((index * 5) % 10) / 18,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <span
          key={star.id}
          className="absolute rounded-full bg-white/80 animate-pulse"
          style={{ left: star.left, top: star.top, width: star.size, height: star.size, opacity: star.opacity }}
        />
      ))}
    </div>
  );
}

// ── Köse Diamond Aksanı ───────────────────────────────────────────────────
function CornerDiamond({
  color,
  position,
}: {
  color: string;
  position: "tl" | "tr" | "bl" | "br";
}) {
  const posClass = {
    tl: "top-8 left-8",
    tr: "top-8 right-8",
    bl: "bottom-8 left-8",
    br: "bottom-8 right-8",
  }[position];

  return (
    <motion.div
      className={cn("absolute pointer-events-none", posClass)}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.8, ease: "backOut" }}
    >
      <div
        className="w-3 h-3 rotate-45"
        style={{
          background: color,
          boxShadow: `0 0 12px ${color}, 0 0 24px ${color}60`,
        }}
      />
    </motion.div>
  );
}

// ── Yatay Isık Çizgisi ───────────────────────────────────────────────────
function ScanLine({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <motion.div
      className="absolute left-0 right-0 pointer-events-none"
      style={{ height: 1, background: `linear-gradient(90deg, transparent 0%, ${color}50 30%, ${color}90 50%, ${color}50 70%, transparent 100%)` }}
      initial={{ top: "100%", opacity: 0 }}
      animate={{ top: "-5%", opacity: [0, 1, 1, 0] }}
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        repeatDelay: 5,
        ease: "linear",
        opacity: { times: [0, 0.05, 0.9, 1] },
      }}
    />
  );
}

// ── Istatistik ─────────────────────────────────────────────────────────────
function StatItem({
  value,
  label,
  color,
  index,
}: {
  value: string;
  label: string;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.65 + index * 0.1 }}
    >
      <span
        className="font-black text-2xl md:text-3xl leading-none tabular-nums"
        style={{
          background: `linear-gradient(135deg, #fff 20%, ${color} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: `drop-shadow(0 0 10px ${color}70)`,
        }}
      >
        {value}
      </span>
      <span className="text-zinc-500 text-xs font-medium tracking-widest uppercase">
        {label}
      </span>
    </motion.div>
  );
}

// ── Ana Bilesen ────────────────────────────────────────────────────────────
export default function ParallaxHero({
  title,
  subtitle,
  accentColor = BRAND_COLORS.primary,
  secondaryColor = BRAND_COLORS.secondary,
  ctaPrimary,
  ctaSecondary,
  stats,
  className,
  children,
}: ParallaxHeroProps) {
  const [mounted, setMounted] = useState(false);
  const heroCtaPrimary = ctaPrimary ?? defaultParallaxHeroCta.ctaPrimary;
  const heroCtaSecondary = ctaSecondary ?? defaultParallaxHeroCta.ctaSecondary;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("relative overflow-hidden min-h-[62vh] flex items-center", className)}>
      <Starfield count={60} />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, transparent 55%, rgba(2,6,23,0.06) 100%)",
        }}
      />

      {mounted && (
        <>
          <ScanLine color={accentColor} delay={0.5} />
          <ScanLine color={secondaryColor} delay={4.5} />
        </>
      )}

      {mounted && (
        <>
          <CornerDiamond color={accentColor} position="tl" />
          <CornerDiamond color={secondaryColor} position="tr" />
          <CornerDiamond color={`${accentColor}80`} position="bl" />
          <CornerDiamond color={`${secondaryColor}80`} position="br" />
        </>
      )}

      <div
        className="absolute top-0 bottom-0 left-0 w-px pointer-events-none"
        style={{ background: `linear-gradient(to bottom, transparent, ${accentColor}40, transparent)` }}
      />
      <div
        className="absolute top-0 bottom-0 right-0 w-px pointer-events-none"
        style={{ background: `linear-gradient(to bottom, transparent, ${secondaryColor}30, transparent)` }}
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <h1
          className="text-center font-black tracking-tight leading-[1.06]"
          style={{ fontSize: "clamp(2.4rem, 7vw, 5.2rem)" }}
        >
          <span
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 30%, #e2e8f0 50%, #f1f5f9 70%, #ffffff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 24px rgba(255,255,255,0.18)) drop-shadow(0 0 12px rgba(148,163,184,0.10))",
            }}
          >
            {title}
          </span>
        </h1>

        <motion.div
          className="flex justify-center items-center gap-2 mt-5 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <div className="h-px flex-1 max-w-[80px]" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}80)` }} />
          <div className="w-1.5 h-1.5 rotate-45" style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
          <div className="h-px w-16" style={{ background: `${accentColor}60` }} />
          <div className="w-1 h-1 rotate-45" style={{ background: secondaryColor, boxShadow: `0 0 6px ${secondaryColor}` }} />
          <div className="h-px flex-1 max-w-[80px]" style={{ background: `linear-gradient(90deg, ${secondaryColor}80, transparent)` }} />
        </motion.div>

        {subtitle && (
          <motion.p
            className="text-center text-zinc-400 max-w-2xl mx-auto leading-relaxed"
            style={{ fontSize: "clamp(0.9rem, 1.8vw, 1.1rem)" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.32 }}
          >
            {subtitle}
          </motion.p>
        )}

        {(heroCtaPrimary || heroCtaSecondary) && (
          <motion.div
            className="flex flex-wrap justify-center gap-4 mt-9"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.48 }}
          >
            {heroCtaPrimary && (
              <button
                onClick={heroCtaPrimary.onClick}
                className="site-cta-primary relative px-7 py-3.5 font-bold text-sm transition-all hover:scale-[1.03]"
              >
                <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                <span className="relative z-10">{heroCtaPrimary.label}</span>
              </button>
            )}
            {heroCtaSecondary && (
              <a
                href={heroCtaSecondary.href}
                className="inline-flex items-center gap-2 px-7 py-3.5 font-semibold text-sm text-white/90 transition-all hover:scale-[1.02]"
                style={{
                  border: `1px solid ${accentColor}35`,
                  background: `${accentColor}08`,
                  boxShadow: `0 0 18px ${accentColor}12, inset 0 1px 0 rgba(255,255,255,0.06)`,
                  backdropFilter: "blur(12px)",
                  clipPath:
                    "polygon(10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0% calc(100% - 10px), 0% 10px)",
                }}
              >
                {heroCtaSecondary.label}
              </a>
            )}
          </motion.div>
        )}

        {stats && stats.length > 0 && (
          <motion.div
            className="flex flex-wrap justify-center gap-10 mt-10 pt-8"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            {stats.map((s, i) => (
              <StatItem
                key={s.label}
                value={s.value}
                label={s.label}
                color={[accentColor, secondaryColor, accentColor, secondaryColor][i % 4] ?? accentColor}
                index={i}
              />
            ))}
          </motion.div>
        )}

        {children}
      </div>
    </div>
  );
}
