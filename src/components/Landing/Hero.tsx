"use client";

/**
 * Hero — Neon Landing ana bölümü (neonblack-main `hero` uyarlaması).
 *
 * UYARLAMA NOTLARI:
 * - shadcn token sınıfları XipSoft `neon` paletine çevrildi
 *   (`bg-background` → `bg-neon-bg`, `text-primary` → `text-neon-primary` …).
 * - `var(--primary)` / `var(--accent)` gölgeleri sabit marka renklerine
 *   (violet `#a78bfa`, cyan `#ddd6fe`) dönüştürüldü.
 * - İki varyant destekler:
 *   · `variant="home"` (varsayılan): tam ekran (h-svh) anasayfa hero'su.
 *   · `variant="page"`             : alt sayfalar için kompakt (~68vh) hero.
 * - `copy` ile tüm metinler dışarıdan verilir; verilmezse neonblack
 *   varsayılan metinleri (anasayfa) gösterilir.
 * - `stats` verilirse hero altında neon istatistik şeridi render edilir.
 * - `onCtaPrimary` verilirse birincil CTA `<button>` olur (ör. teklif
 *   modalını açar); aksi halde `ctaPrimaryHref`e (varsayılan `/teklif`)
 *   `<Link>` olarak bağlanır.
 * - `SiteHeader` bu bileşenden ÇIKARILDI; XipSoft'ta `Navbar` ayrı bileşen
 *   olarak render edilir (çift menü olmaması için).
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import type { HomeHeroCopy } from "@/types/common";
import { cn } from "@/utils";
import { teklifModal } from "@/components/Common/TeklifModal/TeklifModal";

// SpaceCanvas: WebGL2 shader + RAF loop — büyük, sadece hero'da kullanılır.
// Lazy load ile initial bundle'dan ayrılır; hydration sırasında main thread
// bloke etmez. Yükleme sırasında bg-neon-bg ile arka plan görünür kalır.
//
// ÖNEMLİ (CLS): loading placeholder 'absolute inset-0' OLMALIDIR. Gerçek
// SpaceCanvas kökü zaten `absolute inset-0 -z-10` — normal akış dışı. Eğer
// placeholder in-flow bırakılırsa, chunk yüklenene kadar section'ın flex
// satırında iki öğe olur: placeholder (width:100%) + hero kabı (w-full).
// İkisi toplam 412'yi aştığından flex-shrink her ikisini ~yarıya büzer —
// hero kabı yükleme boyunca ~219px'te tutulur ve SpaceCanvas mount
// olunca (placeholder absolute olan gerçek kökle değiştiğinde) 412'ye
// "fırlayarak" ~0.2 CLS üretir. Placeholder'ı en baştan absolute yapmak
// bu kaymayı tamamen ortadan kaldırır.
const SpaceCanvas = dynamic(() => import("./SpaceCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 -z-10 size-full bg-neon-bg" />,
});

export interface HeroStat {
  value: string;
  label: string;
}

export interface HeroContent extends Partial<HomeHeroCopy> {
  /** Tek satırlık başlık; `titleLine1` için kısayol. */
  title?: string;
  /** Birincil CTA hedefi (`onCtaPrimary` yoksa kullanılır). */
  ctaPrimaryHref?: string;
  /** İkincil CTA hedefi (varsayılan alt sayfa: `/hizmetler/web-yazilim-tasarim`). */
  ctaSecondaryHref?: string;
  /** İstatistik şeridi (alt sayfa hero'sunda gösterilir). */
  stats?: HeroStat[];
}

interface HeroProps {
  /** Sayfa metinleri. Anasayfada DB'den gelen `HomeHeroCopy` geçilir. */
  copy?: HeroContent;
  /** "home" = tam ekran · "page" = alt sayfa kompakt hero. */
  variant?: "home" | "page";
  /** Birincil CTA tıklaması; verilirse buton olarak render edilir. */
  onCtaPrimary?: () => void;
  className?: string;
}

const DEFAULTS = {
  titleLine1: "Markanızı yeni bir",
  titleLine2: "yörüngeye",
  titleLine3: "taşıyın",
  subtitle:
    "Kurumsal web tasarım, mobil uygulama ve dijital marka danışmanlığıyla küçük ekranlarda büyük başarı",
  subtitleHighlight: "hikâyeleri",
  subtitleEnd: "yazıyoruz.",
  ctaPrimary: "Teklif Al",
  ctaSecondary: "Projelerimiz",
  ctaSecondaryHref: "/references",
} as const;

