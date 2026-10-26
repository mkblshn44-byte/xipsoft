/**
 * XipSoft — Merkezi Renk Paleti (TEK DOĞRULUK KAYNAĞI / single source of truth)
 *
 * MARKA: "Neon Siyah Uzay" — düz siyah zemin, yıldız alanı, mor/lavanta vurgular.
 *  - Uzay Siyahı (#050811) zemin + Kömür (#0b0f19) yüzey
 *  - Slate tipografi (#94a3b8 ikincil) + saf beyaz başlıklar
 *  - Tek aksan ailesi: Neon mor (lavanta) #a78bfa
 *
 * TOKEN ADI DONUMU:
 *  `space.*`, `neon.*`, `accentRamp`, `electro`, `titanium`, `metal.*`,
 *  `accent.gold*`, `radius`, `chamfer`, `glass` adları tailwind.config.ts,
 *  `src/lib/brand-color.ts` ve `src/styles/colors-glass.css` tarafından okunur.
 *  Adlar KORUNUR, yalnızca DEĞERLER mor/siyah paletine bağlanmıştır.
 *
 *  Bu değerleri okuyanlar:
 *    1) `tailwind.config.ts`  → `space.*`, `neon.*`, `titanium.*` utility sınıfları
 *    2) `src/config/brand.config.ts` → `BRAND_COLORS` (inline style'lar)
 *    3) `src/styles/colors-glass.css` → CSS değişkenleri (--space-*, --neon-*,
 *       --titanium-*, --metal-*)
 *    NOT: CSS, TS'i import edemediği için hex'ler colors-glass.css içine
 *    birebir yansıtılır. Burayı değiştirip CSS'i senkronlamayı unutma.
 *
 * Renk değerlerini DEĞİŞTİRECEĞİNİZ tek yer burasıdır.
 */

/**
 * Neon mor (lavanta) skalası — 50 açık → 950 koyu.
 * 400 = ANA VURGU (#a78bfa), 300 = parlak vurgu metni, 600 = gradyan ucu.
 *
 * `cyan` / `teal` / `sky` / `blue` / `violet` / `amber` / `yellow` ... Tailwind
 * aileleri bu skalayı kullanır: sitede renk kalmaz, tüm vurgular tek mor
 * ailesinden gelir. Eski sınıf adları çalışmaya devam eder.
 */
const VIOLET_RAMP = {
  50: "#f5f3ff",
  100: "#ede9fe",
  200: "#ddd6fe", // açık lavanta — ikincil vurgu
  300: "#c4b5fd", // hover / parlak çizgi
  400: "#a78bfa", // NEON MOR — ANA VURGU (buton, ikon, aktif durum)
  500: "#8b5cf6", // basılı / gradient ucu
  600: "#7c3aed", // derin gradient
  700: "#6d28d9",
  800: "#5b21b6",
  900: "#4c1d95",
  950: "#2e1065",
} as const;

/**
 * Slate grisi — nötr ölçek (marka grisi #94a3b8 = 400).
 * `gray` / `zinc` / `slate` / `neutral` / `stone` aileleri buraya eşlenir;
 * yüzey, çizgi ve ikincil metin bu skaladadır.
 */
const SLATE_RAMP = {
  50: "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8", // SLATE GRİSİ — ikincil metin, çizgi
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
  950: "#020617",
} as const;

