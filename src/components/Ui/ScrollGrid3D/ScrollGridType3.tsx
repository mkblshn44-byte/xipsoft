"use client";
/**
 * ScrollgridType3 — Hizmet Detay Sayfası Paket Kartları
 * Kartlar derinden (Z-derinligi) gelip yukarıdan düser, brightness 0→200 parlar.
 * Orijinal type3'ten: Z -5000→0, rotationX normalize, scatter yPercent.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/utils";

interface ScrollgridType3Props {
  children: React.ReactNode[];
  columns?: number;
  className?: string;
}

export default function ScrollgridType3({
  children,
  columns = 3,
  className,
}: ScrollgridType3Props) {
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

      const items = wrap.querySelectorAll<HTMLElement>(".sg3-item");
      if (!items.length) return;
      const inners = wrap.querySelectorAll<HTMLElement>(".sg3-inner");

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
          z: () => gsap.utils.random(-3000, -800),
          rotationX: () => gsap.utils.random(-65, -25),
          opacity: 0,
        });

        tl.to(
          Array.from(items),
          {
            xPercent: () => gsap.utils.random(-80, 80),
            yPercent: () => gsap.utils.random(-150, 150),
            rotationX: 0,
            opacity: 1,
          },
          0
        );

        // Wrap kendisi ileriye gelir
        tl.to(wrap, { z: 3000 }, 0);

        // Inner scale
        tl.fromTo(
          Array.from(inners),
          { scale: 1.6 },
          { scale: 0.8 },
          0
        );
      }, section);
    };

    init();

    return () => {
      ctx?.revert();
    };
  }, []);

  return (
    <div
      ref={sectionRef}
      className={cn("sg3-section relative w-full overflow-hidden", className)}
      style={{ perspective: "1500px" }}
    >
      <div
        ref={wrapRef}
        className="sg3-wrap"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: "1.5rem",
          transformStyle: "preserve-3d",
          width: "105%",
          marginLeft: "-2.5%",
        }}
      >
        {children.map((child, i) => (
          <div key={i} className="sg3-item" style={{ transformStyle: "preserve-3d" }}>
            <div className="sg3-inner">{child}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
