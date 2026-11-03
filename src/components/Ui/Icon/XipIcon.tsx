import type { CSSProperties, SVGProps } from "react";
import { cn } from "@/utils";
import { ICONS, toIconKey, type IconNode } from "./icon-data";

export type { IconNode };
export { ICON_NAMES, toIconKey } from "./icon-data";

/**
 * XipIcon — sitenin tek ikon bileşeni (özel çizilmiş set, `icon-data.ts`).
 *
 * NEDEN TEK BİLEŞEN
 * ─────────────────
 * • Tutarlılık: kalınlık, kutu (24×24), uç/köşe stili tek yerden yönetilir.
 * • Erişilebilirlik: dekoratif ikonlar varsayılan olarak a11y ağacından
 *   çıkarılır (`aria-hidden`); anlam taşıyan ikonlara `label` verilir.
 * • Performans: tek `<svg>` + birkaç `<path>`; ek bağımlılık yok.
 *
 * KULLANIM
 * ```tsx
 * <XipIcon name="shield-check" className="h-5 w-5 text-neon-500" />
 * <XipIcon name="ArrowRight" decorative={false} label="Devam" />  // a11y adı
 * ```
 */
export interface XipIconProps extends Omit<SVGProps<SVGSVGElement>, "name" | "ref"> {
  /** `icon-data.ts` anahtarı veya lucide uyumlu ad (ör. "ArrowRight"). */
  name: string;
  /**
   * Simgenin boyutu. Verilmezse `1em` → ikon bulunduğu metnin boyutuna uyar.
   * `className` içinde `h-*`/`w-*` verilirse CSS sınıfı bu değeri geçersiz kılar.
   */
  size?: number | string;
  /** Çizgi kalınlığı (24×24 ızgarada). Tüm set 1,7 ile çizildi. */
  strokeWidth?: number;
  /**
   * Arka ışık (hâle) yoğunluğu. İkonun rengi korunur; ışık ikonun
   * ARKASINDAN gelir ve rengi `halo` ile seçilir.
   * • `"soft"` (varsayılan) — çoğu arayüz ikonu için dengeli hâle.
   * • `"strong"` — hero/başlık gibi öne çıkması gereken ikonlar.
   * • `"none"` — yoğun/animasyonlu listeler (ör. teknoloji şeridi) ya da
   *   kabında zaten kendi ışığı olan ikonlar için.
   * Mobilde (≤768px) ve reduced-motion tercihinde filtre kapatılır.
   */
  glow?: "none" | "soft" | "strong";
  /**
   * Arka ışığın RENGİ.
   * • `"white"` (varsayılan) — ikincil arayüz ikonları.
   * • `"red"` — birincil/öne çıkan ikonlar (CTA, LED gösterge, hızlı
   *   eylem). Kırmızı yalnızca bu LED ışığında kullanılır; geniş zemin
   *   parıltısı olarak DEĞİL.
   */
  halo?: "white" | "red";
  /**
   * `true` (varsayılan) → ikon dekoratiftir, ekran okuyucular atlar.
   * `false` → `label` zorunlu; ikon `role="img"` + `aria-label` alır.
   */
  decorative?: boolean;
  /** `decorative={false}` iken erişilebilir ad. */
  label?: string;
  style?: CSSProperties;
}

const DEFAULT_STROKE = 1.7;

const GLOW_CLASS: Record<"soft" | "strong", string> = {
  soft: "xip-icon--glow-soft",
  strong: "xip-icon--glow-strong",
};

export default function XipIcon({
  name,
  size,
  strokeWidth = DEFAULT_STROKE,
  glow = "soft",
  halo = "white",
  decorative = true,
  label,
  className,
  style,
  ...rest
}: XipIconProps) {
  const nodes: IconNode[] = ICONS[toIconKey(name)] ?? ICONS.globe;

  // Erişilebilir ad verilmediyse ikon dekoratif kabul edilir (çift okuma olmaz).
  const isDecorative = decorative || !label;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size ?? "1em"}
      height={size ?? "1em"}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      className={cn(
        "inline-block shrink-0",
        glow !== "none" && GLOW_CLASS[glow],
        glow !== "none" && halo === "red" && "xip-icon--halo-red",
        className,
      )}
      style={style}
      aria-hidden={isDecorative ? "true" : undefined}
      role={isDecorative ? undefined : "img"}
      aria-label={isDecorative ? undefined : label}
      {...rest}
    >
      {nodes.map((node, i) => {
        switch (node.k) {
          case "c":
            return <circle key={i} cx={node.cx} cy={node.cy} r={node.r} />;
          case "n":
            return (
              <circle
                key={i}
                cx={node.cx}
                cy={node.cy}
                r={node.r}
                fill="currentColor"
                stroke="none"
              />
            );
          case "f":
            return <path key={i} d={node.d} fill="currentColor" stroke="none" />;
          default:
            return <path key={i} d={node.d} />;
        }
      })}
    </svg>
  );
}
