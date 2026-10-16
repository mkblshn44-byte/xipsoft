"use client";
/**
 * ScrollgridPhoto — Orijinal 3D-grid-Animations type3 efekti
 * Fotograf kartları Z-derinliginden geliyor, rotationX normalize, scatter.
 * Her kartın üstüne istege baglı overlay (baslık, ikon) eklenebilir.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/utils";

export interface PhotogridItem {
  /** public/ altındaki resim yolu, ör: /grid-imgs/1.jpg */
  src: string;
  /** Kartın üstüne overlay label */
  label?: string;
  /** Overlay accent rengi */
  color?: string;
  /** Overlay ikon (React node) */
  icon?: React.ReactNode;
  /** Tıklanınca */
  href?: string;
}

interface ScrollgridPhotoProps {
  items: PhotogridItem[];
  columns?: number;
  /** px cinsinden perspective */
  perspective?: number;
  className?: string;
  /** Section arkasındaki blur overlay opaklıgı (0-1) */
  overlayOpacity?: number;
}

export default function ScrollgridPhoto({
  items,
  columns = 6,
  perspective = 1500,
  className,
  overlayOpacity = 0,
}: ScrollgridPhotoProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx: any;

    const init = async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      const section = sectionRef.current;
      const wrap = wrapRef.current;
      if (!section || !wrap) return;

      const items = wrap.querySelectorAll<HTMLElement>(".sgp-item");
      const inners = wrap.querySelectorAll<HTMLElement>(".sgp-inner");
      if (!items.length) return;

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: wrap,
            start: "top bottom+=5%",
            end: "bottom top-=5%",
            scrub: true,
          },
        });

        // filter:brightness yerine opacity — compositor-only (reflow yok, repaint yok)
        tl.set(Array.from(items), {
          transformOrigin: "50% 0%",
          z: () => gsap.utils.random(-5000, -2000),
          rotationX: () => gsap.utils.random(-65, -25),
          opacity: 0,
        });

        tl.to(Array.from(items), {
          xPercent: () => gsap.utils.random(-150, 150),
          yPercent: () => gsap.utils.random(-300, 300),
          rotationX: 0,
          opacity: 1,
        }, 0);

        // Wrap kendisi ileriye gelir
        tl.to(wrap, { z: 6500 }, 0);

        // Inner scale 2 → 0.5
        tl.fromTo(Array.from(inners), { scale: 2 }, { scale: 0.5 }, 0);
      }, section);
    };

    init();

    return () => { ctx?.revert(); };
  }, []);

  return (
    <div
      ref={sectionRef}
      className={cn("sgp-section relative w-full overflow-hidden", className)}
      style={{ perspective: `${perspective}px` }}
    >
      {/* Hafif overlay — arka planla kaynasma */}
      {overlayOpacity > 0 && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: `rgba(5,5,7,${overlayOpacity})` }}
        />
      )}

      <div
        ref={wrapRef}
        className="sgp-wrap"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: "1vw",
          transformStyle: "preserve-3d",
          width: "105%",
          marginLeft: "-2.5%",
        }}
      >
        {items.map((item, i) => {
          const inner = (
            <div className="sgp-item" style={{ transformStyle: "preserve-3d" }}>
              <div
                className="sgp-inner relative overflow-hidden rounded-lg"
                style={{ aspectRatio: "1.5 / 1" }}
              >
                {/* Fotograf */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.label ?? ""}
                  width={600}
                  height={400}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />

                {/* Overlay — label varsa göster */}
                {item.label && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${item.color ?? "#a78bfa"}22, rgba(5,5,7,0.85))`,
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    {item.icon && (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${item.color ?? "#a78bfa"}25`, border: `1px solid ${item.color ?? "#a78bfa"}40` }}
                      >
                        {item.icon}
                      </div>
                    )}
                    <span
                      className="text-xs font-bold text-white text-center px-2 leading-tight"
                      style={{ textShadow: `0 0 12px ${item.color ?? "#a78bfa"}` }}
                    >
                      {item.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );

          return item.href ? (
            <a key={i} href={item.href} className="block">
              {inner}
            </a>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
