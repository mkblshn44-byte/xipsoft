/**
 * XipSoft — Global Stil Yardımcıları
 *
 * Tüm değerler Tailwind token sistemine bağlıdır.
 * Ham renk/boyut değeri YAZILMAZ — token sınıfları kullanılır.
 */

const styles = {
  /**
   * Sayfa ana arka planı — tüm sayfalarda tutarlı koyu uzay zemini.
   * SiteLayout'ta <div> üzerine uygulanır.
   * bg-space-950 = #050811 (PALETTE.space[950])
   *
   * `isolate` → bu sarmalayıcı bir yığın (stacking) bağlamı oluşturur.
   * Böylece SiteStarfield'ın `-z-10` katmanı, opak zemini (bg-space-950)
   * kapatmadan ONUN ÜSTÜNDE, normal akış içeriğinin ALTINDA çizilir.
   */
  gradient: "bg-space-950 isolate",

  // Layout yardımcıları
  marginHelper:  "mx-5 lg:mx-0",
  paddingHelper: "px-container lg:px-6",
  container:     "max-w-7xl antialiased mx-auto",

  // Glassmorphism — liquid glass yüzeyler
  squareAbsolute: `
    absolute
    inset-0
    [mask-image:linear-gradient(0deg,#ffffff08,#ffffff20)]
    `,
  squareBackground: "bg-space-800",
  glassomophic:
    "bg-space-800/50 bg-clip-padding backdrop-filter backdrop-blur-lg border-t border-edge",
  cardSurface:
    "bg-space-800 border border-edge rounded-card",

  // Prism gradient metin — link/vurgu için
  prismText:   "bg-gradient-to-r from-neon to-accent-cyan bg-clip-text text-transparent",
  prismBorder: "border border-neon/30",
} as const;

export default styles;
