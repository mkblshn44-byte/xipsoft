import { cn } from "@/utils";
import XipIcon from "@/components/Ui/Icon";

/**
 * ScrollIndicator — "Daha fazlası" kaydırma göstergesi.
 *
 * TASARIM
 * ───────
 * • Etiket: ölçülü 3B duruş (`rotateX`) + katmanlı gölge/ışık → düz metin
 *   yerine hafif derinlik. Metin kontrastı korunur (beyaz, okunaklı).
 * • Gösterge: BEYAZ LED ray; içinden aşağı doğru ilerleyen beyaz ışık şeridi
 *   ve altında aşağı süzülen beyaz ok. Işık `drop-shadow` ile parlar.
 *
 * ERİŞİLEBİLİRLİK / PERFORMANS
 * ────────────────────────────
 * • Işık ve ok katmanı `aria-hidden` → ekran okuyucu yalnızca bağlantıyı ve
 *   etiketi duyurur (dekoratif hareket tekrarlanmaz).
 * • Animasyonlar yalnızca `transform`/`opacity` kullanır (compositor).
 * • `prefers-reduced-motion: reduce` altında evrensel kural animasyonları
 *   durdurur; gösterge statik ama okunur kalır.
 * • ≤768px'te mobil kural animasyonları kapatır; bu göstergenin ışığı küçük
 *   bir transform olduğu için globals.scss'teki "mobil istisna" bloğunda
 *   yeniden etkinleştirilir.
 */
interface ScrollIndicatorProps {
  href: string;
  label?: string;
  placement?: "hero" | "inline";
  className?: string;
}

export default function ScrollIndicator({
  href,
  label = "Keşfet",
  placement = "inline",
  className,
}: ScrollIndicatorProps) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex flex-col items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70 transition-colors duration-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-space-950",
        placement === "hero" &&
          "absolute bottom-8 left-1/2 hidden -translate-x-1/2 animate-hero-fade gap-3 text-xs tracking-widest [animation-delay:0.4s] [@media(min-height:800px)]:flex",
        className
      )}
    >
      {/* Ölçülü 3B etiket */}
      <span className="scroll-indicator-label">{label}</span>

      {/* Beyaz LED ray + aşağı ilerleyen ışık + ok */}
      <span aria-hidden="true" className="relative flex flex-col items-center">
        <span
          className={cn(
            "relative block w-px overflow-hidden bg-white/15",
            placement === "hero" ? "h-10" : "h-8"
          )}
        >
          <span className="animate-scroll-line absolute inset-x-0 top-0 h-1/3 bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
        </span>
        <XipIcon
          name="chevron-down"
          glow="strong"
          halo="red"
          className="animate-scroll-arrow mt-1 h-3.5 w-3.5 text-white"
        />
      </span>
    </a>
  );
}