export const PALETTE = {
  /** Uzay / galaksi zeminleri (en koyudan açığa) */
  space: {
    950: "#050811", // Uzay Siyahı — ana zemin
    900: "#070b16", // hafif yükseltilmiş yüzey
    800: "#0b0f19", // kart / panel zemini
    700: "#121826", // hover / sınır bölgesi
  },

  /** Neon mor (lavanta) — birincil vurgu */
  neon: {
    300: "#ddd6fe", // parlak metin / ikon
    400: "#c4b5fd", // hover
    500: "#a78bfa", // ANA VURGU (primary)
    600: "#8b5cf6", // basılı / gradient ucu
    700: "#7c3aed", // derin gradient
  },

  /** Nötr (gri) yüzey/çizgi skalası (50–950) — eski token adı korunur */
  titanium: SLATE_RAMP,

  /** Mor aksanın tam ton skalası (50–950) — eski token adı korunur */
  electro: VIOLET_RAMP,

  /** Marka aksanının tam ton skalası — `cyan`/`teal`/`sky`/`blue`/`violet` …
   *  aileleri bu skalaya eşlenir (bkz. tailwind.config.ts). */
  accentRamp: VIOLET_RAMP,

  /** Marka aksanları ve semantik durum renkleri */
  accent: {
    /** İkincil — açık lavanta. */
    cyan: "#ddd6fe",
    /** Hata/danger — mor (palet dışı renk yok). */
    rose: "#a78bfa",
    // Eski `gold*` adları yalnızca mevcut tüketiciler (tailwind.config,
    // colors-glass.css, brand.config) için yaşar; DEĞERLERİ mor lavantadır.
    gold: "#a78bfa",
    goldLight: "#c4b5fd",
    goldDark: "#7c3aed",
    /** Nötr ikincil metin. */
    platinum: SLATE_RAMP[400],
    /** @deprecated Eski token adı — success; değer açık lavantadır. */
    emerald: "#ddd6fe",
  },

  /** Mor gradyan (açık → ana → koyu) — hap butonlar / CTA dolgu */
  goldGradient: {
    start: "#c4b5fd",
    mid: "#a78bfa",
    end: "#8b5cf6",
  },

  /**
   * Yüzey durakları — `linear-gradient` içinde ışık geçişi olarak kullanılır.
   * Mor/siyah temasında bunlar uzay zemininin tonlarıdır.
   */
  metal: {
    shadow: "#050811",
    base: "#0b0f19",
    raised: "#121826",
    sheen: "#1e293b",
    highlight: "#c4b5fd",
    /** Kart/panel yüzeyi için gradyan (cam yüzey) */
    surfaceGradient:
      "linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 45%, rgba(167,139,250,0.05) 100%)",
    /** Başlık/CTA dolgu gradyanı */
    barGradient:
      "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 45%, #8b5cf6 100%)",
  },

  /** Tipografi (beyaz → slate gri) */
  text: {
    heading: "#ffffff", // Başlıklar — Saf Beyaz
    body: "#cbd5e1",    // Gövde metni
    muted: "#94a3b8",   // İkincil / açıklama
    dim: "#64748b",     // En soluk / alt bilgiler
  },

  /** Yarı şeffaf kenarlıklar */
  border: {
    base: "rgba(255,255,255,0.06)",
    hover: "rgba(255,255,255,0.12)",
    neon: "rgba(157,114,255,0.35)",
    neonStrong: "rgba(157,114,255,0.55)",
  },

  /** Yarı şeffaf kart yüzeyleri (liquid glass) */
  card: {
    bg: "rgba(255,255,255,0.02)",
    bgHover: "rgba(255,255,255,0.04)",
    tagBg: "rgba(255,255,255,0.04)",
  },

  /**
   * Hareket (Motion) — yumuşak, salınımsız geçişler.
   * `easeSlash` tek yönlü hızlı süpürmeler (glint/şerit) içindir.
   */
  motion: {
    easeStandard: "cubic-bezier(0.4, 0, 0.2, 1)",
    easePremium: "cubic-bezier(0.16, 1, 0.3, 1)",
    easeEntrance: "cubic-bezier(0.16, 1, 0.3, 1)",
    easeSlash: "cubic-bezier(0.85, 0, 0.15, 1)",
    duration: {
      fast: "120ms",
      base: "200ms",
      slow: "360ms",
    },
  },

  /**
   * YUVARLAK HATLAR — mor/siyah uzay teması yumuşak köşeler kullanır.
   * `chamfer` (pah/kesim) devre dışı: değerler 0 → clip-path dikdörtgen kalır,
   * sınıf adları (`chamfer-md` vb.) bozulmaz.
   */
  radius: {
    control: "0.5rem", // buton, input, küçük panel
    card: "0.75rem",   // kartlar, section blokları
    pill: "9999px",    // hap buton / yuvarlak rozet
  },

  /** 45° pah boyutları — kapalı (0px) olduğu için köşe kesimi yapılmaz */
  chamfer: {
    sm: "0px",
    md: "0px",
    lg: "0px",
  },

  /**
   * Cam yüzey blur parametreleri — liquid glass: yüksek blur + yüksek saturate.
   */
  glass: {
    blur: "20px",
    saturate: "140%",
  },
} as const;

export type Palette = typeof PALETTE;
