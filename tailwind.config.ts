import type { Config } from "tailwindcss";
import { PALETTE } from "./src/config/palette";

/**
 * XipSoft — Tailwind Konfigürasyonu
 *
 * RENK KURALI (DRY):
 *  Tüm renkler → src/config/palette.ts → PALETTE nesnesi üzerinden gelir.
 *  Bu dosyada ham hex değer YAZILMAZ; PALETTE.* referansı kullanılır.
 *  İstisna: CSS değişken alias'ları (var(--...)) — runtime dinamik değerler.
 *
 * TOKEN HİYERARŞİSİ:
 *  space.*   → Arka plan zemin katmanları (bg-space-950, bg-space-800 ...)
 *  neon.*    → Mor/lavanta birincil vurgu paleti
 *  accent.*  → Cyan, rose, gold, emerald — ikincil vurgular
 *  ink.*     → Tipografi renkleri (text-ink, text-ink-secondary ...)
 *  border.*  → Kart/sınır renkleri
 *  brand.*   → Geriye dönük uyumluluk (eski bileşenler) — yeni kodda KULLANMA
 */

/**
 * Palet dışı Tailwind renk aileleri → marka sistemine bağlanır.
 *
 * KARAR (site geneli tek renk kimliği):
 *   • Birincil  → Neon mor  #a78bfa  (violet-400)
 *   • İkincil   → Cyan      #ddd6fe  (cyan-400)
 *   • amber / emerald / rose / gold / blue / indigo / purple / orange … gibi
 *     rastgele renkler TAMAMEN ayıklanır; aşağıdaki aileler marka tonlarına
 *     eşlenir ki eski sınıflar da tutarlı render edilsin.
 *   • `red` ve grayscale aileleri (zinc/gray/slate/neutral) bilinçli olarak
 *     DEĞİŞTİRİLMEZ: `red` yalnızca hata/yıkıcı (danger) anlamı taşır.
 */
