"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Globe, Shield, Code2, Cloud, Cpu } from "lucide-react";
import dynamic from "next/dynamic";
import TitleText from "@/components/Common/TitleText/TitleText";
import { PALETTE } from "@/config/palette";
import type { CarouselCard } from "@/components/Ui/CardCarousel3D";

const CardCarousel3D = dynamic(() => import("@/components/Ui/CardCarousel3D"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-64 bg-zinc-800/50 rounded-2xl animate-pulse" />
      ))}
    </div>
  ),
});

// ─── Renk Sabitleri — tek kaynak ──────────────────────────────────────────
const V = PALETTE.neon[500];   // #a78bfa — neon mor
const C = PALETTE.accent.cyan; // #ddd6fe — cyan

// ─── Hizmet Kartları ───────────────────────────────────────────────────────
// icon: JSX olarak alınıyor (CardCarousel3D bileşeninin beklentisi).
// Tüm renkler V ve C arasında dönüşümlü — başka renk yok.
const services: CarouselCard[] = [
  {
    id: "bulut-bilisim",
    title: "Bulut Bilişim",
    description:
      "AWS, Azure ve GCP ile ölçeklenebilir bulut altyapısı kurulumu, göç ve yönetimi. Maliyetlerinizi %40'a kadar düşürün.",
    icon: <Cloud className="h-10 w-10" style={{ color: C }} />,
    href: "/hizmetler/bulut-bilisim",
    accentColor: C,
  },
  {
    id: "blockchain-web3",
    title: "Blockchain & Web3",
    description:
      "Akıllı sözleşme geliştirme, DApp, NFT platformları ve DeFi protokolleri. Merkeziyetsiz geleceği birlikte inşa edin.",
    icon: <Shield className="h-10 w-10" style={{ color: V }} />,
    href: "/hizmetler/blockchain-web3",
    accentColor: V,
  },
  {
    id: "siber-guvenlik",
    title: "Siber Güvenlik",
    description:
      "Penetrasyon testi, güvenlik denetimi ve 7/24 izleme. KVKK/GDPR uyum danışmanlığıyla dijital varlıklarınızı koruyun.",
    icon: <Shield className="h-10 w-10" style={{ color: C }} />,
    href: "/hizmetler/siber-guvenlik",
    accentColor: C,
  },
  {
    id: "yapay-zeka-ml",
    title: "Yapay Zeka & ML",
    description:
      "LLM entegrasyonu, chatbot geliştirme, veri analizi ve otomasyon. İş süreçlerinizi yapay zeka ile dönüştürün.",
    icon: <Cpu className="h-10 w-10" style={{ color: V }} />,
    href: "/hizmetler/yapay-zeka-ml",
    accentColor: V,
  },
  {
    id: "e-ticaret-platformlari",
    title: "E-Ticaret",
    description:
      "Özel e-ticaret platformları, mobil ticaret ve SEO optimizasyonu. Online satışlarınızı %35'e kadar artırın.",
    icon: <Globe className="h-10 w-10" style={{ color: C }} />,
    href: "/hizmetler/e-ticaret-platformlari",
    accentColor: C,
  },
  {
    id: "devops-sre",
    title: "DevOps & SRE",
    description:
      "CI/CD pipeline, Kubernetes, Terraform ile altyapı otomasyonu. Deploy hızınızı 10 kata çıkarın.",
    icon: <Code2 className="h-10 w-10" style={{ color: V }} />,
    href: "/hizmetler/devops-sre",
    accentColor: V,
  },
];

export default function CarouselSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.1, once: true });

  return (
    <section ref={ref} className="relative py-20 lg:py-28 overflow-visible">
      {/* Arka plan ambient glow — palette token */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${V}0a, transparent 60%)`,
        }}
      />

      {/* Başlık */}
      <motion.div
        className="text-center mb-14 relative z-10 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        <TitleText tag="h2" variant="section" className="mb-3">
          Çözümlerimiz
        </TitleText>
        <p className="text-ink-muted text-base max-w-xl mx-auto">
          Teknolojiyi stratejinizle buluşturan yüksek performanslı hizmetler
        </p>
      </motion.div>

      {/* Carousel */}
      <motion.div
        className="relative z-10 px-4"
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <CardCarousel3D cards={services} autoPlay={0} />
      </motion.div>
    </section>
  );
}
