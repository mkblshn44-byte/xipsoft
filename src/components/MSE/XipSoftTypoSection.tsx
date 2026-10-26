"use client";

import { useTranslations } from "next-intl";

// ── XIPSOFT neon tüp renkleri ──────────────────────────────────────────────
const NEON = "#39ff73";
const NEON_SOFT = "#a8ffc2";

// ── Neon wordmark — tek span, asla bölünmez ───────────────────────────────
function GlassWord({
  text,
  fontSize,
  letterSpacing = "-0.01em",
}: {
  text: string;
  fontSize: string;
  letterSpacing?: string;
}) {
  const base: React.CSSProperties = {
    display: "block",
    fontSize,
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing,
    fontFamily: "var(--font-display, sans-serif)",
    whiteSpace: "nowrap",   // ← asla satır kırmaz
  };

  return (
    <div
      className="relative select-none home-reveal neon-wordmark"
      style={{ transformStyle: "preserve-3d", perspective: "900px" }}
    >
      {/* 3D Gölge katmanları - derinlik hissi */}
      {[...Array(8)].map((_, i) => (
        <span
          key={`shadow-${i}`}
          aria-hidden
          style={{
            ...base,
            position: "absolute",
            inset: 0,
            color: "#0a1f12",
            transform: `translateX(${(i + 1) * 3}px) translateY(${(i + 1) * 3}px)`,
            opacity: 0.15 - (i * 0.015),
            pointerEvents: "none",
            zIndex: -i,
          }}
        >
          {text}
        </span>
      ))}

      {/* Dış halo: referanstaki yoğun neon ışık */}
      <span
        style={{
          ...base,
          color: "transparent",
          WebkitTextStroke: `8px ${NEON}22`,
          textShadow: [
            `0 0 4px ${NEON}`,
            `0 0 12px ${NEON}`,
            `0 0 28px ${NEON}`,
            `0 0 58px ${NEON}cc`,
          ].join(","),
        }}
      >
        {text}
      </span>

      {/* Tüp dış çizgisi */}
      <span
        aria-hidden
        style={{
          ...base,
          position: "absolute",
          inset: 0,
          color: "#07120b",
          WebkitTextStroke: `5px ${NEON}`,
          textShadow: `0 0 8px ${NEON}, 0 0 22px ${NEON}cc`,
          pointerEvents: "none",
        }}
      >
        {text}
      </span>

      {/* İç beyaz-yeşil highlight: cam/tüp içinden gelen parlak çizgi */}
      <span
        aria-hidden
        style={{
          ...base,
          position: "absolute",
          inset: 0,
          color: "transparent",
          WebkitTextStroke: `1.5px ${NEON_SOFT}`,
          textShadow: `0 0 3px #ffffff, 0 0 8px ${NEON_SOFT}`,
          pointerEvents: "none",
        }}
      >
        {text}
      </span>

      {/* Zemine düşen yansıma */}
      <span
        aria-hidden
        style={{
          ...base,
          position: "absolute",
          inset: "92% 0 auto",
          color: "transparent",
          WebkitTextStroke: `3px ${NEON}66`,
          transform: "scaleY(-0.55)",
          transformOrigin: "top",
          filter: "blur(2px)",
          opacity: 0.42,
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,.7), transparent 68%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,.7), transparent 68%)",
          pointerEvents: "none",
        }}
      >
        {text}
      </span>
    </div>
  );
}

