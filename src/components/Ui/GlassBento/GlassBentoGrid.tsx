"use client";
/**
 * GlassBentoGrid — glossy glassmorphism "bento" ızgarası.
 *
 * NEDEN: Standart 4 sütunlu eşit kart grid'i 12 kategoriyi sıkıştırıyordu.
 * Bu bileşen 12 sütunluk asimetrik bir mozaik kullanır: geniş "feature"
 * kartları ile küçük kartlar dönüşümlü yerleşir, böylece bölüm ferah görünür.
 *
 * GÖRSEL KATMANLAR (hepsi dekoratif, işaretlenmiştir):
 *   1. Cam gövde       → backdrop-blur + yarı saydam beyaz zemin + ince kenar
 *   2. Üst yansıma     → kartın üstünden gelen yumuşak beyaz ışık
 *   3. Renkli ısı      → kartın köşesinde kategori renginde bulanık leke
 *   4. İç highlight    → inset gölge ile "kabartılmış cam" hissi
 *   5. Alt kenar ışığı → hover'da beliren ince çizgi
 *
 * ERİŞİLEBİLİRLİK: `href` varsa kart <a>, yoksa <article> olarak basılır.
 * Giriş animasyonu CSS'tir (`home-reveal`); JS çalışmasa da içerik görünür.
 */
import XipIcon from "@/components/Ui/Icon";
import { cn } from "@/utils";
import type { CardItem } from "@/components/Ui/ScrollGrid3D/ScrollGrid3DCards";

/**
 * 12 sütunluk mozaik deseni (lg ve üzeri).
 * Her satır 12'ye tamamlanır: 6+3+3 · 4+4+4 · 3+3+6 · 5+4+3
 */
const BENTO_SPANS = [
  "lg:col-span-6",
  "lg:col-span-3",
  "lg:col-span-3",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-3",
  "lg:col-span-3",
  "lg:col-span-6",
  "lg:col-span-5",
  "lg:col-span-4",
  "lg:col-span-3",
] as const;

/** Geniş kartlar daha büyük tipografi ve nefes payı alır. */
function isFeature(span: string): boolean {
  return span === "lg:col-span-6" || span === "lg:col-span-5";
}

export default function GlassBentoGrid({ items }: { items: CardItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
      {items.map((item, i) => {
        const span = BENTO_SPANS[i % BENTO_SPANS.length];
        const feature = isFeature(span);

        const inner = (
          <>
            {/* 2) Üst yansıma */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-1/2 h-[130%] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.16),transparent_70%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100"
            />
            {/* 3) Kategori renginde ısı */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-70"
              style={{ background: item.color }}
            />

            <div className="relative z-10 flex h-full flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                  <XipIcon
                    name={item.icon}
                    glow="strong"
                    className="h-5 w-5"
                    style={{ color: item.color }}
                  />
                </div>
                {item.badge && (
                  <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-white/70">
                    {item.badge}+
                  </span>
                )}
              </div>

              <div className="mt-auto">
                <h3
                  className={cn(
                    "font-semibold tracking-tight text-white/95",
                    feature ? "text-lg sm:text-xl" : "text-[15px]",
                  )}
                >
                  {item.title}
                </h3>
                <p
                  className={cn(
                    "mt-1.5 leading-relaxed text-blue-100/60",
                    feature ? "text-[13px]" : "text-xs",
                  )}
                >
                  {item.desc}
                </p>
              </div>
            </div>

            {/* 5) Alt kenar ışığı */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          </>
        );

        const cardClassName = cn(
          "group relative flex flex-col overflow-hidden rounded-2xl p-5 sm:p-6",
          "home-reveal",
          // 1) Cam gövde
          "border border-white/[0.14] bg-white/[0.06] backdrop-blur-md",
          // 4) İç highlight + dış gölge
          "shadow-[0_8px_32px_0_rgba(31,38,135,0.35),inset_0_1px_0_rgba(255,255,255,0.16)]",
          "transition-all duration-300 ease-out",
          "hover:-translate-y-1 hover:border-white/35 hover:bg-white/[0.11]",
          "hover:shadow-[0_16px_48px_0_rgba(31,38,135,0.5),inset_0_1px_0_rgba(255,255,255,0.25)]",
          span,
          feature ? "min-h-[188px] sm:col-span-2" : "min-h-[158px]",
        );

        const style = {
          animationDelay: `${i * 55}ms`,
          animationFillMode: "backwards",
        } as const;

        return item.href ? (
          <a
            key={`${item.title}-${i}`}
            href={item.href}
            className={cn(cardClassName, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40")}
            style={style}
          >
            {inner}
          </a>
        ) : (
          <article key={`${item.title}-${i}`} className={cardClassName} style={style}>
            {inner}
          </article>
        );
      })}
    </div>
  );
}
