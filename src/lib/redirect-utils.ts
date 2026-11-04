/**
 * redirect-utils.ts — Yönlendirme (SEO 301/302) normalize yardımcıları.
 *
 * Hem admin server action'ları (`admin-redirect-actions.ts`) hem de dış içerik
 * API'si (`src/lib/content/*`) aynı doğrulama/normalizasyon kurallarını kullansın
 * diye tek kaynakta (DRY) tutulur.
 */

/** Kaynak yol: yalnızca site içi path. Şema/sorgu/parça yasak, tekilleştirilir. */
export function normalizeRedirectSource(path: string): string | null {
  const value = path.trim();
  if (!value || value.length > 2048 || /[\u0000-\u001f?#]/.test(value) || /^[a-z][a-z\d+.-]*:/i.test(value)) return null;
  const normalized = value.startsWith("/") ? value : `/${value}`;
  if (normalized.startsWith("//")) return null;
  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
}

/** Hedef yol: site içi path (`/...`) veya tam http(s) URL (kimlik bilgisi yasak). */
export function normalizeRedirectTarget(path: string): string | null {
  const value = path.trim();
  if (!value || value.length > 2048 || /[\u0000-\u001f]/.test(value) || value.startsWith("//")) return null;
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return `/${value}`;
  }
}

/**
 * Desteklenen HTTP yönlendirme durum kodları.
 *
 * 410 (Gone) bir hedefe YÖNLENDİRMEZ: içerik kaldırıldı sinyalini arama
 * motoruna doğrudan verir ve hedef alanı NULL kalır.
 */
export type RedirectStatus = 301 | 302 | 307 | 308 | 410;

export function isRedirectStatus(status: number): status is RedirectStatus {
  return [301, 302, 307, 308, 410].includes(status);
}

/** 410 hariç tüm kodlar hedef yolu zorunlu kılar. */
export function requiresRedirectTarget(status: RedirectStatus): boolean {
  return status !== 410;
}