export default function Hero({
  copy,
  variant = "home",
  onCtaPrimary,
  className,
}: HeroProps) {
  const isHome = variant === "home";

  const titleLine1 =
    copy?.titleLine1 ?? copy?.title ?? (isHome ? DEFAULTS.titleLine1 : "");
  const titleLine2 = copy?.titleLine2 ?? (isHome ? DEFAULTS.titleLine2 : "");
  const titleLine3 = copy?.titleLine3 ?? (isHome ? DEFAULTS.titleLine3 : "");
  const subtitle = copy?.subtitle ?? (isHome ? DEFAULTS.subtitle : "");
  const subtitleHighlight =
    copy?.subtitleHighlight ?? (isHome ? DEFAULTS.subtitleHighlight : "");
  const subtitleEnd = copy?.subtitleEnd ?? (isHome ? DEFAULTS.subtitleEnd : "");
  const ctaPrimary = copy?.ctaPrimary ?? DEFAULTS.ctaPrimary;
  const ctaSecondary =
    copy?.ctaSecondary ?? (isHome ? DEFAULTS.ctaSecondary : "Hizmetleri İncele");
  const ctaPrimaryHref = copy?.ctaPrimaryHref ?? (isHome ? "/teklif" : undefined);
  const ctaSecondaryHref =
    copy?.ctaSecondaryHref ??
    (isHome ? DEFAULTS.ctaSecondaryHref : "/hizmetler/web-yazilim-tasarim");
  const stats = copy?.stats ?? [];

  // Animasyon gecikmeleri: anasayfa sinematik, alt sayfalar daha hızlı.
  const delay = (home: string, page: string) => (isHome ? home : page);

  const primaryCls =
    "group inline-flex items-center gap-2 rounded-full bg-neon-primary px-7 py-3.5 text-sm font-medium text-neon-bg shadow-[0_0_32px_-4px_#a78bfa] transition-shadow hover:shadow-[0_0_48px_0_#a78bfa]";
  const secondaryCls =
    "inline-flex items-center rounded-full border border-neon-fg/15 px-7 py-3.5 text-sm font-medium text-neon-fg backdrop-blur transition-colors hover:border-neon-accent hover:text-neon-accent";

  const primaryInner = (
    <>
      {ctaPrimary}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
    </>
  );

  return (
    <section
      className={cn(
        "relative isolate flex w-full justify-center overflow-hidden bg-neon-bg",
        isHome ? "h-svh min-h-[640px] items-start" : "min-h-[68vh] items-center",
        className,
      )}
    >
      <SpaceCanvas className="absolute inset-0 -z-10" />

      <div
        className={cn(
          // w-full: hero kabı flex satırının TEK öğesi olduğunda (placeholder
          // artık absolute) en baştan tam genişlikte çizilir. Yazı tipi swap'ı
          // sırasında başlık satırlarının yeniden sarılması py-'yi değiştirmez;
          // kabın genişliği sabit kaldığı için kap-bazlı CLS oluşmaz.
          "flex w-full flex-col items-center gap-6 px-6 text-center",
          isHome
            ? "max-w-4xl pt-32 [@media(min-height:800px)]:pt-44"
            : "max-w-4xl py-24 lg:py-28",
        )}
      >
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance text-neon-fg sm:text-6xl lg:text-7xl">
          {titleLine1 && (
            <span
              className={cn(
                "block animate-hero-up",
                delay("[animation-delay:0s]", "[animation-delay:0.1s]"),
              )}
            >
              {titleLine1}
            </span>
          )}
          {(titleLine2 || titleLine3) && (
            <span
              className={cn(
                "block animate-hero-up",
                delay("[animation-delay:0.08s]", "[animation-delay:0.15s]"),
              )}
            >
              {titleLine2 && (
                <span className="text-neon-primary [text-shadow:0_0_28px_#a78bfa]">
                  {titleLine2}
                </span>
              )}
              {titleLine2 && titleLine3 ? " " : null}
              {titleLine3}
            </span>
          )}
        </h1>

        {subtitle && (
          <p
            className={cn(
              "max-w-xl animate-hero-rise text-base leading-relaxed text-pretty text-neon-muted [text-shadow:0_1px_14px_#050811] md:text-xl",
              delay("[animation-delay:0.18s]", "[animation-delay:0.25s]"),
            )}
          >
            {subtitle}
            {subtitleHighlight ? (
              <>
                {" "}
                <span className="text-neon-fg/90">{subtitleHighlight}</span>
              </>
            ) : null}
            {subtitleEnd ? <> {subtitleEnd}</> : null}
          </p>
        )}

        <div
          className={cn(
            "flex animate-hero-rise flex-col items-center gap-3 sm:flex-row",
            delay("[animation-delay:0.26s]", "[animation-delay:0.3s]"),
          )}
        >
          {onCtaPrimary ? (
            <button type="button" onClick={onCtaPrimary} className={primaryCls}>
              {primaryInner}
            </button>
          ) : ctaPrimaryHref ? (
            <Link href={ctaPrimaryHref} className={primaryCls}>
              {primaryInner}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => teklifModal.open()}
              className={primaryCls}
            >
              {primaryInner}
            </button>
          )}

          {ctaSecondaryHref && (
            <Link href={ctaSecondaryHref} className={secondaryCls}>
              {ctaSecondary}
            </Link>
          )}
        </div>

        {stats.length > 0 && (
          <div
            className={cn(
              "mt-4 flex w-full animate-hero-rise flex-wrap items-center justify-center gap-x-12 gap-y-6 border-t border-neon-fg/10 pt-8",
              delay("[animation-delay:0.34s]", "[animation-delay:0.35s]"),
            )}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1"
              >
                <span className="bg-gradient-to-br from-white to-neon-primary bg-clip-text text-2xl font-black leading-none tabular-nums text-transparent md:text-3xl">
                  {stat.value}
                </span>
                <span className="text-xs font-medium uppercase tracking-widest text-neon-muted">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isHome && (
        <a
          href="#home-content"
          className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 animate-hero-fade flex-col items-center gap-3 text-xs uppercase tracking-widest text-neon-fg/70 transition-colors [animation-delay:0.4s] hover:text-neon-accent [@media(min-height:800px)]:flex"
        >
          Keşfet
          <span className="relative h-10 w-px overflow-hidden bg-neon-fg/20">
            <span className="absolute inset-x-0 top-0 h-1/2 animate-scroll-line bg-neon-accent" />
          </span>
        </a>
      )}
    </section>
  );
}
