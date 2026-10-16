"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

// ── Krom/cam gradient ──────────────────────────────────────────────────────
const CHROME = `linear-gradient(
  168deg,
  #ffffff   0%,
  #d8eeff  10%,
  #7ab8f5  24%,
  #ffffff  38%,
  #b0d8ff  52%,
  #4a9fd4  66%,
  #c8e8ff  80%,
  #ffffff 100%
)`;

const CHROME_FILTER = [
  "drop-shadow(0 2px 0px rgba(0,0,0,0.90))",
  "drop-shadow(0 0 45px rgba(122,184,245,0.65))",
].join(" ");

// ── glass kelime Blogu — tek span, asla bölünmez ──────────────────────────
function GlassWord({
  text,
  fontSize,
  delay,
  isInView,
  letterSpacing = "-0.01em",
}: {
  text: string;
  fontSize: string;
  delay: number;
  isInView: boolean;
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
    <motion.div
      className="relative select-none"
      initial={{ opacity: 0, y: 40, rotateX: -22, filter: "blur(8px)" }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 1.0, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformStyle: "preserve-3d", perspective: "900px" }}
    >
      {/* Katman 1 — ana krom metin */}
      <span
        style={{
          ...base,
          background: CHROME,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: CHROME_FILTER,
        }}
      >
        {text}
      </span>

      {/* Katman 2 — speküler üst parlaklık */}
      <span
        aria-hidden
        style={{
          ...base,
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(155deg, rgba(255,255,255,0.65) 0%, transparent 35%, rgba(255,255,255,0.20) 65%, transparent 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          pointerEvents: "none",
        }}
      >
        {text}
      </span>

      {/* Katman 3 — zemin cam yansıması */}
      <span
        aria-hidden
        style={{
          ...base,
          display: "block",
          background: `linear-gradient(168deg,
            rgba(74,159,212,0.42) 0%,
            rgba(34,211,238,0.26) 35%,
            rgba(167,139,250,0.18) 65%,
            transparent 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          transform: "scaleY(-1)",
          marginTop: "-0.05em",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 55%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 55%)",
          filter: "blur(1.5px)",
          pointerEvents: "none",
        }}
      >
        {text}
      </span>
    </motion.div>
  );
}

// ── XipSoft ana başlık ─────────────────────────────────────────────────────
function XipsoftTitle({ isInView }: { isInView: boolean }) {
  return (
    <div className="relative flex flex-col items-center w-full overflow-hidden">
      {/* Tek blok — wrap olmaz */}
      <GlassWord
        text="XipSoft"
        fontSize="clamp(4rem, 14vw, 10rem)"
        delay={0.12}
        isInView={isInView}
      />

      {/* Yazı altı ışık çizgisi */}
      <motion.div
        className="pointer-events-none"
        style={{
          width: "80%",
          height: 1,
          marginTop: "0.1em",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.65) 20%, rgba(255,255,255,0.95) 50%, rgba(167,139,250,0.65) 80%, transparent 100%)",
          boxShadow: "0 0 18px rgba(34,211,238,0.55)",
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ duration: 1.4, delay: 0.75 }}
      />

      {/* Zemin hale */}
      <motion.div
        className="pointer-events-none"
        style={{
          width: "60%",
          height: 28,
          background:
            "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(34,211,238,0.22) 0%, rgba(167,139,250,0.12) 45%, transparent 70%)",
          filter: "blur(7px)",
        }}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.85, duration: 0.8 }}
      />
    </div>
  );
}

// ── Alt slogan ─────────────────────────────────────────────────────────────
function GlassSlogan({ isInView }: { isInView: boolean }) {
  return (
    <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
      <GlassWord
        text="YAZILIM"
        fontSize="clamp(0.9rem, 2.5vw, 1.6rem)"
        delay={0.85}
        isInView={isInView}
        letterSpacing="0.20em"
      />
      <GlassWord
        text="&"
        fontSize="clamp(0.9rem, 2.5vw, 1.6rem)"
        delay={0.95}
        isInView={isInView}
        letterSpacing="0.10em"
      />
      <GlassWord
        text="TEKNOLOJI"
        fontSize="clamp(0.9rem, 2.5vw, 1.6rem)"
        delay={1.05}
        isInView={isInView}
        letterSpacing="0.20em"
      />
    </div>
  );
}

// ── Ana bileşen ────────────────────────────────────────────────────────────
export default function XipSoftTypoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.25, once: true });

  return (
    <div
      ref={ref}
      className="relative w-full flex flex-col items-center justify-center py-16 px-4"
      style={{ overflow: "hidden" }}
    >
      <XipsoftTitle isInView={isInView} />
      <GlassSlogan isInView={isInView} />
    </div>
  );
}
