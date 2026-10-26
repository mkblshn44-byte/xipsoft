/**
 * Üçüncü parti analytics kimliklerinin tek doğruluk kaynağı.
 *
 * Kök layout bu modülü `preconnect` kararı için, `AnalyticsScripts` ise script
 * enjeksiyonu için kullanır — ikisi ayrı karar verirse Lighthouse'un
 * "unused preconnect" uyarısı geri gelir (el sıkışma boşa kurulur).
 */

const GA_ID =
  process.env.NEXT_PUBLIC_GA_ID ??
  process.env.NEXT_PUBLIC_gA_ID ??
  "G-JSC1F13FDJ";
const ADS_ID = process.env.NEXT_PUBLIC_gOOgLE_ADS_ID ?? null;
const YANDEX_ID = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID ?? null;

// Yalnızca production. `localhost`/dev ziyaretleri GA mülkünü şişiriyor,
// ayrıca CSP `connect-src` + tarayıcı eklentisi yüzünden konsola hata satırı
// yazıyordu (`ERR_BLOCKED_BY_CLIENT`, "Refused to connect").
const ANALYTICS_ENABLED = process.env.NODE_ENV === "production";

export const gaId =
  ANALYTICS_ENABLED && /^G-[A-Z0-9]{4,}$/i.test(GA_ID) ? GA_ID : null;
export const adsId =
  ANALYTICS_ENABLED && ADS_ID && /^AW-[0-9]{7,}$/.test(ADS_ID) ? ADS_ID : null;
export const metricaId =
  ANALYTICS_ENABLED && YANDEX_ID && /^[0-9]{5,}$/.test(YANDEX_ID)
    ? YANDEX_ID
    : null;

/** gtag.js yükleyecek tek id (GA4 öncelikli, yoksa Ads). */
export const gtagId = gaId ?? adsId;

export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
