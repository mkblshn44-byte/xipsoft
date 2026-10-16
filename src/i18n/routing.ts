import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en", "de", "fr", "es", "ru"],
  defaultLocale: "tr",
  // A seçeneği: Türkçe kökte (/hakkimizda), diğer diller önekli (/en/hakkimizda).
  // `as-needed` varsayılan dilde (defaultLocale) öneki kaldırır.
  localePrefix: "as-needed",
  // Tarayıcı diline göre otomatik yönlendirme kapalı — herkes tr kökten başlar,
  // dil değiştiriciyle geçiş yapar. (SEO için öngörülebilir tek giriş noktası.)
  localeDetection: false,
  // Non-tr diller şimdilik X-Robots-Tag ile noindex. Hreflang `Link`
  // header'ları noindex sayfalara işaret edemeyeceği için kapatıldı;
  // çok dilli SEO açıldığında tekrar `true` yapılmalı.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
