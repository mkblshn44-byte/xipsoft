"use client";

import { useTranslations } from "next-intl";
import { PALETTE } from "@/config/palette";
import IceButton from "@/components/Ui/IceButton/IceButton";
import TitleText from "@/components/Common/TitleText/TitleText";
import Scrollgrid3DCards, { type CardItem } from "@/components/Ui/ScrollGrid3D/ScrollGrid3DCards";
import ScrollIndicator from "@/components/Ui/ScrollIndicator";

// ─── Renk Sabitleri — tek kaynak ──────────────────────────────────────────
const V = PALETTE.neon[500];
const C = PALETTE.accent.cyan;

// ─── Hizmet Kartları — yalnızca V ve C rengi kullanılır ───────────────────
const serviceCards: CardItem[] = [
  {
    icon: "globe",
    color: C,
    title: "Kurumsal Web Tasarım & Geliştirme",
    desc: "Next.js 15 altyapısıyla anında açılan, SEO uyumlu ve dönüşüm odaklı kurumsal web siteleri.",
    href: "/hizmetler/web-yazilim-tasarim1.html",
  },
  {
    icon: "smartphone",
    color: V,
    title: "Mobil Uygulama Geliştirme",
    desc: "iOS ve Android için Flutter & React Native ile performanslı, SSL Pinning güvenli uygulamalar.",
    href: "/hizmetler/mobil-uygulama.html",
  },
  {
    icon: "monitor",
    color: C,
    title: "Özel Yazılım & SaaS Platformlar",
    desc: "İş akışınıza özel CRM, ERP, yönetim panelleri ve API entegrasyonlu B2B/B2C platformlar.",
    href: "/hizmetler/masaustu-yazilim.html",
  },
  {
    icon: "shield",
    color: V,
    title: "Siber Güvenlik & KVKK/GDPR Uyum",
    desc: "OWASP Top 10 standartlarında sızma testleri, kod analizi ve siber güvenlik danışmanlığı.",
    href: "/hizmetler/siber-guvenlik.html",
  },
  {
    icon: "bar-chart2",
    color: C,
    title: "Teknik SEO & Dijital Pazarlama",
    desc: "Google'da organik büyüme için yapısal veri, Core Web Vitals optimizasyonu ve içerik stratejisi.",
    href: "/hizmetler/seo-dijital-pazarlama.html",
  },
  {
    icon: "code2",
    color: V,
    title: "API Geliştirme & Entegrasyon",
    desc: "REST ve GraphQL API mimarisi, üçüncü taraf entegrasyonlar ve mikroservis altyapısı.",
    href: "/hizmetler/web-yazilim-tasarim1.html",
  },
];

export default function NelerYapabiliriz() {
  const t = useTranslations("home.services");

  return (
    <section id="services" className="py-16 lg:py-24 relative overflow-hidden px-4 sm:px-6 max-w-full">
      <div className="text-center mb-14 relative z-10 px-4 home-reveal">
        <TitleText tag="h2" variant="brand" className="mb-3">
          {t("title")}
        </TitleText>
        <p className="text-ink-muted text-base max-w-xl mx-auto">{t("subtitle")}</p>
        <p className="text-ink-dim text-xs mt-3 font-mono animate-bounce">↓ kaydır</p>
      </div>

      {/* uniformColor → tüm kartların hover/aktif aksan rengi aynı */}
      <Scrollgrid3DCards items={serviceCards} columns={3} animType="type3" uniformColor={C} />

      <div className="text-center mt-8 relative z-10 home-reveal">
        <IceButton label="Ücretsiz Teklif Al" size="lg" />
      </div>
      <div className="relative z-10 mt-8 flex justify-center">
        <ScrollIndicator href="#why-xipsoft" label="Devam et" />
      </div>
    </section>
  );
}
