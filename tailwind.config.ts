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
 *  neon.*    → Neon mor (lavanta) birincil vurgu (eski sınıf adları korunur)
 *  titanium.* / steel.* → Nötr (slate) yüzey ve çizgi skalası
 *  electro.* → Mor aksanın tam ton skalası (50–950) — eski token adı
 *  accent.*  → Semantik ikincil vurgular
 *  ink.*     → Tipografi renkleri (text-ink, text-ink-secondary ...)
 *  border.*  → Kart/sınır renkleri
 *  brand.*   → Geriye dönük uyumluluk (eski bileşenler) — yeni kodda KULLANMA
 */

/**
 * Palet dışı Tailwind renk aileleri → marka sistemine bağlanır.
 *
 * KARAR (site geneli tek renk kimliği — "Neon Siyah Uzay"):
 *   • Birincil  → neon mor #a78bfa, nötr → slate #94a3b8
 *   • Vurgu aileleri (cyan/teal/sky/blue/violet/indigo/purple/pink/amber…)
 *     tek mor skalasına (`PALETTE.accentRamp`) eşlenir.
 *   • Grayscale aileleri (gray/zinc/slate/neutral/stone) slate skalasına
 *     eşlenir; `red` dokunulmaz — yalnızca hata/yıkıcı (danger) anlamı taşır.
 */