const C = {
  violet: {
    50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd",
    400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9",
    800: "#5b21b6", 900: "#4c1d95", 950: "#2e1065",
  },
  cyan: {
    50: "#ecfeff", 100: "#cffafe", 200: "#a5f3fc", 300: "#67e8f9",
    400: "#ddd6fe", 500: "#06b6d4", 600: "#0891b2", 700: "#0e7490",
    800: "#155e75", 900: "#164e63", 950: "#083344",
  },
} as const;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "375px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body:    ["var(--font-body)", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
      },

      colors: {
        // ══════════════════════════════════════════════════════════════════
        // ── BIRINCIL TOKEN SETİ — Tüm yeni kodlar bunları kullanır ────────
        // ══════════════════════════════════════════════════════════════════

        /**
         * space.*  — Uzay/galaksi arka plan zemin katmanları
         * Kullanım: bg-space (default: #050811), bg-space-800, bg-space-700
         */
        space: {
          DEFAULT: PALETTE.space[950],   // bg-space → ana zemin (#050811)
          950:     PALETTE.space[950],   // en derin uzay siyahı
          900:     PALETTE.space[900],   // hafif yükseltilmiş yüzey
          800:     PALETTE.space[800],   // kart/panel zemini  (#0b0f19)
          700:     PALETTE.space[700],   // hover / border bölgesi
        },

        /**
         * neon.*  — Mor/lavanta neon vurgu sistemi
         * Kullanım: text-neon (default: #9d72ff), bg-neon-700, border-neon
         */
        neon: {
          DEFAULT: PALETTE.neon[500],    // text-neon / bg-neon → #9d72ff
          300:     PALETTE.neon[300],    // parlak hover vurgusu
          400:     PALETTE.neon[400],    // hover rengi
          500:     PALETTE.neon[500],    // ANA VURGU — primary accent
          600:     PALETTE.neon[600],    // basılı / aktif gradient ucu
          700:     PALETTE.neon[700],    // derin gradient
          // Semantic alias'lar (okunabilirlik için)
          bg:      PALETTE.space[950],   // neon bg = uzay zemini
          fg:      PALETTE.text.heading, // neon metin = beyaz
          primary: PALETTE.neon[500],    // neon-primary = ana vurgu
          accent:  PALETTE.accent.cyan,  // neon-accent = cyan yardımcı
          muted:   PALETTE.text.muted,   // neon-muted = soluk metin
        },

        /**
         * accent.*  — İkincil vurgu renkleri
         * Kullanım: text-accent-cyan, bg-accent-rose/10
         */
        accent: {
          cyan:    PALETTE.accent.cyan,
          rose:    PALETTE.accent.rose,
          gold:    PALETTE.accent.gold,
          emerald: PALETTE.accent.emerald,
        },

        /**
         * ink.*  — Tipografi hiyerarşisi
         * Kullanım: text-ink (beyaz başlık), text-ink-secondary, text-ink-muted
         */
        ink: {
          DEFAULT:   PALETTE.text.heading,   // #ffffff — h1/h2
          secondary: PALETTE.text.body,      // #cbd5e1 — paragraf
          muted:     PALETTE.text.muted,     // #94a3b8 — meta/caption
          dim:       PALETTE.text.dim,       // #64748b — en soluk
        },

        /**
         * glass.*  — Liquid glass kart/yüzey renkleri (rgba tokenları)
         * Tailwind bu değerleri oluşturduğunda opacity modifier kullanılır.
         */
        glass: {
          card:      PALETTE.card.bg,
          cardHover: PALETTE.card.bgHover,
        },

        /**
         * border.*  — Sınır/çerçeve renkleri
         * Kullanım: border-edge, border-edge-hover, border-edge-neon
         */
        edge: {
          DEFAULT: PALETTE.border.base,
          hover:   PALETTE.border.hover,
          neon:    PALETTE.border.neon,
          strong:  PALETTE.border.neonStrong,
        },

        /**
         * Semantic  — Durum renkleri
         */
        success: PALETTE.accent.emerald,
        warning: PALETTE.accent.gold,
        danger:  PALETTE.accent.rose,

        // ── PALET DIŞI AİLELER → MARKA PALETİ (site geneli tutarlılık) ────
        // Aşağıdaki Tailwind aileleri artık marka tonlarını üretir:
        // sıcak/mor aileler → neon mor, soğuk/yeşil aileler → cyan.
        amber:   C.violet,
        yellow:  C.violet,
        orange:  C.violet,
        purple:  C.violet,
        indigo:  C.violet,
        fuchsia: C.violet,
        pink:    C.violet,
        rose:    C.violet,
        lime:    C.cyan,
        green:   C.cyan,
        emerald: C.cyan,
        teal:    C.cyan,
        sky:     C.cyan,
        blue:    C.cyan,

        // ══════════════════════════════════════════════════════════════════
        // ── GERİYE DÖNÜK UYUMLULUK — Eski bileşenler için korundu ─────────
        // Yeni bileşenlerde KULLANMAYIN. space.* / neon.* / ink.* kullanın.
        // ══════════════════════════════════════════════════════════════════
        brand: {
          primary: {
            DEFAULT: PALETTE.neon[500],       // eski brand.primary → artık neon vurgu
            light:   PALETTE.neon[400],
            lighter: PALETTE.neon[300],
          },
          secondary: {
            DEFAULT: PALETTE.accent.cyan,
            light:   "#67e8f9",
            lighter: "#cffafe",
            dark:    "#0891b2",
            bg:      `${PALETTE.accent.cyan}14`,
          },
          accent: {
            DEFAULT: PALETTE.accent.rose,
            light:   "#fda4af",
            bg:      `${PALETTE.accent.rose}14`,
          },
          neutral: {
            bg:           PALETTE.space[950],   // artık koyu (#050811) — beyaz değil!
            bgAlt:        PALETTE.space[900],
            surface:      PALETTE.space[800],
            surfaceHover: PALETTE.space[700],
            border:       PALETTE.border.base,
            borderLight:  "rgba(255,255,255,0.04)",
          },
          text: {
            primary:   PALETTE.text.heading,
            secondary: PALETTE.text.body,
            tertiary:  PALETTE.text.muted,
            muted:     PALETTE.text.dim,
            inverse:   "#050811",
            link:      PALETTE.neon[500],
            linkHover: PALETTE.neon[400],
          },
          success: {
            DEFAULT: PALETTE.accent.emerald,
            bg:      `${PALETTE.accent.emerald}14`,
            border:  `${PALETTE.accent.emerald}40`,
            text:    "#6ee7b7",
          },
          warning: {
            DEFAULT: PALETTE.accent.gold,
            bg:      `${PALETTE.accent.gold}14`,
            border:  `${PALETTE.accent.gold}40`,
            text:    "#fcd34d",
          },
          error: {
            DEFAULT: PALETTE.accent.rose,
            bg:      `${PALETTE.accent.rose}14`,
            border:  `${PALETTE.accent.rose}40`,
            text:    "#fda4af",
          },
        },

        // obsidian — Navbar arka plan token'ı
        obsidian: "#09090b",

        // CSS Variable alias'ları — runtime tema için (var(--...) ile bağlantılı)
        "-bg":             `var(--color-bg, ${PALETTE.space[950]})`,
        "-bg-alt":         `var(--color-bg-alt, ${PALETTE.space[900]})`,
        "-surface":        "var(--color-surface-1, rgba(12,13,18,0.50))",
        "-border":         `var(--color-border, ${PALETTE.border.base})`,
        "-text-primary":   `var(--color-text-primary, ${PALETTE.text.heading})`,
        "-text-secondary": `var(--color-text-secondary, ${PALETTE.text.body})`,
        "-text-muted":     `var(--color-text-muted, ${PALETTE.text.muted})`,
        "-brand-primary":  `var(--prism-violet, ${PALETTE.neon[500]})`,
        "-brand-secondary":`var(--prism-cyan, ${PALETTE.accent.cyan})`,
        "-brand-accent":   `var(--prism-rose, ${PALETTE.accent.rose})`,
      },

      // ── Border Radius ────────────────────────────────────────────────────
      borderRadius: {
        btn:     "0.5rem",    // 8px  — butonlar, inputlar
        card:    "0.75rem",   // 12px — kartlar, paneller
        section: "1rem",      // 16px — büyük section'lar
        pill:    "9999px",    // tam yuvarlak — pill/badge
      },

      // ── Spacing ──────────────────────────────────────────────────────────
      spacing: {
        "section-sm": "3rem",    // 48px  — mobil section padding
        "section-md": "5rem",    // 80px  — tablet section padding
        "section-lg": "7rem",    // 112px — masaüstü section padding
        "container":  "1.5rem",  // 24px  — container yatay padding
      },

      // ── Typography Scale ─────────────────────────────────────────────────
      fontSize: {
        "display-xl": ["clamp(2.5rem, 5vw, 4rem)",    { lineHeight: "1.1",  letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg": ["clamp(2rem, 4vw, 3rem)",       { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-md": ["clamp(1.75rem, 3.5vw, 2.5rem)",{ lineHeight: "1.2",  letterSpacing: "-0.01em", fontWeight: "700" }],
        "display-sm": ["clamp(1.5rem, 3vw, 2rem)",    { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "700" }],
        "heading-xl": ["clamp(1.5rem, 2.5vw, 2rem)",  { lineHeight: "1.3",  letterSpacing: "-0.01em", fontWeight: "600" }],
        "heading-lg": ["clamp(1.25rem, 2vw, 1.5rem)", { lineHeight: "1.35", letterSpacing: "-0.01em", fontWeight: "600" }],
        "heading-md": ["clamp(1.125rem, 1.5vw, 1.25rem)", { lineHeight: "1.4", fontWeight: "600" }],
        "heading-sm": ["1rem",     { lineHeight: "1.5", fontWeight: "600" }],
        "body-lg":    ["1.125rem", { lineHeight: "1.7", fontWeight: "400" }],
        "body-md":    ["1rem",     { lineHeight: "1.7", fontWeight: "400" }],
        "body-sm":    ["0.875rem", { lineHeight: "1.6", fontWeight: "400" }],
        "caption":    ["0.8125rem",{ lineHeight: "1.5", fontWeight: "400" }],
        "overline":   ["0.75rem",  { lineHeight: "1.5", fontWeight: "500", letterSpacing: "0.05em" }],
      },

      // ── Box Shadow ───────────────────────────────────────────────────────
      boxShadow: {
        "btn":           "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "btn-hover":     "0 4px 12px -2px rgba(157,114,255,0.30)",
        "card":          "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
        "card-hover":    "0 10px 25px -5px rgb(0 0 0 / 0.25), 0 0 0 1px rgba(255,255,255,0.04)",
        "neon-violet":   `0 0 24px -4px ${PALETTE.neon[500]}`,
        "neon-violet-lg":`0 0 48px 0 ${PALETTE.neon[500]}`,
        "neon-cyan":     `0 0 24px -4px ${PALETTE.accent.cyan}`,
        "dropdown":      "0 10px 30px -10px rgb(0 0 0 / 0.4)",
        "modal":         "0 25px 50px -12px rgb(0 0 0 / 0.5)",
        "focus":         `0 0 0 3px ${PALETTE.neon[500]}50`,
      },

      // ── Keyframes ────────────────────────────────────────────────────────
      keyframes: {
        "hero-rise": {
          from: { transform: "translateY(24px)" },
          to:   { transform: "translateY(0)" },
        },
        // hero-up — LCP güvenli varyant: opaklık ANİMASYONU YOK.
        // `hero-rise` opacity:0 ile başladığından hero başlığı (LCP öğesi) ilk
        // boyamada görünmez oluyor ve LCP ~gecikme kadar öteleniyordu. Bu varyant
        // yalnızca translateY animasyonu yapar → metin ilk anda görünür (LCP hızlı),
        // hareket efekti korunur.
        "hero-up": {
          from: { transform: "translateY(28px)" },
          to:   { transform: "translateY(0)" },
        },
        "hero-fade": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "scroll-line": {
          from: { transform: "translateY(-100%)" },
          to:   { transform: "translateY(200%)" },
        },
        "neon-pulse": {
          "0%, 100%": { boxShadow: `0 0 20px ${PALETTE.neon[500]}40` },
          "50%":       { boxShadow: `0 0 40px ${PALETTE.neon[500]}80` },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-6px)" },
        },
      },

      // ── Animation ────────────────────────────────────────────────────────
      animation: {
        "hero-rise":  "hero-rise 1.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "hero-up":    "hero-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        "hero-fade":  "hero-fade 1.2s ease-out both",
        "scroll-line":"scroll-line 2s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        "neon-pulse": "neon-pulse 3s ease-in-out infinite",
        "float":      "float 4s ease-in-out infinite",
      },

      // ── Transition ───────────────────────────────────────────────────────
      transitionDuration: {
        fast:   "150ms",
        normal: "200ms",
        slow:   "300ms",
      },
      transitionTimingFunction: {
        "ease-out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
