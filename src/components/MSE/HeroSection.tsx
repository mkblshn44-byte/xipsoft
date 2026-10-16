/**
 * HeroSection — Ana sayfa kurumsal hero
 * Uzay derinlik / paralaks portal tasarım
 *
 * CORE WEB VITALS OPTİMİZASYONLARI:
 * - LCP: h1 hemen render, animasyon yok
 * - INP/TBT: tüm efektler CSS @keyframes (compositor-only)
 * - Scroll paralaks: requestAnimationFrame + CSS custom property (no layout thrash)
 */
"use client";
import { useEffect, useRef } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { BRAND, BRAND_COLORS } from "@/config/brand.config";
import Link from "next/link";
import OpenOfferButton from "./OpenOfferButton";
import type { HomeHeroCopy } from "@/types/common";

// ── Sabitler ───────────────────────────────────────────────────────────────
const ACCENT    = BRAND_COLORS.primary;
const SECONDARY = BRAND_COLORS.secondary;
const TERTIARY  = BRAND_COLORS.accent;
const gOLD      = BRAND_COLORS.gold;

// Starfield — CSS animation ile optimize edildi (80 JS span yerine CSS keyframes)
// Her grup farklı hızda pulse yapar, GPU compositor'da çalışır
function Starfield({ count = 40 }: { count?: number }) {
  const stars = Array.from({ length: count }, (_, index) => ({
    id: index,
    left: `${(index * 17 + (index % 5) * 9) % 100}%`,
    top: `${(index * 23 + (index % 7) * 11) % 100}%`,
    size: `${(index % 3 + 1) * 1.2}px`,
    opacity: 0.18 + ((index * 7) % 10) / 30,
    // Stagger animasyonu: her yıldız farklı gecikmeyle pulse yapsın
    animationDelay: `${(index * 0.3) % 4}s`,
    animationDuration: `${2.5 + (index % 4) * 0.7}s`,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {stars.map((star) => (
        <span
          key={star.id}
          className="absolute rounded-full bg-white/80"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animation: `pulse ${star.animationDuration} ease-in-out ${star.animationDelay} infinite`,
            willChange: "opacity",
          }}
        />
      ))}
    </div>
  );
}

// ── Nebula Halka Katmanları — perspektif derinlik ────────────────────────
// Merkezden dışa doğru büyüyen çemberler; aşağı kaydıkça genişler
function NebulaRings({ accent, secondary }: { accent: string; secondary: string }) {
  const rings = [
    { size: 320,  color: `${accent}18`,    dur: "7s",  delay: "0s"   },
    { size: 520,  color: `${secondary}12`, dur: "9s",  delay: "1.2s" },
    { size: 740,  color: `${accent}0c`,    dur: "11s", delay: "0.6s" },
    { size: 980,  color: `${secondary}08`, dur: "13s", delay: "2.1s" },
    { size: 1240, color: `${accent}05`,    dur: "15s", delay: "1.5s" },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {rings.map((r, i) => (
        <div
          key={i}
          className="hero-nebula-ring absolute"
          style={{
            width:  r.size,
            height: r.size,
            "--ring-color": r.color,
            "--ring-dur":   r.dur,
            "--ring-delay": r.delay,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Portal merkez ışık halesi ───────────────────────────────────────────
function PortalGlow({ accent, secondary }: { accent: string; secondary: string }) {
  return (
    <>
      {/* Merkez yoğun ışık */}
      <div
        className="absolute pointer-events-none hero-portal-glow"
        style={{
          width: 280,
          height: 280,
          background: `radial-gradient(circle, ${accent}22 0%, ${secondary}10 40%, transparent 72%)`,
          filter: "blur(32px)",
          "--pg-color":  `${accent}22`,
          "--pg-color2": `${secondary}12`,
        } as React.CSSProperties}
      />
      {/* Dış hale */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: "50%", top: "45%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 600,
          background: `radial-gradient(circle, ${secondary}0e 0%, transparent 65%)`,
          filter: "blur(48px)",
          borderRadius: "50%",
        }}
      />
    </>
  );
}

// ── Işık tarama çizgileri ───────────────────────────────────────────────
function LightSweeps() {
  return (
    <>
      <div className="hero-light-sweep" style={{ "--sweep-delay": "2s"  } as React.CSSProperties} />
      <div className="hero-light-sweep" style={{ "--sweep-delay": "9s"  } as React.CSSProperties} />
      <div className="hero-light-sweep" style={{ "--sweep-delay": "16s" } as React.CSSProperties} />
    </>
  );
}
function Perspectivegrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          height: "60%",
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
          transform: "perspective(600px) rotateX(55deg)",
          transformOrigin: "bottom center",
          opacity: 0.55,
          maskImage:
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.18) 60%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.18) 60%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          opacity: 0.4,
        }}
      />
    </div>
  );
}

