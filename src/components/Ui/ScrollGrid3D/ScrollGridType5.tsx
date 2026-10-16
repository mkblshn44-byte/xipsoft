"use client";
/**
 * ScrollgridType5 — Anasayfa Hizmet Kartları
 * Tek/çift satırlar ters yönde kayar, rotationX tilt ile sinematik perspektif efekti.
 * gSAP ScrollTrigger tabanlı, motion/react ile uyumlu çalısır.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/utils";

interface ScrollgridType5Props {
  children: React.ReactNode[];
  columns?: number;
  className?: string;
}

export default function ScrollgridType5({
  children,
  columns = 3,
  className,
}: ScrollgridType5Props) {
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

      const items = wrap.querySelectorAll<HTMLElement>(".sg5-item");
      if (!items.length) return;

      // Satırları belirle — tüm getBoundingClientRect okumaları tek seferde batch'lenir,
      // DOM write (GSAP set/to) çağrısından önce layout'u bir kez kirletir.
      const rowMap: Map<number, HTMLElement[]> = new Map();
      const tops = Array.from(items).map((el) =>
        Math.round(el.getBoundingClientRect().top)
      ); // tek geçişte tüm okumalar — ardından write yok
      tops.forEach((top, idx) => {
        if (!rowMap.has(top)) rowMap.set(top, []);
        rowMap.get(top)!.push(items[idx]!);
      });
      const rows = Array.from(rowMap.values());

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

        // rotationX tilt
        tl.set(wrap, { rotationX: 50 });
        tl.to(wrap, { rotationX: 30 });

        // Tek satırlar saga, çift satırlar sola
        // filter:brightness yerine opacity — compositor-only (reflow yok, repaint yok)
        rows.forEach((row, i) => {
          tl.fromTo(row, { opacity: 0 }, { opacity: 1 }, 0);
          tl.to(
            row,
            {
              ease: "power1",
              xPercent: i % 2 === 0 ? -80 : 80,
            },
            0
          );
        });

        // Son asamada her item asagı/yukarı scatter
        tl.to(
          Array.from(items),
          {
            ease: "power1",
            yPercent: () => gsap.utils.random(-100, 200),
          },
          ">"
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
      className={cn("sg5-section relative w-full overflow-hidden", className)}
      style={{ perspective: "1200px" }}
    >
      <div
        ref={wrapRef}
        className="sg5-wrap"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: "1rem",
          transformStyle: "preserve-3d",
          width: "120%",
          marginLeft: "-10%",
        }}
      >
        {children.map((child, i) => (
          <div key={i} className="sg5-item" style={{ transformStyle: "preserve-3d" }}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
