"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import XipIcon from "@/components/Ui/Icon";
import Link from "next/link";
import { cn } from "@/utils";
import { BRAND_COLORS } from "@/config/brand.config";

/* ─── tipler ────────────────────────────────────────────────────────────── */

export interface CarouselCard {
  id: string;
  title: string;
  description: string;
  image?: string;
  icon?: React.ReactNode;
  href?: string;
  accentColor?: string;
}

interface Props {
  cards: CarouselCard[];
  autoPlay?: number;
  className?: string;
}

/* ─── kart icerigi ──────────────────────────────────────────────────────── */

function CardInner({
  card,
  accent,
  isHovered,
}: {
  card: CarouselCard;
  accent: string;
  isHovered: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setglare] = useState({ x: 50, y: 50 });

  const cachedRect = useRef<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef({ tiltX: 0, tiltY: 0, glareX: 50, glareY: 50 });

  // Rect'i her mousemove yerine yalnızca mouseenter'da bir kez cache'le.
  // mousemove sırasında getBoundingClientRect çağrısı → forced reflow;
  // cache sayesinde her move'da sadece aritmetik yapılır.
  const onEnter = useCallback(() => {
    cachedRect.current = ref.current?.getBoundingClientRect() ?? null;
  }, []);

  // pointermove bir karede birden fazla tetiklenebilir. Değerleri ref'te
  // biriktirip kare başına tek render yaparak main thread yükünü düşürürüz.
  const onMove = useCallback((e: React.MouseEvent) => {
    const r = cachedRect.current;
    if (!r) return;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    pendingRef.current = {
      tiltX: (py - 0.5) * -20,
      tiltY: (px - 0.5) * 20,
      glareX: px * 100,
      glareY: py * 100,
    };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const p = pendingRef.current;
      setTilt({ x: p.tiltX, y: p.tiltY });
      setglare({ x: p.glareX, y: p.glareY });
    });
  }, []);

  const onLeave = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setTilt({ x: 0, y: 0 });
    setglare({ x: 50, y: 50 });
  }, []);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const glareOpacity = isHovered ? 0.22 : 0.06;

  return (
    <div
      ref={ref}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="card group relative flex flex-col overflow-hidden rounded-2xl h-full"
      style={{
        transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 0.2s ease-out, box-shadow 0.5s ease, border-color 0.5s ease",
        background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        border: `1px solid ${isHovered ? `${accent}55` : `${accent}25`}`,
        boxShadow: isHovered
          ? `inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 48px rgba(5, 8, 17,0.2), 0 0 60px ${accent}20, 0 0 100px ${accent}08`
          : `inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(5, 8, 17,0.15), 0 0 50px ${accent}12`,
      }}
    >
      {/* glare — fare konumunu takip eder */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glareOpacity}), transparent 55%)`,
          transition: "background 0.4s ease",
        }}
      />

      {/* kenar parlamasi */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `linear-gradient(${135 + tilt.y}deg, ${accent}60, transparent 30%, transparent 70%, ${accent}40)`,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "1.5px",
        }}
      />

      {/* ust cam yansi */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at ${glare.x}% ${glare.y}%, rgba(255,255,255,${isHovered ? 0.1 : 0.06}), transparent 50%)`,
          transition: "background 0.4s ease",
        }}
      />

      {/* gorsel alani */}
      <div
        className="relative mx-auto mt-6 mb-4 flex h-44 w-[78%] items-center justify-center overflow-hidden rounded-xl transition-all duration-500"
        style={{
          background: `radial-gradient(ellipse at center, ${isHovered ? `${accent}20` : `${accent}12`}, transparent 70%)`,
        }}
      >
        {card.image ? (
          <img
            src={card.image}
            alt={card.title}
            width={640}
            height={352}
            className="h-full w-full object-contain"
            style={{
              filter: `drop-shadow(0 0 ${isHovered ? 36 : 24}px ${accent}${isHovered ? "60" : "40"})`,
              transform: `translate(${(glare.x - 50) * 0.1}px, ${(glare.y - 50) * 0.1}px) scale(${isHovered ? 1.08 : 1})`,
              transition: "transform 0.4s ease-out, filter 0.5s ease",
            }}
          />
        ) : card.icon ? (
          <div
            className="flex h-24 w-24 items-center justify-center rounded-2xl transition-all duration-500"
            style={{
              background: `linear-gradient(135deg, ${accent}${isHovered ? "35" : "20"}, ${accent}08)`,
              border: `1px solid ${accent}${isHovered ? "45" : "30"}`,
              transform: `translate(${(glare.x - 50) * 0.14}px, ${(glare.y - 50) * 0.14}px) scale(${isHovered ? 1.1 : 1})`,
              boxShadow: isHovered ? `0 0 30px ${accent}25` : "none",
            }}
          >
            {card.icon}
          </div>
        ) : (
          <div
            className="rounded-full transition-all duration-500"
            style={{
              width: isHovered ? 96 : 80,
              height: isHovered ? 96 : 80,
              background: `radial-gradient(circle, ${accent}${isHovered ? "60" : "40"}, transparent 70%)`,
              filter: `blur(${isHovered ? 8 : 12}px)`,
            }}
          />
        )}

        {/* hover glow cekirdek */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, ${accent}30, transparent 45%)`,
          }}
        />
      </div>

      {/* baslik */}
      <div className="px-7 pb-2 text-center">
        <h3
          className="font-extrabold tracking-wide uppercase text-lg transition-all duration-500"
          style={{
            backgroundImage: `linear-gradient(135deg, #fff 0%, ${accent} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: isHovered ? `drop-shadow(0 0 12px ${accent}40)` : "none",
          }}
        >
          {card.title}
        </h3>
      </div>

      {/* aciklama */}
      <p
        className="px-7 pb-4 text-center text-sm leading-relaxed transition-colors duration-500 line-clamp-3"
        style={{ color: isHovered ? "#d4d4d8" : "#71717a" }}
      >
        {card.description}
      </p>

      {/* alt cizgi glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1.5px] transition-opacity duration-500"
        style={{
          opacity: isHovered ? 0.8 : 0.4,
          background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`,
        }}
      />

      {/* KEŞFET butonu */}
      {card.href && (
        <div className="px-7 pb-6 flex justify-center">
          <Link
            href={card.href}
            className="inline-flex items-center gap-2 rounded-full border px-7 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 hover:shadow-lg"
            style={{
              borderColor: `${accent}99`,
              color: accent,
              boxShadow: isHovered ? `0 0 30px ${accent}45` : `0 0 20px ${accent}30`,
            }}
          >
            Keşfet
            <span className="opacity-70">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

/* ─── ana bilesen ───────────────────────────────────────────────────────── */

export default function CardCarousel3D({ cards, autoPlay = 0, className }: Props) {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const didDrag = useRef(false);
  const total = cards.length;

  useEffect(() => {
    if (!autoPlay || total <= 1) return;
    const id = setInterval(() => setActive((p) => (p + 1) % total), autoPlay);
    return () => clearInterval(id);
  }, [autoPlay, total]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setActive((p) => (p - 1 + total) % total);
      if (e.key === "ArrowRight") setActive((p) => (p + 1) % total);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [total]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setDragStart(e.clientX);
    setDragDelta(0);
    didDrag.current = false;
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStart === null) return;
      const d = e.clientX - dragStart;
      if (Math.abs(d) > 5) didDrag.current = true;
      setDragDelta(d);
    },
    [dragStart]
  );

  const onPointerUp = useCallback(() => {
    if (Math.abs(dragDelta) > 50) {
      setActive((p) => (dragDelta > 0 ? (p - 1 + total) % total : (p + 1) % total));
    }
    setDragStart(null);
    setDragDelta(0);
  }, [dragDelta, total]);

  /* ── kart pozisyon ────────────────────────────────────────────────── */

  const getCardStyle = (index: number) => {
    const diff = (index - active + total) % total;
    const wrapped = diff > total / 2 ? diff - total : diff;
    const abs = Math.abs(wrapped);
    const isCenter = wrapped === 0;
    const isLeft = wrapped < 0;

    const gAP = 440;
    const x = isCenter ? 0 : isLeft ? -(gAP + abs * 100) : gAP + abs * 100;
    const z = isCenter ? 0 : -300 - abs * 120;
    const ry = isCenter ? 0 : isLeft ? 22 + abs * 3 : -(22 + abs * 3);
    const sc = isCenter ? 1 : Math.max(0.7, 1 - abs * 0.12);
    const op = abs > 2 ? 0 : isCenter ? 1 : 0.8;

    return {
      x: x + dragDelta * (isCenter ? 0.3 : 0.08),
      z,
      rotateY: ry,
      scale: sc,
      opacity: op,
      zIndex: total - abs,
      isCenter,
    };
  };

  /* ── render ──────────────────────────────────────────────────────── */

  return (
    <div
      className={cn("relative w-full flex flex-col items-center gap-10 select-none", className)}
      style={{ perspective: "1600px" }}
    >
      <div
        className="relative w-full flex items-center justify-center overflow-visible"
        style={{
          height: "clamp(440px, 54vw, 620px)",
          perspective: "1600px",
          transformStyle: "preserve-3d",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseLeave={() => setHovered(null)}
      >
        <AnimatePresence>
          {cards.map((card, i) => {
            const s = getCardStyle(i);
            const accent = card.accentColor ?? BRAND_COLORS.secondary;
            const isHovered = hovered === i;

            // hover'da ek scale ve z-index artisi
            const hoverScaleBoost = isHovered ? 0.08 : 0;
            const hoverZBoost = isHovered ? 50 : 0;

            return (
              <motion.div
                key={card.id}
                initial={false}
                animate={{
                  x: s.x,
                  z: s.z,
                  rotateY: s.rotateY,
                  scale: s.scale + hoverScaleBoost,
                  opacity: s.opacity,
                }}
                transition={{ type: "spring", stiffness: 200, damping: 24, mass: 1 }}
                style={{
                  position: "absolute",
                  width: "clamp(280px, 36vw, 460px)",
                  zIndex: s.zIndex + hoverZBoost,
                  transformStyle: "preserve-3d",
                  pointerEvents: s.opacity === 0 ? "none" : "auto",
                }}
                onMouseEnter={() => setHovered(i)}
                onClick={() => {
                  if (didDrag.current) return;
                  setActive(i);
                }}
              >
                <CardInner card={card} accent={accent} isHovered={isHovered} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* oklar + dot */}
      <div className="flex items-center gap-8 z-20">
        <button
          onClick={() => setActive((p) => (p - 1 + total) % total)}
          className="group flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 hover:scale-110"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(203, 213, 225, 0.12)" }}
          aria-label="Önceki"
        >
          <XipIcon name="chevron-left" glow="soft" className="h-5 w-5 text-zinc-400 group-hover:text-white transition-colors" />
        </button>

        <div className="flex items-center gap-3">
          {cards.map((card, i) => {
            const accent = card.accentColor ?? BRAND_COLORS.secondary;
            const on = i === active;
            return (
              <button
                key={card.id}
                onClick={() => setActive(i)}
                aria-label={`${i + 1}. karta git`}
                // NOT (A11Y): dokunma hedefi en az 24×24 px olmalı (WCAG 2.2
                // target-size). Görsel nokta küçük kalır; tıklanabilir alan
                // butonun kendisidir.
                className="flex h-6 items-center justify-center transition-transform duration-300 hover:scale-110"
                style={{ width: on ? 44 : 24 }}
              >
                <span
                  aria-hidden="true"
                  className="block transition-all duration-300"
                  style={{
                    width: on ? 36 : 10,
                    height: 10,
                    borderRadius: 999,
                    background: on
                      ? `linear-gradient(90deg, ${accent}, ${BRAND_COLORS.primary})`
                      : "rgba(255,255,255,0.18)",
                    boxShadow: on ? `0 0 16px ${accent}70` : "none",
                  }}
                />
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setActive((p) => (p + 1) % total)}
          className="group flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 hover:scale-110"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(203, 213, 225, 0.12)" }}
          aria-label="Sonraki"
        >
          <XipIcon name="chevron-right" glow="soft" className="h-5 w-5 text-zinc-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}