// ── Scan Çizgisi — CSS @keyframes ile (motion.div kaldırıldı, TBT azaltıldı) ──
// Inline style ile renk ve gecikme aktarılır; animasyon compositor thread'de çalışır
function ScanLine({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <div
      className="absolute left-0 right-0 pointer-events-none hero-scanline"
      style={{
        height: 1,
        top: "105%",
        background: `linear-gradient(90deg, transparent 0%, ${color}45 25%, ${color}85 50%, ${color}45 75%, transparent 100%)`,
        boxShadow: `0 0 8px ${color}50`,
        "--scanline-delay": `${delay}s`,
      } as React.CSSProperties}
    />
  );
}

// ── Köse Diamond — CSS @keyframes ile (motion.div kaldırıldı, TBT azaltıldı) ──
function CornerDiamond({ color, pos }: { color: string; pos: "tl" | "tr" | "bl" | "br" }) {
  const cls = { tl: "top-6 left-6", tr: "top-6 right-6", bl: "bottom-6 left-6", br: "bottom-6 right-6" }[pos];
  return (
    <div
      className={`absolute pointer-events-none ${cls} hero-corner-diamond`}
    >
      <div
        className="w-2.5 h-2.5 rotate-45"
        style={{ background: color, boxShadow: `0 0 10px ${color}, 0 0 20px ${color}50` }}
      />
    </div>
  );
}