const C = {
  accentRamp: PALETTE.accentRamp,
  // Semantik durum renkleri
  rose: {
    50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 300: "#fda4af",
    400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c",
    800: "#9f1239", 900: "#881337", 950: "#4c0519",
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
        brand:   ["var(--font-brand)", "sans-serif"],
        navbar:  ["var(--font-brand)", "sans-serif"],
        stat:    ["var(--font-display)", "sans-serif"],
        // Çelik kimliği: yuvarlak/serif lüks fontlar emekli — `luxury` ve
        // `premium` sınıf adları korunur ama keskin display fontuna eşlenir.
        luxury:  ["var(--font-display)", "sans-serif"],
        premium: ["var(--font-display)", "sans-serif"],
        // mono: Tailwind varsayılan stack (ui-monospace, Menlo, Consolas, ...)
      },

      colors: {
        // ══════════════════════════════════════════════════════════════════
        // ── BIRINCIL TOKEN SETİ — Tüm yeni kodlar bunları kullanır ────────
        // ══════════════════════════════════════════════════════════════════

        /**
         * space.*  — Asfalt/grafit zemin katmanları
         * Kullanım: bg-space (default: #050811), bg-space-800, bg-space-700
         */
        space: {
          DEFAULT: PALETTE.space[950],   // bg-space → ana zemin (#050811)
          950:     PALETTE.space[950],   // asfalt siyahı
          900:     PALETTE.space[900],   // hafif yükseltilmiş yüzey
          800:     PALETTE.space[800],   // kart/panel zemini  (#0b0f19)
          700:     PALETTE.space[700],   // hover / border bölgesi
        },

        /**
         * neon.*  — Mavi ana vurgu sistemi (eski sınıf adları korunur)
         * Kullanım: text-neon (default: #3b8ef0), bg-neon-700, border-neon
         */
        neon: {
          DEFAULT: PALETTE.neon[500],    // text-neon / bg-neon → safir mavi
          300:     PALETTE.neon[300],    // açık mavi — parlak hover vurgusu
          400:     PALETTE.neon[400],    // hover rengi
          500:     PALETTE.neon[500],    // ANA VURGU — primary accent
          600:     PALETTE.neon[600],    // basılı / aktif gradient ucu
          700:     PALETTE.neon[700],    // derin gradient
          // Semantic alias'lar (okunabilirlik için)
          bg:      PALETTE.space[950],   // neon bg = uzay zemini
          fg:      PALETTE.text.heading, // vurgu metni = kırık beyaz
          primary: PALETTE.neon[500],    // neon-primary = ana vurgu
          accent:  PALETTE.accent.cyan,  // neon-accent = açık mavi yardımcı (eski cyan)
          muted:   PALETTE.text.muted,   // neon-muted = soluk metin
        },
        cyan: PALETTE.accentRamp,        // eski aile adı → artık elektro skalası

        /**
         * titanium.* / steel.* — Fırçalanmış metal skalası (marka grisi 400).
         * Kullanım: text-titanium-400, from-steel-700, border-titanium-600
         */
        titanium: PALETTE.titanium,
        steel: {
          DEFAULT:   PALETTE.titanium[400],
          50:        PALETTE.titanium[50],
          100:       PALETTE.titanium[100],
          200:       PALETTE.titanium[200],
          300:       PALETTE.titanium[300],
          400:       PALETTE.titanium[400],
          500:       PALETTE.titanium[500],
          600:       PALETTE.titanium[600],
          700:       PALETTE.titanium[700],
          800:       PALETTE.titanium[800],
          900:       PALETTE.titanium[900],
          shadow:    PALETTE.metal.shadow,
          base:      PALETTE.metal.base,
          raised:    PALETTE.metal.raised,
          sheen:     PALETTE.metal.sheen,
          highlight: PALETTE.metal.highlight,
        },

        /**
         * electro.* — Devre vurgusunun tam skalası (`neon.*` yalnızca 300–700
         * taşır; 50–950 gereken yerlerde bunu kullanın).
         */
        electro: PALETTE.electro,

        /**
         * accent.*  — İkincil vurgu renkleri (eski sınıf adları korunur)
         * Kullanım: text-accent-gold, bg-accent-gold/10
         */
        accent: {
          gold: PALETTE.accent.gold,
          goldLight: PALETTE.accent.goldLight,
          goldDark: PALETTE.accent.goldDark,
          cyan: PALETTE.accent.cyan,
        },

        /**
         * ink.*  — Tipografi hiyerarşisi
         * Kullanım: text-ink (beyaz başlık), text-ink-secondary, text-ink-muted
         */
        ink: {
          DEFAULT:   PALETTE.text.heading,   // #f8fafc — h1/h2
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
        // Sarı yok: `warning` de marka aksanına (safir) eşlendi — amber/yellow/orange
        // aşağıda zaten accentRamp'e bağlı (bkz. L160+).
        warning: PALETTE.accentRamp[400],
        danger:  PALETTE.accent.rose,

        // ── PALET DIŞI AİLELER → MARKA PALETİ (site geneli tutarlılık) ────
        // Aşağıdaki Tailwind aileleri artık marka tonlarını üretir:
        // Tüm vurgu renk aileleri, geriye dönük sınıf adları korunarak marka renklerine eşlenir.
        // İstisna: `rose` semantik hata/danger rengi olarak gerçek kırmızı kalır.
        // `emerald` de marka skalasına indirildi — sitede yeşil durum rengi yok.
        amber:   C.accentRamp,
        yellow:  C.accentRamp,
        orange:  C.accentRamp,
        purple:  C.accentRamp,
        indigo:  C.accentRamp,
        fuchsia: C.accentRamp,
        pink:    C.accentRamp,
        lime:    C.accentRamp,
        green:   C.accentRamp,
        emerald:  PALETTE.accentRamp,
        teal:     PALETTE.accentRamp,
        sky:      PALETTE.accentRamp,
        blue:     PALETTE.accentRamp,
        // Tailwind'ın kendi moru marka altınından farklıydı → tek aileye indirildi
        // (eskiden 176 kullanımda iki ayrı mor tonu üretiliyordu).
        violet:   PALETTE.accentRamp,

        // ── NÖTR AİLELER → TİTANYUM GRİSİ ──────────────────────────────────
        // Tailwind'in ham grileri (gray #6b7280, zinc #71717a, slate #64748b)
        // sıcak/nötr nötr tonlardır ve çelik paletiyle uyuşmaz. Site genelinde
        // ~1.800 kullanım olduğu için tek tek sınıf değiştirmek yerine beş aile
        // birden titanyum skalasına bağlanır: sınıf adları aynı kalır, üretilen
        // renk soğuk çelik grisi olur. Light tema da aynı skalayı kullanır
        // (gray-100 → #f1f5f9, gray-900 → #0f172a).
        gray:     PALETTE.titanium,
        zinc:     PALETTE.titanium,
        slate:    PALETTE.titanium,
        neutral:  PALETTE.titanium,
        stone:    PALETTE.titanium,

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
            DEFAULT: PALETTE.accent.gold,
            light:   PALETTE.neon[400],
            lighter: PALETTE.neon[300],
            dark:    PALETTE.neon[700],
            bg:      `${PALETTE.accent.gold}14`,
          },
          accent: {
            DEFAULT: PALETTE.accent.gold,
            light:   PALETTE.neon[300],
            bg:      `${PALETTE.accent.gold}14`,
          },
          neutral: {
            bg:           PALETTE.space[950],   // koyu obsidyen, beyaz değil
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
            inverse:   PALETTE.space[950],
            link:      PALETTE.neon[500],
            linkHover: PALETTE.neon[400],
          },
          success: {
            DEFAULT: PALETTE.accent.emerald,
            bg:      `${PALETTE.accent.emerald}14`,
            border:  `${PALETTE.accent.emerald}40`,
            text:    PALETTE.accentRamp[300],
          },
          warning: {
            DEFAULT: PALETTE.accent.gold,
            bg:      `${PALETTE.accent.gold}14`,
            border:  `${PALETTE.accent.gold}40`,
            text:    PALETTE.accentRamp[300],
          },
          error: {
            DEFAULT: PALETTE.accent.rose,
            bg:      `${PALETTE.accent.rose}14`,
            border:  `${PALETTE.accent.rose}40`,
            text:    "#fda4af",
          },
        },

        // obsidian — Navbar arka plan token'ı
        obsidian: PALETTE.space[950],

        // CSS Variable alias'ları — runtime tema için (var(--...) ile bağlantılı)
        "-bg":             `var(--color-bg, ${PALETTE.space[950]})`,
        "-bg-alt":         `var(--color-bg-alt, ${PALETTE.space[900]})`,
        "-surface":        "var(--color-surface-1, rgba(18, 20, 28,0.50))",
        "-border":         `var(--color-border, ${PALETTE.border.base})`,
        "-text-primary":   `var(--color-text-primary, ${PALETTE.text.heading})`,
        "-text-secondary": `var(--color-text-secondary, ${PALETTE.text.body})`,
        "-text-muted":     `var(--color-text-muted, ${PALETTE.text.muted})`,
        "-brand-primary":  `var(--prism-violet, ${PALETTE.neon[500]})`,
        "-brand-secondary":`var(--prism-cyan, ${PALETTE.accent.gold})`,
        "-brand-accent":   `var(--prism-rose, ${PALETTE.accent.rose})`,
      },

      // ── Border Radius ────────────────────────────────────────────────────
      borderRadius: {
        // MOR/SİYAH UZAY TEMASI: ölçek Tailwind varsayılan yumuşak köşelere
        // döndü; `lg`/`xl` tek noktadan palet token'ına bağlı (radius.*).
        none:    "0px",
        sm:      "0.125rem",
        DEFAULT: "0.25rem",
        md:      "0.375rem",
        lg:      PALETTE.radius.control,
        xl:      PALETTE.radius.card,
        "2xl":   "1rem",
        "3xl":   "1.5rem",
        btn:     PALETTE.radius.control,
        card:    PALETTE.radius.card,
        section: "1rem",
        full:    "9999px",
        pill:    PALETTE.radius.pill,
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
      // Çelik: ışık üst kenardan girer (inset highlight), alttan gölge çıkar.
      boxShadow: {
        "btn":           "inset 0 1px 0 rgba(203, 213, 225,0.14), 0 1px 2px rgb(0 0 0 / 0.55)",
        "btn-hover":     `0 0 0 1px ${PALETTE.neon[500]}33, 0 4px 14px -4px ${PALETTE.neon[500]}4d`,
        "card":          "inset 0 1px 0 rgba(203, 213, 225,0.10), 0 2px 10px rgb(0 0 0 / 0.45)",
        "card-hover":    "inset 0 1px 0 rgba(226, 232, 240,0.18), 0 10px 24px -8px rgb(0 0 0 / 0.6), 0 0 0 1px rgba(148, 163, 184,0.16)",
        "neon-gold":     `0 0 24px -4px ${PALETTE.neon[500]}`,
        "neon-gold-lg":  `0 0 48px 0 ${PALETTE.neon[500]}`,
        // Elektro buton parıltısı (IceButton) — sonek hex alfası: 14 ≈ %8, 29 ≈ %16
        "btn-accent":     `0 6px 20px ${PALETTE.neon[500]}14`,
        "btn-accent-lg":  `0 10px 28px ${PALETTE.neon[500]}29`,
        "dropdown":      "inset 0 1px 0 rgba(203, 213, 225,0.10), 0 12px 32px -10px rgb(0 0 0 / 0.65)",
        "modal":         "inset 0 1px 0 rgba(203, 213, 225,0.12), 0 25px 50px -12px rgb(0 0 0 / 0.7)",
        "focus":         `0 0 0 2px ${PALETTE.space[950]}, 0 0 0 4px ${PALETTE.neon[400]}99`,
        // Eski `gold-glow*` adları korunur — değerler artık elektro mavidir
        "gold-glow":     `0 0 24px -4px ${PALETTE.accent.gold}40`,
        "gold-glow-lg":  `0 0 48px 0 ${PALETTE.accent.gold}60`,
        "gold-glow-soft":`0 0 16px -2px ${PALETTE.accent.gold}30`,
        // Yeni: fırçalanmış metal kabartma + keskin devre çizgisi
        "metal-raise":   "inset 0 1px 0 rgba(226, 232, 240,0.20), inset 0 -1px 0 rgba(0,0,0,0.55), 0 3px 12px -4px rgb(0 0 0 / 0.7)",
        "metal-inset":   "inset 0 2px 6px rgba(0,0,0,0.65), inset 0 -1px 0 rgba(203, 213, 225,0.10)",
        "circuit":       `0 0 12px ${PALETTE.electro[400]}59, 0 0 2px ${PALETTE.electro[300]}`,
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
        // scroll-arrow — "Daha fazlası" göstergesindeki aşağı ok: yukarıdan
        // belirir, aşağı süzülür ve kaybolur. Yalnızca transform/opacity →
        // compositor'da çalışır, ana thread'i meşgul etmez.
        "scroll-arrow": {
          "0%":   { transform: "translateY(-3px)", opacity: "0" },
          "30%":  { opacity: "1" },
          "100%": { transform: "translateY(9px)", opacity: "0" },
        },
        "gold-pulse": {
          "0%, 100%": { boxShadow: `0 0 20px ${PALETTE.neon[500]}40` },
          "50%":       { boxShadow: `0 0 40px ${PALETTE.neon[500]}80` },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-6px)" },
        },
        // tech-marquee — "Teknolojiler & Uzmanlıklar" şeridi: sağdan sola sonsuz
        // akış. Track iki kopyadan oluştuğu için -50% kaydırma tam bir tur demek;
        // süre bileşen tarafında kart sayısına göre verilir (sabit piksel hızı).
        "tech-marquee": {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(-50%)" },
        },
        // logo-flip — Navbar logosu: 180° döner (ters), ~1 DAKİKA ters kalır,
        // sonra düz hâline döner. Döngü (70s):
        //   0–4%   (2,8s) düz, hareketsiz
        //   4–9%   (3,5s) 180°'ye dönüş
        //   9–95%  (60,2s) TERS bekler  ← "1 dk sonra düz olsun"
        //   95–100% (3,5s) 0°'ye dönüş
        "logo-flip": {
          "0%":   { transform: "rotate(0deg)" },
          "4%":   { transform: "rotate(0deg)" },
          "9%":   { transform: "rotate(180deg)" },
          "95%":  { transform: "rotate(180deg)" },
          "100%": { transform: "rotate(0deg)" },
        },

        // ── ÇELİK KATMANI ──────────────────────────────────────────────────
        // slash-glint — kılıç kesiği: dar, keskin bir ışık şeridi yüzeyi soldan
        // sağa süpürür. Hover'da TETİKLENİR (infinite değil), easeSlash ile.
        "slash-glint": {
          "0%":   { transform: "translateX(-130%) skewX(-18deg)", opacity: "0" },
          "12%":  { opacity: "1" },
          "60%":  { opacity: "1" },
          "100%": { transform: "translateX(230%) skewX(-18deg)", opacity: "0" },
        },
        // circuit-pulse — devre hattı LED'i: kısa parlama, uzun sönme (nöbet
        // ışığı hissi); yalnızca opacity/box-shadow → compositor dostu.
        "circuit-pulse": {
          "0%, 100%": { opacity: "0.35", boxShadow: `0 0 0 ${PALETTE.electro[400]}00` },
          "8%":        { opacity: "1",   boxShadow: `0 0 10px 1px ${PALETTE.electro[400]}` },
          "24%":       { opacity: "0.5", boxShadow: `0 0 4px 0 ${PALETTE.electro[400]}66` },
        },
        // metal-sheen — fırçalanmış çelik yüzeyde yavaş ışık kayması (arka plan
        // panelleri ve büyük başlık blokları için).
        "metal-sheen": {
          "0%":   { backgroundPosition: "0% 50%" },
          "50%":  { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        // trace-sweep — devre izininin bir uçtan diğerine çizilmesi (hero/section
        // ayraçlarındaki ince metalik çizgiler).
        "trace-sweep": {
          "0%":   { transform: "scaleX(0)", opacity: "0" },
          "20%":  { opacity: "1" },
          "100%": { transform: "scaleX(1)", opacity: "0.15" },
        },
      },

      // ── Animation ────────────────────────────────────────────────────────
      animation: {
        "hero-rise":  "hero-rise 1.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "hero-up":    "hero-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        "hero-fade":  "hero-fade 1.2s ease-out both",
        "scroll-line":"scroll-line 2s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        "scroll-arrow": "scroll-arrow 1.9s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        "gold-pulse": "gold-pulse 3s ease-in-out infinite",
        "float":      "float 4s ease-in-out infinite",
        "tech-marquee": "tech-marquee 40s linear infinite",
        // 180° dönüş → ~1 dk TERS bekleme → düz hâle dönüş
        "logo-flip":  "logo-flip 70s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        // ── ÇELİK ──────────────────────────────────────────────────────────
        "slash-glint":  "slash-glint 0.55s cubic-bezier(0.85, 0, 0.15, 1) both",
        "circuit-pulse": "circuit-pulse 4.5s ease-out infinite",
        "metal-sheen":  "metal-sheen 14s ease-in-out infinite",
        "trace-sweep":  "trace-sweep 2.4s cubic-bezier(0.85, 0, 0.15, 1) infinite",
      },

      // ── Transition ───────────────────────────────────────────────────────
      // Kaynak: PALETTE.motion. DEFAULT eklenmesi `transition` / `transition-all`
      // gibi süresiz sınıfları 150ms yerine 300ms'e çeker (yumuşak geçiş hedefi).
      transitionDuration: {
        DEFAULT: PALETTE.motion.duration.base,
        fast:    PALETTE.motion.duration.fast,
        normal:  PALETTE.motion.duration.base,
        slow:    PALETTE.motion.duration.slow,
      },
      transitionTimingFunction: {
        standard: PALETTE.motion.easeStandard,
        premium:  PALETTE.motion.easePremium,
        entrance: PALETTE.motion.easeEntrance,
        slash:    PALETTE.motion.easeSlash,   // kılıç kesiği — hızlı, net, duruş
        "ease-out-expo": PALETTE.motion.easeEntrance,
      },
      backdropBlur: {
        // Cam bulanıklığı 8–16px bandında tutulur: Tailwind'ın varsayılan
        // blur-xl/2xl (24/40px) değerleri mobilde boyama maliyetini yükseltiyor
        // ve arkadaki metni okunmaz kılıyor. Üst sınır: PALETTE.glass.blur.
        card:    PALETTE.glass.blur,
        xs:      "8px",
        sm:      "12px",
        DEFAULT: PALETTE.glass.blur,
        md:      "12px",
        lg:      PALETTE.glass.blur,
        xl:      PALETTE.glass.blur,
        "2xl":   PALETTE.glass.blur,
        "3xl":   PALETTE.glass.blur,
      },
    },
  },
  plugins: [],
};

export default config;
