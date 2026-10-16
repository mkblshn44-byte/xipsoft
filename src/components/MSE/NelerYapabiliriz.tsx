"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Globe, Code2, Monitor, Shield, BarChart2, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { PALETTE } from "@/config/palette";
import IceButton from "@/components/Ui/IceButton/IceButton";
import dynamic from "next/dynamic";
import TitleText from "@/components/Common/TitleText/TitleText";
import type { CardItem } from "@/components/Ui/ScrollGrid3D/ScrollGrid3DCards";

const Scrollgrid3DCards = dynamic(
  () => import("@/components/Ui/ScrollGrid3D/ScrollGrid3DCards"),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 bg-zinc-800/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    ),
  }
);

// ─── Renk Sabitleri — tek kaynak ──────────────────────────────────────────
const V = PALETTE.neon[500];   // #a78bfa — neon mor
const C = PALETTE.accent.cyan; // #ddd6fe — cyan

// ─── Hizmet Kartları — yalnızca V ve C rengi kullanılır ───────────────────
const serviceCards: CardItem[] = [
  {
    icon: Globe,
    color: C,
    title: "Kurumsal Web Tasarım & Geliştirme",
    desc: "Next.js 15 altyapısıyla anında açılan, SEO uyumlu ve dönüşüm odaklı kurumsal web siteleri.",
    href: "/hizmetler/web-yazilim-tasarim",
  },
  {
    icon: Smartphone,
    color: V,
    title: "Mobil Uygulama Geliştirme",
    desc: "iOS ve Android için Flutter & React Native ile performanslı, SSL Pinning güvenli uygulamalar.",
    href: "/hizmetler/mobil-uygulama",
  },
  {
    icon: Monitor,
    color: C,
    title: "Özel Yazılım & SaaS Platformlar",
    desc: "İş akışınıza özel CRM, ERP, yönetim panelleri ve API entegrasyonlu B2B/B2C platformlar.",
    href: "/hizmetler/masaustu-yazilim",
  },
  {
    icon: Shield,
    color: V,
    title: "Siber Güvenlik & KVKK/GDPR Uyum",
    desc: "OWASP Top 10 standartlarında sızma testleri, kod analizi ve siber güvenlik danışmanlığı.",
    href: "/hizmetler/siber-guvenlik",
  },
  {
    icon: BarChart2,
    color: C,
    title: "Teknik SEO & Dijital Pazarlama",
    desc: "Google'da organik büyüme için yapısal veri, Core Web Vitals optimizasyonu ve içerik stratejisi.",
    href: "/hizmetler/seo-dijital-pazarlama",
  },
  {
    icon: Code2,
    color: V,
    title: "API Geliştirme & Entegrasyon",
    desc: "REST ve GraphQL API mimarisi, üçüncü taraf entegrasyonlar ve mikroservis altyapısı.",
    href: "/hizmetler/web-yazilim-tasarim",
  },
];

export default function NelerYapabiliriz() {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.1, once: true });
  const t = useTranslations("home.services");

  return (
    <section ref={ref} id="services" className="py-16 lg:py-24 relative overflow-hidden px-4 sm:px-6 max-w-full">
      <motion.div
        className="text-center mb-14 relative z-10 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <TitleText tag="h2" variant="section" className="mb-3">
          {t("title")}
        </TitleText>
        <p className="text-ink-muted text-base max-w-xl mx-auto">{t("subtitle")}</p>
        <p className="text-ink-dim text-xs mt-3 font-mono animate-bounce">↓ kaydır</p>
      </motion.div>

      {/* uniformColor → tüm kartların hover/aktif aksan rengi aynı */}
      <Scrollgrid3DCards items={serviceCards} columns={3} animType="type3" uniformColor={C} />

      <motion.div
        className="text-center mt-8 relative z-10"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.7 }}
      >
        <IceButton label="Ücretsiz Teklif Al" size="lg" />
      </motion.div>
    </section>
  );
}
