import { Chakra_Petch, Open_Sans, Orbitron } from "next/font/google";

// NOT (next/font kısıtı): `preload` değeri DEĞİŞKEN/ENV OLAMAZ. SWC font
// loader seçenekleri statik okur ve literal dışı değeri
// "Font loader values must be explicitly written literal" ile reddeder (build
// bu hatayla 500 verir). Dev'daki 4 adet "was preloaded using link preload but
// not used" uyarısı bu yüzden kapılamaz; nedeni zararsız: dev preload
// bağlantıları HTML head'inde değil hydration'daki RSC akışından (`:HL[...]`)
// enjekte ediliyor, CSS fontu o anda zaten istediği için preload cevabı
// "kullanılmamış" sayılıyor. Prod'da manifest head'e yazılıyor
// (next.config.mjs Windows font-manifest plugin'i) ve uyarı üretemez.
// ─── DISPLAY / BAŞLIK FONTU ─────────────────────────────────────────────────
// Chakra Petch — köşeli, keskin "çelik" başlık fontu (marka kimliği).
// NOT: next/font bu sürümde Chakra Petch'i STATİK ağırlıklı tanımlar (değişken
// ekseni yok) → `weight` zorunlu.
//
// PERF (LCP): `preload: true`, preload edilen HER ağırlık × subset için
// <head>'e <link rel=preload> yazar. Tek bildirimde 4 ağırlık × 2 subset =
// 8 dosya (~90 KB) preload ediliyordu; emüle Slow 4G'de bu, hero başlığının
// fontunu geciktirip Chrome'un "paint holding"i ile LCP'yi 7.2 s'ye taşıdı
// (ölçüm: lh_prod2.json, LCP adayı = h1.hero-title span'ı).
// Bu yüzden iki bildirim: yalnızca hero'nun kullandığı 600 preload edilir
// (`font-display font-semibold`), 400/500/700 CSS keşfinden sonra gelir.
// @font-face'lerin heği basılmaya devam eder → görünüm birebir aynı.
const displayFontCritical = Chakra_Petch({
  subsets: ["latin", "latin-ext"],
  weight: ["600"],
  variable: "--font-display",
  display: "swap",
  preload: true,
});

const displayFontRest = Chakra_Petch({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

export const displayFont = {
  variable: displayFontCritical.variable,
  // variable bildirimlerde className boş; her iki instance de referanslı kalsın.
  className: `${displayFontCritical.className} ${displayFontRest.className}`,
};

// ─── BODY / IÇERIK FONTU ──────────────────────────────────────────────────────
// Open Sans — okunabilir genel metin fontu. Ağırlık belirtilmediğinde
// next/font değişken font eksenini kullanır.
export const bodyFont = Open_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
  preload: true, // ana içerik fontu — öncelikli yükle (literal şart, yukarıdaki not)
});

// NOT (PERF): değişken font — 6 statik ağırlık (400–900) yerine tek WOFF2.
// Orbitron wght 400–900 eksenini içerir; `font-weight: 400` (globals.scss
// `.navbar`) ve Tailwind kalınlıkları aynı dosyadan karşılanır.
export const navbarFont = Orbitron({
  // Orbitron yalnızca `latin` subset'i sunar (latin-ext YOK) → Türkçe
  // ğ/ş/ı/İ karakterleri fallback fonttan gelir. Bilinçli tercih.
  subsets: ["latin"],
  variable: "--font-navbar",
  display: "swap",
  // NOT (PERF): preload KAPALI — navbar metni LCP adayı değil; kritik yolda
  // yer kaplamaması için CSS keşfinden sonra yüklenir.
  preload: false,
});

// ─── ALIASES (geriye dönük uyumluluk) ─────────────────────────────────────────
// Playfair Display + Cinzel emekli: çelik kimliğinde yuvarlak serif yok.
// `font-luxury` / `font-premium` sınıf adları tailwind tarafında sırasıyla
// display (Chakra Petch) ve navbar (Orbitron) fontuna bağlı.
export const titleFont = displayFont;
export const titleFontBold = displayFont;
export const bodyFontBase = bodyFont;

// Kaldırılan fontlar için stub — import eden bilesenler bozulmasın
export const Font = { className: "", variable: "" } as const;
