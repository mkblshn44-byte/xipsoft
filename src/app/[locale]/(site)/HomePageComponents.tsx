import { ArrowRight, MessageCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Container from "@/components/Common/Container/Container";
import Hero from "@/components/Landing/Hero";
import { BRAND, BRAND_COLORS } from "@/config/brand.config";
import type { HomeHeroCopy } from "@/types/common";
import DeferredHomeSection from "./DeferredHomeSection";

// ── Sayfa altı CTA bölümü — son dönüşüm noktası ──────────────────────────
// Kullanıcı sayfadan çıkmadan önce karşılaştığı son ikna alanı.
// İkincil anahtar kelimeler ve güven sinyalleri burada yoğunlaştırılır.
function BottomCTASection() {
  const ACCENT = BRAND_COLORS.primary;
  const SECONDARY = BRAND_COLORS.secondary;

  const trustItems = [
    "Ücretsiz proje & teknik SEO analizi",
    "Sürpriz maliyet yok — sabit fiyat teklifi",
    "Teslim sonrası 7/24 destek garantisi",
  ];

  return (
    <section
      aria-labelledby="cta-bottom-title"
      className="relative overflow-hidden rounded-3xl border border-white/[0.07] py-16 px-6 md:px-16 text-center"
      style={{
        background:
          "linear-gradient(135deg, rgba(167,139,250,0.06) 0%, rgba(2,6,23,0.98) 40%, rgba(34,211,238,0.04) 100%)",
        boxShadow: "0 0 80px rgba(167,139,250,0.07), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Dekoratif arka plan ışığı */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 100%, ${ACCENT}08, transparent 65%)`,
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Üst etiket */}
        <p
          className="text-xs font-bold uppercase tracking-[0.3em] mb-4"
          style={{ color: SECONDARY }}
        >
          Projenizi Birlikte Hayata Geçirelim
        </p>

        {/* Ana başlık */}
        <h2
          id="cta-bottom-title"
          className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-4"
        >
          Mevcut sitenizin ücretsiz{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${SECONDARY}, ${ACCENT})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            teknik & SEO analizini
          </span>{" "}
          yapalım
        </h2>

        {/* Alt metin */}
        <p className="text-zinc-400 text-base leading-relaxed mb-8 max-w-xl mx-auto">
          Mevcut sitenizin teknik sorunlarını, SEO eksiklerini ve güvenlik açıklarını
          ücretsiz raporlayalım — projeniz için en uygun mimariyi birlikte belirleyelim.
        </p>

        {/* Güven maddecikleri */}
        <ul className="flex flex-col sm:flex-row flex-wrap justify-center gap-x-8 gap-y-2 mb-10">
          {trustItems.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: SECONDARY }} />
              {item}
            </li>
          ))}
        </ul>

        {/* CTA Butonları */}
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/teklif"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(167,139,250,0.35)]"
            style={{
              background: `linear-gradient(135deg, ${ACCENT}, ${SECONDARY}cc)`,
              boxShadow: `0 0 20px ${ACCENT}25`,
            }}
          >
            Ücretsiz Danışmanlık Alın
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent("Merhaba, ücretsiz proje analizi almak istiyorum.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-emerald-100 transition-all duration-300 hover:scale-[1.03]"
            style={{
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(52,211,153,0.30)",
              boxShadow: "0 0 16px rgba(16,185,129,0.10)",
            }}
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp&apos;tan Yazın
          </a>
        </div>
      </div>
    </section>
  );
}

export default function HomePageComponents({ heroCopy }: { heroCopy?: Partial<HomeHeroCopy> }) {
  return (
    <div className="flex flex-col gap-16">

      {/* Global Navbar artık SiteLayoutGuard tarafından tüm sayfalarda (anasayfa dahil)
          tek tip render edilir. Hero kendi top padding'ini yönetir (bkz. Hero.tsx pt-32). */}
      <Hero copy={heroCopy} />

      <Container withPadding>
        <section id="home-content" className="home-below-fold" aria-label="Çözümlerimiz">
          <DeferredHomeSection section="carousel" />
        </section>
      </Container>

      <Container withPadding>
        <section className="home-below-fold" aria-label="Neler yapabiliriz">
          <DeferredHomeSection section="services" />
        </section>
      </Container>

      <Container withPadding>
        <section className="home-below-fold" aria-label="Neden XipSoft">
          <DeferredHomeSection section="why" />
        </section>
      </Container>

      <Container withPadding>
        <section className="home-below-fold" aria-label="Teknoloji yığını">
          <DeferredHomeSection section="tech-stack" />
        </section>
      </Container>

      <Container withPadding>
        <section className="home-below-fold" aria-label="Müşteri yorumları">
          <DeferredHomeSection section="testimonials" />
        </section>
      </Container>

      <Container withPadding>
        <section className="home-below-fold" style={{ position: "relative", zIndex: 0 }} aria-label="Programlama dilleri">
          <DeferredHomeSection section="languages" />
        </section>
      </Container>

      <Container withPadding>
        <section className="home-below-fold" aria-label="XipSoft hakkında">
          <DeferredHomeSection section="about" />
        </section>
      </Container>

      {/* Sayfa altı CTA — son dönüşüm noktası */}
      <Container withPadding>
        <section className="home-below-fold" aria-label="Ücretsiz danışmanlık">
          <BottomCTASection />
        </section>
      </Container>

    </div>
  );
}