// ── XIPSOFT ana başlık ────────────────────────────────────────────────────
function XipsoftTitle() {
  return (
    <div className="relative flex flex-col items-center w-full overflow-hidden">
      {/* Referanstaki neon tabela etkisi — tek blok, wrap olmaz */}
      <GlassWord
        text="XIPSOFT"
        fontSize="clamp(3.25rem, 13vw, 9rem)"
        letterSpacing="0.08em"
      />

      {/* Yazı altı ışık çizgisi */}
      <div
        className="pointer-events-none home-reveal"
        style={{
          width: "80%",
          height: 1,
          marginTop: "0.1em",
          background:
            `linear-gradient(90deg, transparent 0%, ${NEON}99 20%, #d8ffe2 50%, ${NEON}99 80%, transparent 100%)`,
          boxShadow: `0 0 18px ${NEON}99`,
        }}
      />

      {/* Zemin hale */}
      <div
        className="pointer-events-none home-reveal"
        style={{
          width: "60%",
          height: 28,
          background:
            `radial-gradient(ellipse 60% 100% at 50% 0%, ${NEON}20 0%, rgba(167, 139, 250,0.06) 45%, transparent 70%)`,
          filter: "blur(7px)",
        }}
      />
    </div>
  );
}

// ── Alt slogan — KATMANLI BAŞLIK ───────────────────────────────────────────
// Plan (md. 5): "YAZILIM & TEKNOLOJİ" başlığı
//   • ÖNDE net, okunaklı tipografi (gradient dolgu + ölçülü gölge)
//   • ARKADA büyük, düşük kontrastlı DEKORATİF yazı katmanı (a11y'de gizli)
//   • İnce yatay ışık çizgisi ve ölçülü yansıma
// Metin çeviri akışından gelir (`XipSoftTypo`); dekoratif kopya ekran
// okuyucularda OKUNMAZ (aria-hidden) → başlık bir kez duyurulur.
function LayeredSlogan() {
  const t = useTranslations("XipSoftTypo");
  const title = t("sloganTitle");
  const decor = t("sloganDecor");

  const frontStyle: React.CSSProperties = {
    fontSize: "clamp(1rem, 3vw, 1.75rem)",
    fontWeight: 900,
    lineHeight: 1.15,
    letterSpacing: "0.22em",
    fontFamily: "var(--font-display, system-ui)",
  };

  return (
    <div className="relative mt-6 flex w-full flex-col items-center home-reveal">
      {/* Arka katman — BÜYÜK, düşük kontrastlı dekoratif yazı */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-center font-black leading-none text-white/[0.045]"
        style={{
          fontSize: "clamp(3rem, 13vw, 8.5rem)",
          letterSpacing: "-0.02em",
          fontFamily: "var(--font-display, sans-serif)",
        }}
      >
        {decor}
      </span>

      {/* Ön katman — net ve okunaklı başlık */}
      <h2
        className="relative bg-gradient-to-b from-white via-slate-100 to-neon-300 bg-clip-text text-center text-transparent brand-gradient-text"
        style={{
          ...frontStyle,
          filter: "drop-shadow(0 6px 18px rgba(5, 8, 17,0.85))",
        }}
      >
        {title}
      </h2>

      {/* İnce yatay ışık çizgisi */}
      <span
        aria-hidden="true"
        className="mt-3 block h-px w-[min(80%,520px)]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(167, 139, 250,0.12) 25%, rgba(255,255,255,0.75) 50%, rgba(167, 139, 250,0.10) 75%, transparent 100%)",
          boxShadow: "0 0 14px rgba(167, 139, 250,0.10)",
        }}
      />

      {/* Ölçülü yansıma — başlığın altına düşen soluk kopya (a11y'de gizli) */}
      <span
        aria-hidden="true"
        className="pointer-events-none mt-1 block select-none text-center text-neon-500/20"
        style={{
          ...frontStyle,
          transform: "scaleY(-1)",
          filter: "blur(1.2px)",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 72%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 72%)",
        }}
      >
        {title}
      </span>
    </div>
  );
}

// ── Ana bileşen ────────────────────────────────────────────────────────────
export default function XipSoftTypoSection() {
  return (
    <div
      className="relative w-full flex flex-col items-center justify-center py-16 px-4"
      style={{ overflow: "hidden" }}
    >
      <XipsoftTitle />
      <LayeredSlogan />
    </div>
  );
}
