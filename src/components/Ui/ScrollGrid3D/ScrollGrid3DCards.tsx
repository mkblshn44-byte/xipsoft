"use client";
/**
 * Scrollgrid3DCards
 * motion/react ile kartlar 3D'den gelip grid'e yerlesir.
 * Tıklanabilir, hover efektli, href destekli.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { ElementType } from "react";

export interface CardItem {
  icon: ElementType;
  color: string;
  title: string;
  desc: string;
  badge?: string;
  href?: string;
}

interface Props {
  items: CardItem[];
  columns?: number;
  /** type3: Z-derinliginden gelir | type1: yandan gelir */
  animType?: "type1" | "type3";
  /** Tüm kartlara tek renk border/glow (kart rengi override) */
  uniformColor?: string;
}

export default function Scrollgrid3DCards({ items, columns = 4, animType = "type3", uniformColor }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [revealedIndexes, setRevealedIndexes] = useState<number[]>([]);

  const directionMap = useMemo(() => {
    const dirs = ["left", "right", "top"] as const;
    return items.map((_, index) => dirs[index % dirs.length]);
  }, [items]);

  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number(entry.target.getAttribute("data-card-index"));
          if (!Number.isNaN(index)) {
            setRevealedIndexes((prev) => (prev.includes(index) ? prev : [...prev, index]));
          }
        });
      },
      { threshold: 0.18, rootMargin: "90px 0px -40px 0px" }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "grid",
        placeItems: "center",
        padding: "clamp(0.75rem, 4vw, 2rem)",
        width: "100%",
        maxWidth: "100vw",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "min(105%, 100vw)",
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: "clamp(0.75rem, 1.5vw, 1.5rem)",
        }}
      >
        {items.map((item, i) => {
          const Icon = item.icon;
          const cardColor = uniformColor ?? item.color;

          const direction = directionMap[i];
          const isVisible = revealedIndexes.includes(i);

          const getInitial = () => {
            if (direction === "left") return { opacity: 0, x: -28, y: 12, scale: 0.96 };
            if (direction === "right") return { opacity: 0, x: 28, y: 12, scale: 0.96 };
            return { opacity: 0, y: 24, scale: 0.96 };
          };
          const getAnimate = () => ({ opacity: 1, x: 0, y: 0, scale: 1 });

          const cardInner = (
            <div
              className="group relative w-full h-full flex flex-col gap-3 p-5 rounded-[1.25rem] cursor-pointer select-none card"
              style={{
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(2,6,23,0.12)",
                height: "100%",
              }}
            >
              {/* Badge */}
              {item.badge && (
                <div
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-black z-10"
                  style={{ background: `linear-gradient(135deg, ${cardColor}, var(--prism-rose))` }}
                >
                  {item.badge}+
                </div>
              )}

              {/* Ikon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative z-10"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${cardColor}40`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color: cardColor }} strokeWidth={1.5} />
              </div>

              {/* Metin */}
              <div className="relative z-10 flex flex-col gap-1.5 flex-1">
                <p className="font-bold text-sm text-white leading-snug">{item.title}</p>
                <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3">{item.desc}</p>
              </div>

              {/* Alt çizgi */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[1px] opacity-30 rounded-b-2xl"
                style={{ background: `linear-gradient(90deg, transparent, ${cardColor}60, transparent)` }}
              />
            </div>
          );

          return (
            <motion.div
              key={`${item.title}-${i}`}
              ref={(node) => {
                cardRefs.current[i] = node;
              }}
              data-card-index={i}
              initial={getInitial()}
              animate={isVisible ? getAnimate() : getInitial()}
              transition={{
                duration: 0.65,
                delay: isVisible ? Math.min(i * 0.045, 0.24) : 0,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                aspectRatio: "1.5",
                borderRadius: "1.25rem",
                transformStyle: "preserve-3d",
              }}
            >
              {item.href ? (
                <a href={item.href} className="block w-full h-full">
                  {cardInner}
                </a>
              ) : (
                cardInner
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
