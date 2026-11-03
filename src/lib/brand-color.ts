/**
 * Marka Renk Normalleştirici (brand-color)
 *
 * Amaç: Veritabanından / CMS'ten gelen rastgele renk değerlerini (hex)
 * sitedeki tek vurgu rengine — safir maviye — indirgemek. Böylece DB'de eski/karışık
 * renkler (eski altın dahil) kalmış olsa bile arayüz her zaman tutarlı görünür.
 *
 * Kural:
 *  - Zaten marka tonu olan mavi değerler olduğu gibi kalır.
 *  - Diğer renkler, eski/karışık değerlerden bağımsız olarak maviye dönüştürülür.
 *
 * Yalnızca birincil hex renklerini dönüştürür; opacity sonekini (8 haneli
 * hex) korur. Gradient metinleri için `normalizeBrandColorInString` kullanın.
 */

import { PALETTE } from "@/config/palette";

const BRAND_ACCENT = PALETTE.neon[500];

/** Olduğu gibi korunacak marka tonları (palet.ts ile hizalı). */
const KEEP = new Set<string>([
  ...Object.values(PALETTE.neon),
  ...Object.values(PALETTE.accentRamp),
]);

/**
 * Tek bir renk değerini marka paletine indirger.
 * Hex (#rgb / #rrggbb / #rrggbbaa) kabul eder; geçersizse mevcut değeri korur.
 */
export function normalizeBrandColor(value?: string | null): string {
  if (!value) return BRAND_ACCENT;
  const raw = value.trim();
  if (!/^#?[0-9a-fA-F]{3,8}$/.test(raw)) return raw; // hex değil — dokunma

  const lower = `#${raw.replace(/^#/, "").toLowerCase()}`;
  const base = lower.length === 9 ? lower.slice(0, 7) : lower;
  const alpha = lower.length === 9 ? lower.slice(7) : "";

  if (KEEP.has(base)) return raw; // marka tonu
  return BRAND_ACCENT + alpha;
}

/**
 * Metin içindeki tüm 6/8 haneli hex renklerini marka paletine indirger.
 * Gradient tanımları için (ör. `linear-gradient(90deg,#34d399,#ddd6fe)`).
 */
export function normalizeBrandColorInString(value?: string | null): string {
  if (!value) return "";
  return value.replace(/#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?/g, (m) =>
    normalizeBrandColor(m),
  );
}
