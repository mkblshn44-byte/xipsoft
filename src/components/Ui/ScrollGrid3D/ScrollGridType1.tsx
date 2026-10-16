"use client";
/**
 * ScrollgridType1 — Hizmet Detay Sayfası Feature Kartları
 * Kartlar Z-derinliginden fırlatılıp geçer, rotationY ile egik perspektif.
 * Orijinal type1'den ilham: xPercent random uçus + scale degisimi.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/utils";

interface ScrollgridType1Props {
  children: React.ReactNode[];
  columns?: number;
  className?: string;
}

export default function ScrollgridType1({
  children,
  columns = 3,
  className,
}: ScrollgridType1Props) {
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

      const items = wrap.querySelectorAll<HTMLElement>(".sg1-item");
      if (!items.length) return;
      const inners = wrap.querySelectorAll<HTMLElement>(".sg1-inner");

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

        // Wrap egik perspektif
        tl.set(wrap, { rotationY: 25 });

        // Her item random Z derinliginde baslar
        tl.set(Array.from(items), {
          z: () => gsap.utils.random(-1600, 200),
        });

        // X ekseninde rastgele uçup geçer
        tl.fromTo(
          Array.from(items),
          { xPercent: () => gsap.utils.random(-1000, -500) },
          { xPercent: () => gsap.utils.random(500, 1000) },
          0
        );

        // Inner scale 2→0.5 (zoom-out efekti)
        tl.fromTo(
          Array.from(inners),
          { scale: 1.4 },
          { scale: 0.85 },
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
      className={cn("sg1-section relative w-full overflow-hidden", className)}
      style={{ perspective: "1000px" }}
    >
      <div
        ref={wrapRef}
        className="sg1-wrap"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: "1rem",
          transformStyle: "preserve-3d",
        }}
      >
        {children.map((child, i) => (
          <div key={i} className="sg1-item" style={{ transformStyle: "preserve-3d" }}>
            <div className="sg1-inner">{child}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
