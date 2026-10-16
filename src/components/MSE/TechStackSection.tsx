"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Server, Globe, Smartphone, Cloud, Database, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { PALETTE } from "@/config/palette";
import IceButton from "@/components/Ui/IceButton/IceButton";
import TitleText from "@/components/Common/TitleText/TitleText";
import type { LucideIcon } from "lucide-react";

// ─── Renk Sabitleri — tek kaynak ──────────────────────────────────────────
// Kartlar V (mor) ve C (cyan) arasında dönüşümlü renk alır.
const V = PALETTE.neon[500];  // #a78bfa
const C = PALETTE.accent.cyan; // #ddd6fe

// ─── Veri ──────────────────────────────────────────────────────────────────
// color: V veya C — başka renk yok.
const STACK = [
  {
    icon: Globe      as LucideIcon,
    color: C,
    label: "Frontend",
    items: ["React", "Next.js", "Vue", "Stencil", "PWA", "WebComponents"],
  },
  {
    icon: Server     as LucideIcon,
    color: V,
    label: "Backend",
    items: ["Node.js", "Python", "Django", "FastAPI", "Laravel", "REST / GraphQL"],
  },
  {
    icon: Smartphone as LucideIcon,
    color: C,
    label: "Mobil",
    items: ["Flutter", "React Native", "iOS", "Android", "Offline-first", "SSL Pinning"],
  },
  {
    icon: Cloud      as LucideIcon,
    color: V,
    label: "Altyapı",
    items: ["Docker", "AWS", "GCP", "Vercel", "Nginx", "CI/CD"],
  },
  {
    icon: Database   as LucideIcon,
    color: C,
    label: "Veritabanı",
    items: ["PostgreSQL", "Redis", "MongoDB", "Kafka", "RabbitMQ", "Sharding"],
  },
  {
    icon: Wrench     as LucideIcon,
    color: V,
    label: "Araçlar",
    items: ["Git", "GitHub Actions", "Sentry", "Firebase", "OWASP", "SIEM"],
  },
] as const;

const ENTRY_DIRS = ["left", "right", "top", "left", "right", "top"] as const;

// ─── Tek Kart ──────────────────────────────────────────────────────────────

function StackCard({ group, index }: { group: (typeof STACK)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Icon = group.icon;
  const c = group.color;

  const dir = ENTRY_DIRS[index];
  const initial =
    dir === "left"  ? { opacity: 0, x: -32, y: 12, scale: 0.97 }
    : dir === "right" ? { opacity: 0, x: 32,  y: 12, scale: 0.97 }
    :                   { opacity: 0, x: 0,   y: -28, scale: 0.97 };

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={visible ? { opacity: 1, x: 0, y: 0, scale: 1 } : initial}
      transition={{ duration: 0.7, delay: visible ? index * 0.06 : 0, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      {/* Liquid glass kart */}
      <div className="relative flex flex-col gap-4 p-6 rounded-2xl overflow-hidden transition-all duration-500 bg-white/[0.02] backdrop-blur-md border border-white/[0.06] shadow-[0_4px_24px_rgba(2,6,23,0.14)] hover:-translate-y-1.5 hover:border-white/[0.11] hover:shadow-[0_8px_40px_rgba(2,6,23,0.22)]">

        {/* Hover üst kenar parlaması */}
        <div
          className="absolute inset-x-0 top-0 h-[1.5px] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `linear-gradient(90deg, transparent, ${c}80, transparent)` }}
        />

        {/* Hover iç glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none rounded-2xl"
          style={{ background: `radial-gradient(ellipse 90% 55% at 50% 0%, ${c}12, transparent 68%)` }}
        />

        {/* İkon + başlık */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
            style={{ background: `${c}10`, border: `1px solid ${c}25` }}
          >
            <Icon className="w-5 h-5" style={{ color: c }} strokeWidth={1.5} />
          </div>
          <span
            className="text-xs font-bold uppercase tracking-widest transition-colors duration-300"
            style={{ color: `${c}cc` }}
          >
            {group.label}
          </span>
        </div>

        {/* Ayraç */}
        <div
          className="h-px w-full opacity-20 relative z-10"
          style={{ background: `linear-gradient(90deg, ${c}40, transparent)` }}
        />

        {/* Teknoloji badge'leri */}
        <div className="flex flex-wrap gap-1.5 relative z-10">
          {group.items.map((item) => (
            <span
              key={item}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-300 bg-white/[0.04] border border-white/[0.06] text-zinc-500 group-hover:text-zinc-300 group-hover:bg-white/[0.06] group-hover:border-white/[0.10]"
            >
              {item}
            </span>
          ))}
        </div>

        {/* Alt köşe dekor */}
        <div
          className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-2xl"
          style={{ background: c }}
        />
      </div>
    </motion.div>
  );
}

// ─── Ana bileşen ───────────────────────────────────────────────────────────

export default function TechStackSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);
  const t = useTranslations("home.techStack");

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) { setHeaderVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-16 lg:py-24 relative overflow-hidden px-4 sm:px-6 max-w-full">

      {/* Başlık */}
      <motion.div
        ref={headerRef}
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={headerVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <TitleText tag="h2" variant="silver" className="mb-3">
          {t("title")}
        </TitleText>
        <p className="text-ink-muted text-base max-w-xl mx-auto">{t("subtitle")}</p>
      </motion.div>

      {/* 3×2 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {STACK.map((group, i) => (
          <StackCard key={group.label} group={group} index={i} />
        ))}
      </div>

      {/* CTA */}
      <motion.p
        className="text-center mt-12 text-ink-muted text-sm"
        initial={{ opacity: 0 }}
        animate={headerVisible ? { opacity: 1 } : {}}
        transition={{ delay: 0.5 }}
      >
        {t("cta")}{" "}
        <IceButton label="ücretsiz teklif alın" size="sm" className="inline-flex" />
      </motion.p>

      {/* Ambient arka plan */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full pointer-events-none blur-[80px]"
        style={{ background: `${V}08` }}
      />
    </section>
  );
}
