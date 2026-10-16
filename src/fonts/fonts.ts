import localFont from "next/font/local";
import {
  Plus_Jakarta_Sans,
  DM_Mono,
} from "next/font/google";

// ─── DISPLAY / BASLIK FONTU — glass (local WOFF2) ──────────────────────────
// Ana sayfadaki ilk bölüm başlıklarında kullanılır; preload CSS keşif gecikmesini önler.
export const displayFont = localFont({
  src: "./glass.woff2",
  variable: "--font-display",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "ui-sans-serif", "sans-serif"],
});

// ─── BODY / IÇERIK FONTU ──────────────────────────────────────────────────────
// Plus Jakarta Sans — temiz, okunabilir, genel metin için
export const bodyFont = Plus_Jakarta_Sans({
  weight: ["400", "600"],
  // latin-ext GEREKLİ: Plus Jakarta Sans'ın "latin" subset'i yalnızca
  // U+0000–00FF (Basic Latin + Latin-1 Supplement: ö, ü, ç, Ö, Ü, Ç) kapsar.
  // Türkçe ğ/ş/İ/ı (U+011E–U+0131, Latin Extended-A) latin-ext'tedir — eski
  // "latin zaten kapsar" yorumu yanlıştı. Tarayıcı ğ/ş içeren metni görünce
  // latin-ext WOFF2'yi CSS keşfinden SONRA indiriyor, kritik zinciri
  // `document → CSS → latin-ext` olarak uzatıyordu (PSI: 805ms, 23.29KiB).
  // Subset listesine ekleyince Next'in `findFontFilesInCss`'i bu dosyayı da
  // preloadable sayar → font, yanıt başlıkları gelir gelmez preload edilir
  // (Next 15.5 bunu `Link: rel=preload; as=font` HTTP başlığı olarak basar;
  // bazı sürümlerde `<link rel="preload">` etiketi olarak) — zincir ikiye iner.
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
  preload: true, // ana içerik fontu — öncelikli yükle
});

// ─── MONO / KOD FONTU ─────────────────────────────────────────────────────────
// DM Mono — kod blokları ve teknik içerik için
export const monoFont = DM_Mono({
  weight: ["400", "500"],
  // latin yeterli: kod bloklarında Türkçe özel karakter kullanılmıyor.
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  // preload AÇIK: DM Mono latin yalnızca ~9 KiB ve ilk ekranda kullanılıyor;
  // preload:false bırakınca PSI kritik zincirinde
  // `document → CSS → DM Mono` (933ms) olarak kuyruğun SONUNA takılıyordu.
  // Preload ile istek yanıt başlıkları gelir gelmez tetiklenir; zincir
  // `document → font` (2 halka) kalır.
  preload: true,
});

// ─── ALIASES (geriye dönük uyumluluk) ─────────────────────────────────────────
export const titleFont = displayFont;
export const titleFontBold = displayFont;
export const bodyFontBase = bodyFont;

// Kaldırılan fontlar için stub — import eden bilesenler bozulmasın
export const Font = { className: "", variable: "" } as const;