// ── Istatistik — CSS animasyon (motion.div → div, INP yükü azaltıldı) ────────
// CSS custom property ile stagger delay: her kart farklı gecikmeyle fade-in
function StatCard({ value, label, color, delay }: { value: string; label: string; color: string; delay: number }) {
  return (
    <div
      className="flex flex-col items-center gap-1 hero-stat-card"
      style={{ "--stat-delay": `${delay}s` } as React.CSSProperties}
    >
      <span
        className="font-black text-2xl leading-none tabular-nums"
        style={{
          background: `linear-gradient(135deg, #fff 20%, ${color} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: `drop-shadow(0 0 10px ${color}60)`,
        }}
      >
        {value}
      </span>
      <span className="text-zinc-500 text-[11px] font-medium tracking-widest uppercase">{label}</span>
    </div>
  );
}

// ── Ana Bilesen ────────────────────────────────────────────────────────────
// Statik metinler — next-intl "home" namespace mevcut değil
const TEXT = {
  hero: {
    // Tagline — Google'a ve kullanıcıya ilk 3 saniyede ne yaptığımızı anlatır
    tagline: "Kurumsal Web Tasarım · Özel Yazılım · Siber Güvenlik",
    // H1 — birincil anahtar kelimeler öne alındı, search intent eşleşmesi için
    titleLine1: "Arama Motorlarında Öne Çıkan,",
    titleLine2: "Hızlı ve Güvenli",
    titleLine3: "Web & Yazılım Çözümleri",
    // Subtitle — ikincil anahtar kelimeler + somut teknoloji referansı
    subtitle: "İşletmenize özel Next.js tabanlı yüksek hızlı web platformları, mobil uygulamalar ve",
    subtitleHighlight: "OWASP standartlarında siber güvenlik mimarisi",
    subtitleEnd: "ile dijitalde fark yaratın.",
    ctaPrimary: "Ücretsiz Proje & SEO Analizi",
    ctaSecondary: "Hizmetlerimiz",
    // Stat etiketleri — hem güven sinyali hem anahtar kelime fırsatı
    statYears: "Yıl Sektörel Deneyim",
    statProjects: "Tamamlanan Proje",
    statClients: "Mutlu Kurumsal Müşteri",
    statSpeed: "Ort. LCP Hızı",
  },
};

export default function HeroSection({ copy }: { copy?: Partial<HomeHeroCopy> }) {
  const sectionRef = useRef<HTMLElement>(null);

  // ── Scroll paralaks: CSS custom property ile — layout thrash yok ──────
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // Yüksekliği bir kez oku, resize'da güncelle. Her scroll frame'inde
    // offsetHeight okumak → forced reflow (önceki frame'de stil yazıldığı
    // için layout kirli olur ve okuma senkron layout tetikler).
    let height = el.offsetHeight || 1;

    let rafId = 0;
    let ticking = false;

    const update = () => {
      ticking = false;
      const scrollY = window.scrollY;
      const progress = Math.min(scrollY / (height * 0.8), 1);
      el.style.setProperty("--scroll-progress", progress.toFixed(3));
      el.style.setProperty("--scroll-scale", (1 + progress * 0.06).toFixed(4));
      el.style.setProperty("--scroll-y", scrollY.toFixed(1));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(update);
    };

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      // entry.contentRect kullan — RO callback'i içinde `el.offsetHeight`
      // okumak senkron layout tetikleyip forced reflow'a yol açıyordu.
      height = entry.contentRect.height || 1;
    });
    ro.observe(el);

    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const t = (key: string) => {
    const parts = key.split(".");
    let val: any = TEXT;
    for (const p of parts) val = val?.[p];
    const custom = parts[0] === "hero" && parts[1]
      ? copy?.[parts[1] as keyof HomeHeroCopy]
      : undefined;
    return custom || val || key;
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="home-hero-title"
      className="relative overflow-hidden min-h-[88vh] flex items-center"
    >
      {/* ── Paralaks katman: scroll'a göre scale ───────────────────── */}
      <div className="hero-parallax-bg absolute inset-0">

        <Starfield count={55} />
        <Perspectivegrid />

        {/* Nebula halka derinlik sistemi */}
        <NebulaRings accent={ACCENT} secondary={SECONDARY} />

        {/* Portal merkez ışık halesi */}
        <PortalGlow accent={ACCENT} secondary={SECONDARY} />

      </div>

      {/* ── Scroll derinlik vignette ─────────────────────────────────── */}
      <div className="hero-depth-vignette" />

      {/* ── Işık tarama çizgileri ────────────────────────────────────── */}
      <LightSweeps />

      {/* Üst ısıma */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% -5%, rgba(255,255,255,0.03) 0%, transparent 58%),
            linear-gradient(to bottom, rgba(2,6,23,0.04) 0%, transparent 25%, transparent 75%, rgba(2,6,23,0.08) 100%)
          `,
        }}
      />

      {/* Scan çizgileri */}
      <ScanLine color={ACCENT}    delay={0.8} />
      <ScanLine color={SECONDARY} delay={5.5} />
      <ScanLine color={TERTIARY}  delay={10}  />

      {/* Köse aksanları */}
      <CornerDiamond color={ACCENT}    pos="tl" />
      <CornerDiamond color={SECONDARY} pos="tr" />
      <CornerDiamond color={`${TERTIARY}90`} pos="bl" />
      <CornerDiamond color={`${gOLD}80`}      pos="br" />

      {/* Dikey kenar çizgileri */}
      <div className="absolute top-0 bottom-0 left-0 w-px pointer-events-none"
        style={{ background: `linear-gradient(to bottom, transparent, ${ACCENT}35, transparent)` }} />
      <div className="absolute top-0 bottom-0 right-0 w-px pointer-events-none"
        style={{ background: `linear-gradient(to bottom, transparent, ${SECONDARY}28, transparent)` }} />

      {/* ─── Içerik ─── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        {/* LCP: wrapper motion.div kaldırıldı — h1 anında render edilir */}
        <div>

          {/* Tagline — Google'a bu sayfanın konusunu anında bildirir */}
          <p
            className="text-center text-xs font-semibold uppercase tracking-[0.3em] mb-5 hero-fade-in"
            style={{
              color: ACCENT,
              "--fade-delay": "0.1s",
              letterSpacing: "0.25em",
              filter: `drop-shadow(0 0 8px ${ACCENT}70)`,
            } as React.CSSProperties}
          >
            {t("hero.tagline")}
          </p>

          {/* Ana başlık — LCP elementi: opacity/transform animasyonu YOK, hemen görünür */}
          <h1
            id="home-hero-title"
            className="text-center font-black tracking-tight leading-[1.08] mb-5"
            style={{ fontSize: "clamp(2.2rem, 6.5vw, 5.2rem)" }}
          >
            {/* Satır 1 — daha küçük, bağlamsal */}
            <span
              className="block"
              style={{
                fontSize: "clamp(1.4rem, 3.5vw, 2.8rem)",
                background: "linear-gradient(180deg, #d4d4d8 0%, #a1a1aa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontWeight: 700,
              }}
            >
              {t("hero.titleLine1")}
            </span>
            {/* Satır 2+3 — ana vurgu */}
            <span
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 30%, #e2e8f0 50%, #f1f5f9 70%, #ffffff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("hero.titleLine2")}
            </span>{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${SECONDARY} 0%, ${ACCENT} 60%, ${gOLD} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: `drop-shadow(0 0 24px ${SECONDARY}50)`,
              }}
            >
              {t("hero.titleLine3")}
            </span>
          </h1>

          {/* geometrik ayraç — CSS animasyon (motion.div → div) */}
          <div className="flex justify-center items-center gap-2 mb-7 hero-fade-in" style={{ "--fade-delay": "0.3s" } as React.CSSProperties}>
            <div className="h-px flex-1 max-w-[100px]"
              style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}70)` }} />
            <div className="w-1.5 h-1.5 rotate-45"
              style={{ background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
            <div className="h-px w-12"
              style={{ background: `${ACCENT}50` }} />
            <div className="w-2 h-2 rotate-45"
              style={{ background: gOLD, boxShadow: `0 0 10px ${gOLD}` }} />
            <div className="h-px w-12"
              style={{ background: `${SECONDARY}50` }} />
            <div className="w-1.5 h-1.5 rotate-45"
              style={{ background: SECONDARY, boxShadow: `0 0 8px ${SECONDARY}` }} />
            <div className="h-px flex-1 max-w-[100px]"
              style={{ background: `linear-gradient(90deg, ${SECONDARY}70, transparent)` }} />
          </div>

          {/* Subtitle — CSS animasyon */}
          <p
            className="text-center text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10 hero-fade-up"
            style={{ fontSize: "clamp(0.92rem, 2vw, 1.12rem)", "--fade-delay": "0.34s" } as React.CSSProperties}
          >
            {t("hero.subtitle")}{" "}
            <span className="text-zinc-300 font-medium">{t("hero.subtitleHighlight")}</span>{" "}
            {t("hero.subtitleEnd")}
          </p>

          {/* CTA Butonlar — CSS animasyon */}
          <div
            className="flex flex-wrap justify-center gap-4 mb-16 hero-fade-up"
            style={{ "--fade-delay": "0.5s" } as React.CSSProperties}
          >
            <OpenOfferButton label={t("hero.ctaPrimary")} />

            <a
              href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent("Merhaba, XipSoft hakkında bilgi almak istiyorum.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-flex items-center gap-2 px-8 py-4 font-bold text-sm text-emerald-100 transition-all duration-300 hover:scale-[1.02]"
              style={{
                border: "1px solid rgba(52,211,153,0.35)",
                // backdrop-filter kaldırıldı: LCP viewport'unda expensive paint →
                // opaklık biraz yükseltildi, görünür sonuç aynı kalır
                background: "rgba(16,185,129,0.22)",
                boxShadow: "0 0 18px rgba(16,185,129,0.12)",
              }}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp&apos;tan Yazın
            </a>

            <Link
              href="/hizmetler/web-yazilim-tasarim"
              className="relative inline-flex items-center gap-2 px-8 py-4 font-bold text-sm text-white/90 transition-all duration-300 hover:scale-[1.02]"
              style={{
                border: `1px solid rgba(255,255,255,0.14)`,
                background: "rgba(255,255,255,0.09)",
                boxShadow: `0 0 18px rgba(255,255,255,0.08), 0 0 28px ${SECONDARY}10`,
              }}
            >
              <span className="relative z-10">{t("hero.ctaSecondary")}</span>
              <ArrowRight className="w-4 h-4 relative z-10" />
            </Link>
          </div>

          {/* Istatistikler — CSS animasyon, motion.div wrapper kaldırıldı */}
          <div
            className="flex flex-wrap justify-center gap-8 md:gap-14 pt-8 hero-fade-in"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)", "--fade-delay": "0.68s" } as React.CSSProperties}
          >
            <StatCard value="15+"    label={t("hero.statYears")}    color={gOLD}      delay={0.72} />
            <StatCard value="200+"   label={t("hero.statProjects")} color={SECONDARY} delay={0.82} />
            <StatCard value="150+"   label={t("hero.statClients")}  color={ACCENT}    delay={0.92} />
            <StatCard value="<1.8s"  label={t("hero.statSpeed")}    color="#ddd6fe"   delay={1.02} />
          </div>

        </div>
      </div>
    </section>
  );
}
