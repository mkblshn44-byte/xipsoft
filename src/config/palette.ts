/**
 * XipSoft — Merkezi Renk Paleti (TEK DOĞRULUK KAYNAĞI / single source of truth)
 *
 * Amaç (DRY):
 *  - Koyu uzay teması, neon mor (lavanta) vurgular ve beyaz/gri tipografi
 *    tonlarını tek bir merkezde tanımlamak.
 *  - Bu değerler şu tüketiciler tarafından okunur:
 *      1) `tailwind.config.ts`  → `space.*`, `neon.*` utility sınıfları
 *         (`bg-space-950`, `text-neon-500`, ...)
 *      2) `src/config/brand.config.ts` → `BRAND_COLORS` (inline style'lar)
 *      3) `src/styles/colors-glass.css` → CSS değişkenleri (--space-*, --neon-*)
 *         NOT: CSS, TS'i import edemediği için bu dosyadaki hex değerleri
 *         colors-glass.css içinde birebir yansıtılır. Bu dosya tek kaynaktır;
 *         CSS tarafını değiştirmeden önce burayı güncelleyin.
 *
 * Renk değerlerini DEĞİŞTİRECEĞİNİZ tek yer burasıdır.
 */

export const PALETTE = {
  /** Uzay / galaksi zeminleri (en koyudan açığa) */
  space: {
    950: "#050811", // ana sayfa zemini
    900: "#070b16", // hafif yükseltilmiş yüzey
    800: "#0b0f19", // kart / panel zemini
    700: "#121826", // hover / sınır bölgesi
  },

  /** Neon mor (lavanta) — birincil vurgu
   *  Tüm sitede tutarlı mor/lavanta tonu. Değiştirmek için sadece bu dosyayı düzenle.
   */
  neon: {
    300: "#ddd6fe", // parlak metin / ikon  (violet-200)
    400: "#c4b5fd", // hover               (violet-300)
    500: "#a78bfa", // ANA VURGU (primary) (violet-400 — sitewide standart)
    600: "#8b5cf6", // basılı / gradient ucu (violet-500)
    700: "#7c3aed", // derin gradient       (violet-600)
  },

  /** İkincil aksanlar — SİTE GENELİ: yalnızca neon mor (birincil) + cyan (ikincil).
   *  rose/gold/emerald anahtarları geriye dönük uyumluluk için korunur ama
   *  artık marka tonlarına (mor/cyan) işaret eder — palet dışı renk yok. */
  accent: {
    cyan: "#ddd6fe",    // ikincil — cyan
    rose: "#a78bfa",    // (eski rose)  → mor
    gold: "#a78bfa",    // (eski gold)  → mor
    emerald: "#ddd6fe", // (eski emerald) → cyan
  },

  /** Tipografi */
  text: {
    heading: "#ffffff", // başlıklar — saf beyaz
    body: "#cbd5e1", // gövde metni
    muted: "#94a3b8", // ikincil / açıklama
    dim: "#64748b", // en soluk
  },

  /** Kenarlıklar */
  border: {
    base: "rgba(255,255,255,0.06)",
    hover: "rgba(255,255,255,0.12)",
    neon: "rgba(157,114,255,0.35)",
    neonStrong: "rgba(157,114,255,0.55)",
  },

  /** Kart yüzeyleri (liquid glass) */
  card: {
    bg: "rgba(255,255,255,0.02)",
    bgHover: "rgba(255,255,255,0.04)",
    tagBg: "rgba(255,255,255,0.04)",
  },
} as const;

export type Palette = typeof PALETTE;
