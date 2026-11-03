"use client";
/**
 * Scrollgrid3DCards
 * Kart grid'i. Giriş animasyonu CSS (`home-reveal`) ile yapılır; böylece
 * JS çalışmasa da (SSR / no-JS) kartlar görünür kalır.
 * Tıklanabilir, hover efektli, href destekli.
 */
import XipIcon from "@/components/Ui/Icon";

export interface CardItem {
  /** XipSoft özel ikon adı (ör. "globe", "shield-check"). */
  icon: string;
  color: string;
  title: string;
  desc: string;
  badge?: string;
  href?: string;
}

interface Props {
  items: CardItem[];
  columns?: number;
  /** @deprecated Giriş yönü artık CSS ile sabit; geriye dönük uyumluluk için duruyor. */
  animType?: "type1" | "type3";
  /** Tüm kartlara tek renk border/glow (kart rengi override) */
  uniformColor?: string;
}

export default function Scrollgrid3DCards({ items, columns = 4, uniformColor }: Props) {
  return (
    <div
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
          const cardColor = uniformColor ?? item.color;

          const cardInner = (
            <div
              className="group relative w-full h-full flex flex-col gap-3 p-5 cursor-pointer select-none card home-service-card"
              style={{
                boxShadow: "inset 0 1px 0 rgba(203, 213, 225,0.10), 0 4px 24px rgba(5, 8, 17,0.55)",
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

              {/* Ikon — arkasına beyaz ışık vurmuş yuva */}
              <div
                className="icon-backlight w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative z-10"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${cardColor}40`,
                }}
              >
                <XipIcon name={item.icon} glow="strong" className="w-5 h-5" style={{ color: cardColor }} />
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
            <div
              key={`${item.title}-${i}`}
              className="home-reveal"
              style={{
                aspectRatio: "1.5",
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
