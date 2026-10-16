/**
 * Marka Renk Normalleştirici (brand-color)
 *
 * Amaç: Veritabanından / CMS'ten gelen rastgele renk değerlerini (hex)
 * sitedeki tek renk sistemine — neon mor (#a78bfa, birincil) + cyan
 * (#ddd6fe, ikincil) — indirgemek. Böylece DB'de eski/karışık renkler
 * kalmış olsa bile arayüz her zaman tutarlı görünür.
 *
 * Kural:
 *  - Zaten marka tonu olan değerler (açık/derin mor & cyan) olduğu gibi kalır.
 *  - Soğuk renkler (yeşil / teal / cyan / mavi / sky)  → cyan  (#ddd6fe)
 *  - Diğer tüm renkler (sarı / turuncu / kırmızı / pembe / mor / indigo) → mor (#a78bfa)
 *
 * Yalnızca birincil hex renklerini dönüştürür; opacity sonekini (8 haneli
 * hex) korur. Gradient metinleri için `normalizeBrandColorInString` kullanın.
 */

const BRAND_VIOLET = "#a78bfa";
const BRAND_CYAN = "#ddd6fe";

/** Olduğu gibi korunacak marka tonları (palet.ts ile hizalı). */
const KEEP = new Set([
  // mor / lavanta
  "#a78bfa", "#c4b5fd", "#8b5cf6", "#7c3aed", "#ddd6fe", "#9d72ff", "#b794ff",
  // cyan
  "#ddd6fe", "#67e8f9", "#06b6d4", "#0891b2", "#a5f3fc",
]);

/** Yaygın palet-dışı renklerin kesin eşlemesi (hue hesabına gerek kalmadan). */
const KNOWN: Record<string, string> = {
  // yeşil ailesi → cyan
  "#34d399": BRAND_CYAN, "#10b981": BRAND_CYAN, "#059669": BRAND_CYAN,
  "#4ade80": BRAND_CYAN, "#22c55e": BRAND_CYAN, "#16a34a": BRAND_CYAN,
  "#6ee7b7": BRAND_CYAN, "#a7f3d0": BRAND_CYAN, "#2dd4bf": BRAND_CYAN,
  // mavi ailesi → cyan
  "#3b82f6": BRAND_CYAN, "#60a5fa": BRAND_CYAN, "#2563eb": BRAND_CYAN,
  "#38bdf8": BRAND_CYAN, "#0ea5e9": BRAND_CYAN, "#0891b2": BRAND_CYAN,
  // sarı / turuncu / kırmızı / pembe → mor
  "#fbbf24": BRAND_VIOLET, "#f59e0b": BRAND_VIOLET, "#fcd34d": BRAND_VIOLET,
  "#d97706": BRAND_VIOLET, "#f97316": BRAND_VIOLET, "#fb923c": BRAND_VIOLET,
  "#ea580c": BRAND_VIOLET, "#fb7185": BRAND_VIOLET, "#f43f5e": BRAND_VIOLET,
  "#f472b6": BRAND_VIOLET, "#fda4af": "#c4b5fd", "#e11d48": BRAND_VIOLET,
  // mor / indigo / fuchsia → mor (ton korunur)
  "#c084fc": "#c4b5fd", "#9333ea": "#8b5cf6", "#a855f7": BRAND_VIOLET,
  "#e879f9": BRAND_VIOLET, "#d946ef": BRAND_VIOLET, "#6366f1": BRAND_VIOLET,
  "#818cf8": BRAND_VIOLET, "#4f46e5": BRAND_VIOLET,
};

function hexToHue(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return null;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return h;
}

/**
 * Tek bir renk değerini marka paletine indirger.
 * Hex (#rgb / #rrggbb / #rrggbbaa) kabul eder; geçersizse mor döner.
 */
export function normalizeBrandColor(value?: string | null): string {
  if (!value) return BRAND_VIOLET;
  const raw = value.trim();
  if (!/^#?[0-9a-fA-F]{3,8}$/.test(raw)) return raw; // hex değil — dokunma

  const lower = `#${raw.replace(/^#/, "").toLowerCase()}`;
  const base = lower.length === 9 ? lower.slice(0, 7) : lower;
  const alpha = lower.length === 9 ? lower.slice(7) : "";

  if (KEEP.has(base)) return raw; // marka tonu
  if (KNOWN[base]) return KNOWN[base] + alpha;

  const hue = hexToHue(base);
  if (hue != null && hue >= 150 && hue < 260) return BRAND_CYAN + alpha;
  return BRAND_VIOLET + alpha;
}

/**
 * Metin içindeki tüm 6/8 haneli hex renklerini marka paletine indirger.
 * Gradient tanımları için (ör. `linear-gradient(90deg,#34d399,#fbbf24)`).
 */
export function normalizeBrandColorInString(value?: string | null): string {
  if (!value) return "";
  return value.replace(/#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?/g, (m) =>
    normalizeBrandColor(m),
  );
}
