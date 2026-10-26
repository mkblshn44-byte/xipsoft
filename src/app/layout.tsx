import { displayFont, bodyFont, navbarFont } from "@/fonts/fonts";
import { cn } from "@/utils";
import { ldJson } from "@/lib/ld-json";
import type { Metadata, Viewport } from "next";
import APP_CONFIG, {
  BRAND,
  BRAND_COLORS,
  DEFAULT_OG_IMAGE_URL,
  SITE_URL,
  defaultFont,
} from "@/config/brand.config";
import Favicons from "@/components/Favicons/Favicons";
// GoogleAnalytics kaldırıldı — AnalyticsScripts (site layout'ta lazyOnload) tek merkez
// afterInteractive + lazyOnload çift yükleme → LCP olumsuz etkileniyordu
import "@/styles/globals.scss";
import "@/styles/home-lcp.css";
import "@/styles/colors-glass.css";
import { routing } from "@/i18n/routing";
import { LanguageProvider } from "@/hooks/useLanguage";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { AuctionProvider } from "@/context/AuctionContext";
import { siteGraphSchema } from "@/lib/schema/site";
import { gtagId as primarygtagId, metricaId } from "@/lib/analytics-config";

// Next'in otomatik enjekte ettiği viewport meta'sı ile layout.tsx içindeki manuel
// <meta name="viewport"> (viewport-fit=cover) çakışıyordu → çift `<meta>` tag'i.
// Tek SDK, tek viewport: App Router `viewport` export'u ikisini birleştirir.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const OG_IMAGE = {
  url: DEFAULT_OG_IMAGE_URL,
  width: 1200,
  height: 630,
  alt: BRAND.name,
  type: "image/webp",
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(SITE_URL),
    // Template kısaltıldı: uzun BRAND.name yerine "XipSoft" — SERP'te title taşması önlenir
    // Google title'ı 50-60 karakter civarında kesiyor; kısa suffix daha fazla içerik karakterine yer bırakır
    title: { default: APP_CONFIG.title, template: `%s | XipSoft` },
    description: APP_CONFIG.description,
    authors: [{ name: BRAND.name, url: SITE_URL }],
    creator: BRAND.name,
    publisher: BRAND.name,
    // Hreflang: Yalnızca TR — /en route'u mevcut değil, geçersiz hreflang Google'da
    // "missing reciprocal" hatası üretir. EN route implemente edilene kadar sadece TR.
    //
    // ÖNEMLİ: Root layout'ta global `alternates.canonical` TANIMLANMAZ. Tanımlandığında
    // kendi canonical'ını belirtmeyen her sayfa (ör. yardımcı sayfalar) yanlışlıkla ana
    // sayfaya canonical veriyor ve Google'da "kopya sayfa" sinyali oluşuyordu. Her sayfa
    // canonical'ını kendi generateMetadata'sinde tanımlar; ana sayfa bunu zaten yapar.
    robots: {
      index: true, follow: true,
      googleBot: {
        index: true, follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website", url: SITE_URL,
      title: APP_CONFIG.title, description: APP_CONFIG.description,
      siteName: BRAND.name, locale: "tr_TR",
      alternateLocale: ["en_US"],
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      site: "@xipsoft",
      creator: "@xipsoft",
      title: APP_CONFIG.title, description: APP_CONFIG.description,
      images: [OG_IMAGE],
    },
    // Google Search Console doğrulama
    verification: {
      google: "OZVclRMBu_yvlKecmkXQHnEwBdCUg5sslkhWhDKM6N8",
    },
    category: "technology",
  };
}

// ISR/CDN cache için kök layout TALEPSİZ (request-read'siz) olmalı.
//
// Eski hali: `await Promise.all([getLocale(), getMessages()])`. İkisi de
// src/i18n/request.ts içindeki `requestLocale`'u okur; o değer middleware'in
// set ettiği `x-next-intl-locale` header'ından gelir → header okuması = route
// ağacının TAMAMI dinamik opt-in. Sonuç: (site)/page.tsx'teki
// `export const revalidate = 300` hiçbir zaman cache'lenebilir yanıt üretemiyordu
// (prod'da ölçüldü: `Cache-Control: private, no-cache, no-store`,
// `X-Vercel-Cache: MISS`).
//
// Provider artık src/app/[locale]/layout.tsx içinde (setRequestLocale'dan
// SONRA), yani statik render bozulmadan locale'e özel messages üretiliyor —
// prerender çıktısı doğrulandı: /en "Software Development", /de "Entwicklung".
//
// `<html lang>` bilinçli olarak sabit: Next.js'te kök layout, kendi segmentinin
// ALTINDAKİ dinamik parametreleri (burada [locale]) almaz — `params` boş kalır.
// Locale'e özgü `lang`'u IntlMessagesProvider hydrate sonrası eşitliyor.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cls = cn(
    displayFont.variable,
    bodyFont.variable,
    navbarFont.variable,
    "min-h-screen scroll-smooth overflow-x-hidden",
  );

  return (
    <html
      lang={routing.defaultLocale}
      data-theme="obsidian"
      data-site-font={defaultFont}
      className="dark overflow-x-hidden"
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        <Favicons />
        {/* manifest: non-blocking — tarayıcı onu critical path dışında işler */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={BRAND_COLORS.themeColor} />
        {/* DNS prefetch for third-parties loaded later.
            preconnect YALNIZCA gerçekten bağlantı kurulacak host için: gaId
            null iken (dev/preview veya geçersiz GA id) GTM script'i hiç
            yüklenmiyor, boş el sıkışma Lighthouse "unused preconnect"
            uyarısı veriyordu. Karar AnalyticsScripts ile aynı modülden
            gelir (src/lib/analytics-config.ts). */}
        {primarygtagId && (
          <link rel="preconnect" href="https://www.googletagmanager.com" />
        )}
        {metricaId && <link rel="preconnect" href="https://mc.yandex.ru" />}
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="//challenges.cloudflare.com" />
        {/* NOT: https://xipsoft.net preconnect kaldırıldı — same-origin;
            Lighthouse "unused preconnect" uyarısı veriyordu (±0 fayda). */}
        <link rel="alternate" type="application/rss+xml" title="XipSoft Blog RSS" href="/blog/feed.xml" />
        {/* Site geneli varlık grafiği (Organization + WebSite + LocalBusiness) —
            tek @graph bloğu, tek kaynak: `@/lib/schema/site`. Sayfalar bu
            düğümleri tekrar basmaz; yalnızca sayfaya özel şemalarını ekler.

            `suppressHydrationWarning`: Bazı tarayıcı eklentileri (ör. reklam
            engelleyiciler) bu <script> etiketine `src` ekleyip içeriğini
            boşaltıyor → React sahte "hydration mismatch" uyarısı basıyordu.
            İçerik sunucuda deterministik üretildiği için bu uyarı bastırılır. */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: ldJson(siteGraphSchema()) }}
        />
      </head>
      <body className={cls} suppressHydrationWarning>
        {/* GoogleAnalytics buradan kaldırıldı — AnalyticsScripts (lazyOnload) site layout'ta tek noktadan yönetiliyor */}
        {/* Dil sırası: LanguageProvider URL'den locale'i türetir; IntlMessagesProvider
            locale'e göre messages paketini yükler — o provider artık [locale]/layout'ta. */}
        <LanguageProvider>
          <AuthProvider>
            <CartProvider>
              <AuctionProvider>{children}</AuctionProvider>
            </CartProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
