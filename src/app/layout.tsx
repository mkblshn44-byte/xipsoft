import { displayFont, bodyFont, monoFont } from "@/fonts/fonts";
import { cn } from "@/utils";
import type { Metadata, Viewport } from "next";
import APP_CONFIg, { BRAND, BRAND_COMPANY, SITE_URL, defaultFont } from "@/config/brand.config";
import Favicons from "@/components/Favicons/Favicons";
// GoogleAnalytics kaldırıldı — AnalyticsScripts (site layout'ta lazyOnload) tek merkez
// afterInteractive + lazyOnload çift yükleme → LCP olumsuz etkileniyordu
import "@/styles/globals.scss";
import "@/styles/home-lcp.css";
import "@/styles/colors-glass.css";
import IntlMessagesProvider from "@/components/Common/IntlProvider/IntlMessagesProvider";
import { getLocale, getMessages } from "next-intl/server";
import { LanguageProvider } from "@/hooks/useLanguage";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { AuctionProvider } from "@/context/AuctionContext";

// Next'in otomatik enjekte ettiği viewport meta'sı ile layout.tsx içindeki manuel
// <meta name="viewport"> (viewport-fit=cover) çakışıyordu → çift `<meta>` tag'i.
// Tek SDK, tek viewport: App Router `viewport` export'u ikisini birleştirir.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const Og_IMAgE = {
  url: `${SITE_URL}/images/xipsoft-seo.png`,
  width: 1200,
  height: 630,
  alt: BRAND.name,
  type: "image/png",
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE_URL}/#localbusiness`,
  name: BRAND.name,
  url: SITE_URL,
  image: `${SITE_URL}/images/xipsoft-seo.png`,
  description: APP_CONFIg.description,
  telephone: BRAND_COMPANY.phone,
  email: BRAND_COMPANY.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: BRAND_COMPANY.address,
    addressLocality: BRAND_COMPANY.city,
    postalCode: BRAND_COMPANY.postalCode,
    addressCountry: BRAND_COMPANY.countryCode,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: BRAND_COMPANY.geo.lat,
    longitude: BRAND_COMPANY.geo.lng,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "09:00",
    closes: "18:00",
  },
  priceRange: "$$",
  foundingDate: String(BRAND_COMPANY.foundingYear),
  areaServed: [
    { "@type": "City", name: "İstanbul" },
    { "@type": "Country", name: "Turkey" },
  ],
  serviceArea: {
    "@type": "GeoCircle",
    geoMidpoint: {
      "@type": "GeoCoordinates",
      latitude: BRAND_COMPANY.geo.lat,
      longitude: BRAND_COMPANY.geo.lng,
    },
    geoRadius: "50000",
  },
  parentOrganization: { "@id": `${SITE_URL}/#organization` },
};

// WebSite şeması — SiteSearch + Sitelinks SearchBox
const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: BRAND.name,
  url: SITE_URL,
  description: APP_CONFIg.description,
  inLanguage: ["tr-TR", "en-US"],
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

// Organization şeması — sosyal medya profilleri ile
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: BRAND.name,
  legalName: BRAND_COMPANY.legalName,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/images/xipsoft-seo.png`,
    width: 1200,
    height: 630,
  },
  foundingDate: String(BRAND_COMPANY.foundingYear),
  numberOfEmployees: { "@type": "QuantitativeValue", value: "20-50" },
  description: APP_CONFIg.description,
  address: {
    "@type": "PostalAddress",
    streetAddress: BRAND_COMPANY.address,
    addressLocality: BRAND_COMPANY.city,
    addressRegion: "İstanbul",
    postalCode: BRAND_COMPANY.postalCode,
    addressCountry: BRAND_COMPANY.countryCode,
  },
  areaServed: [
    { "@type": "Country", name: "Turkey" },
    { "@type": "Country", name: "Azerbaijan" },
    { "@type": "Country", name: "Germany" },
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: BRAND_COMPANY.phone,
      email: BRAND_COMPANY.email,
      contactType: "customer service",
      areaServed: "TR",
      availableLanguage: ["Turkish", "English"],
    },
    {
      "@type": "ContactPoint",
      email: BRAND_COMPANY.email,
      contactType: "technical support",
      areaServed: "TR",
    },
  ],
  sameAs: [
    "https://www.linkedin.com/company/xipsoft",
    "https://github.com/xipsoft",
    "https://twitter.com/xipsoft",
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(SITE_URL),
    // Template kısaltıldı: uzun BRAND.name yerine "XipSoft" — SERP'te title taşması önlenir
    // Google title'ı 50-60 karakter civarında kesiyor; kısa suffix daha fazla içerik karakterine yer bırakır
    title: { default: APP_CONFIg.title, template: `%s | XipSoft` },
    description: APP_CONFIg.description,
    keywords: [
      "web yazılım", "mobil uygulama geliştirme", "siber Güvenlik",
      "seo hizmetleri", "masaüstü yazılım", "dijital pazarlama",
      "xipsoft", "yazılım teknoloji sistemleri",
      "istanbul yazılım şirketi", "web tasarım istanbul",
      "next.js geliştirme", "react geliştirme", "flutter mobil uygulama",
    ],
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
      title: APP_CONFIg.title, description: APP_CONFIg.description,
      siteName: BRAND.name, locale: "tr_TR",
      alternateLocale: ["en_US"],
      images: [Og_IMAgE],
    },
    twitter: {
      card: "summary_large_image",
      site: "@xipsoft",
      creator: "@xipsoft",
      title: APP_CONFIg.title, description: APP_CONFIg.description,
      images: [Og_IMAgE],
    },
    // Google Search Console doğrulama
    verification: {
      google: "OZVclRMBu_yvlKecmkXQHnEwBdCUg5sslkhWhDKM6N8",
    },
    category: "technology",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([
    getLocale(),
    getMessages(),
  ]);

  const cls = cn(
    displayFont.variable,
    bodyFont.variable,
    monoFont.variable,
    "min-h-screen scroll-smooth overflow-x-hidden",
  );

  return (
    <html
      lang={locale}
      data-theme="obsidian"
      data-site-font={defaultFont}
      className="dark overflow-x-hidden"
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        <Favicons />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#a78bfa" />
        {/* NOT: res.cloudinary.com preconnect'i KALDIRILDI. Blog/ürün görselleri
            next/image ile `/_next/image` üzerinden servis ediliyor; tarayıcı
            res.cloudinary.com'a doğrudan bağlanmadığı için bu preconnect
            kullanılmıyordu (PSI: "Kullanılmayan ön bağlantı"). */}
        {/* DNS Prefetch — preconnect açamadığımız ikincil kaynaklar */}
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//challenges.cloudflare.com" />
        <link rel="alternate" type="application/rss+xml" title="XipSoft Blog RSS" href="/blog/feed.xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className={cls} suppressHydrationWarning>
        {/* GoogleAnalytics buradan kaldırıldı — AnalyticsScripts (lazyOnload) site layout'ta tek noktadan yönetiliyor */}
        {/* Dil sırası önemli: LanguageProvider (localStorage locale) → IntlMessagesProvider
            (locale'e göre messages json'unu istemci tarafında yükler) → geri kalan provider'lar */}
        <LanguageProvider>
          <IntlMessagesProvider serverLocale={locale} serverMessages={messages}>
            <AuthProvider>
              <CartProvider>
                <AuctionProvider>
                  {children}
                </AuctionProvider>
              </CartProvider>
            </AuthProvider>
          </IntlMessagesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
