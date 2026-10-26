"use client";

import TitleText from "@/components/Common/TitleText/TitleText";
import XipIcon from "@/components/Ui/Icon";
import { PALETTE } from "@/config/palette";
import CardCarousel3D, { type CarouselCard } from "@/components/Ui/CardCarousel3D";
import ScrollIndicator from "@/components/Ui/ScrollIndicator";

// ─── Renk Sabitleri — tek kaynak ──────────────────────────────────────────
const V = PALETTE.neon[500];
const C = PALETTE.accent.cyan;

// ─── Hizmet Kartları ───────────────────────────────────────────────────────
// icon: XipSoft ÖZEL ikon setinden (arkası beyaz ışıklı).
// Tüm renkler V ve C arasında dönüşümlü — başka renk yok.
const services: CarouselCard[] = [
  {
    id: "bulut-bilisim",
    title: "Bulut Bilişim",
    description:
      "AWS, Azure ve GCP ile ölçeklenebilir bulut altyapısı kurulumu, göç ve yönetimi. Maliyetlerinizi %40'a kadar düşürün.",
    icon: <XipIcon name="cloud" glow="strong" className="h-10 w-10" style={{ color: C }} />,
    href: "/hizmetler/bulut-bilisim.html",
    accentColor: C,
  },
  {
    id: "blockchain-web3",
    title: "Blockchain & Web3",
    description:
      "Akıllı sözleşme geliştirme, DApp, NFT platformları ve DeFi protokolleri. Merkeziyetsiz geleceği birlikte inşa edin.",
    icon: <XipIcon name="link2" glow="strong" className="h-10 w-10" style={{ color: V }} />,
    href: "/hizmetler/blockchain-web3.html",
    accentColor: V,
  },
  {
    id: "siber-guvenlik",
    title: "Siber Güvenlik",
    description:
      "Penetrasyon testi, güvenlik denetimi ve 7/24 izleme. KVKK/GDPR uyum danışmanlığıyla dijital varlıklarınızı koruyun.",
    icon: <XipIcon name="shield-check" glow="strong" className="h-10 w-10" style={{ color: C }} />,
    href: "/hizmetler/siber-guvenlik.html",
    accentColor: C,
  },
  {
    id: "yapay-zeka-ml",
    title: "Yapay Zeka & ML",
    description:
      "LLM entegrasyonu, chatbot geliştirme, veri analizi ve otomasyon. İş süreçlerinizi yapay zeka ile dönüştürün.",
    icon: <XipIcon name="cpu" glow="strong" className="h-10 w-10" style={{ color: V }} />,
    href: "/hizmetler/yapay-zeka-ml.html",
    accentColor: V,
  },
  {
    id: "e-ticaret-platformlari",
    title: "E-Ticaret",
    description:
      "Özel e-ticaret platformları, mobil ticaret ve SEO optimizasyonu. Online satışlarınızı %35'e kadar artırın.",
    icon: <XipIcon name="globe" glow="strong" className="h-10 w-10" style={{ color: C }} />,
    href: "/hizmetler/e-ticaret-platformlari.html",
    accentColor: C,
  },
  {
    id: "devops-sre",
    title: "DevOps & SRE",
    description:
      "CI/CD pipeline, Kubernetes, Terraform ile altyapı otomasyonu. Deploy hızınızı 10 kata çıkarın.",
    icon: <XipIcon name="code2" glow="strong" className="h-10 w-10" style={{ color: V }} />,
    href: "/hizmetler/devops-sre.html",
    accentColor: V,
  },
];

export default function CarouselSection() {
  return (
    <section className="relative py-20 lg:py-28 overflow-visible">
      {/* Arka plan ambient glow — palette token */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${V}0a, transparent 60%)`,
        }}
      />

      {/* Başlık */}
      <div className="text-center mb-14 relative z-10 px-4 home-reveal">
        <TitleText tag="h2" variant="brand" className="mb-3">
          Çözümlerimiz
        </TitleText>
        <p className="text-ink-muted text-base max-w-xl mx-auto">
          Teknolojiyi stratejinizle buluşturan yüksek performanslı hizmetler
        </p>
      </div>

      {/* Carousel */}
      <div className="relative left-1/2 z-10 w-screen max-w-[100vw] -translate-x-1/2 home-reveal">
        <CardCarousel3D cards={services} autoPlay={0} />
      </div>

      <div className="relative z-10 mt-8 flex justify-center">
        <ScrollIndicator href="#services" label="Daha fazlası" />
      </div>
    </section>
  );
}
