/**
 * GA4 Dönüşüm Event Tracking
 *
 * Kullanım:
 *   import { trackEvent } from "@/utils/analytics";
 *   trackEvent("teklif_gonder", { service: "Web Yazılım" });
 *
 * GA4'te her event otomatik raporlanır. "Dönüşüm" olarak işaretlemek için
 * GA4 → Events → ilgili event → "Mark as conversion" yapılmalı.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

type EventParams = Record<string, string | number | boolean | undefined>;

/**
 * GA4'e özel event gönderir.
 * gtag henüz yüklenmemişse sessizce yoksayar.
 */
export function trackEvent(eventName: string, params?: EventParams): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

// ── Önceden tanımlı dönüşüm eventleri ──────────────────────────────────────

/** Teklif formu başarıyla gönderildi */
export function trackTeklifSubmit(service?: string): void {
  trackEvent("teklif_gonder", {
    event_category: "Conversion",
    event_label: service || "belirtilmedi",
    value: 1,
  });
}

/** Teklif formu açıldı (modal açılışı) */
export function trackTeklifOpen(service?: string): void {
  trackEvent("teklif_ac", {
    event_category: "Engagement",
    event_label: service || "belirtilmedi",
  });
}

/** WhatsApp butonuna tıklandı */
export function trackWhatsAppClick(source?: string): void {
  trackEvent("whatsapp_tikla", {
    event_category: "Conversion",
    event_label: source || "genel",
    value: 1,
  });
}

/** İletişim formu gönderildi */
export function trackContactSubmit(): void {
  trackEvent("iletisim_gonder", {
    event_category: "Conversion",
    value: 1,
  });
}

/** Hizmet sayfasına tıklandı */
export function trackServiceClick(serviceSlug: string): void {
  trackEvent("hizmet_tikla", {
    event_category: "Engagement",
    event_label: serviceSlug,
  });
}
