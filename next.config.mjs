import path from "path";
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

let withBundleAnalyzer = (config) => config;
try {
  const analyzer = require("@next/bundle-analyzer");
  // Not: paket doğrudan factory export eder (`module.exports = NextBundleAnalyzer`),
  // `.withBundleAnalyzer` alanı yoktu → build:analyze sessizce no-op çalışıyordu.
  if (typeof analyzer === "function") {
    withBundleAnalyzer = analyzer({
      enabled: process.env.ANALYZE === "true",
      openAnalyzer: false,
    });
  } else if (analyzer && typeof analyzer.withBundleAnalyzer === "function") {
    withBundleAnalyzer = analyzer.withBundleAnalyzer({
      enabled: process.env.ANALYZE === "true",
    });
  }
} catch (err) {
  console.warn("[Config] Bundle Analyzer not available, skipping");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  compress: true,
  // Keep the public canonical URL slash-free so / and /?x never gain a redirect hop.
  trailingSlash: false,
  // Trailing slash redirect'ini Next'in kendi katmanina BIRAKMA: middleware
  // (src/middleware-utils/index.ts adim 0) trailing slash + tr locale onekini
  // + .html ekini TEK 301'de birlestirir. Aksi halde /tr/x/ -> /tr/x (308,
  // Next) -> /x (301, middleware) gibi iki hop'lu zincir olusuyordu.
  skipTrailingSlashRedirect: true,
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    ...(process.env.TURBOPACK != null
      ? {
          turbo: {
            resolveAlias: {
              "next-intl/config": "./src/i18n/request.ts",
            },
          },
        }
      : {}),
    // optimizePackageImports: tree-shaking'i zorla — yalnızca kullanılan
    // export'lar bundle'a girer, kullanılmayan ikonlar/bileşenler dışarıda kalır.
    // react-icons özellikle kritik: tüm ikon setini değil yalnızca import edilen
    // ikonları dahil eder.
    optimizePackageImports: [
      "lucide-react",
      "motion/react",
      "framer-motion",
      "date-fns",
      "react-icons",
      "@lexical/react",
      "gsap",
      "lenis",
      "@floating-ui/react",
    ],
    scrollRestoration: true,
    optimizeCss: process.env.NODE_ENV === "production",
    optimizeServerReact: true,
    ppr: false,
    inlineCss: process.env.NODE_ENV === "production",
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  serverExternalPackages: ["pg", "argon2", "isomorphic-dompurify", "jsdom"],
  webpack: (config, { isServer, dev }) => {
    try {
      const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
      config.resolve.plugins = [
        ...(config.resolve.plugins || []),
        new TsconfigPathsPlugin({ configFile: path.resolve(__dirname, "tsconfig.json") }),
      ];
    } catch (e) {
      // plugin yoksa devam et
    }

    const srcAliases = {
      "@/hooks": path.resolve(__dirname, "src/hooks"),
      "@/components": path.resolve(__dirname, "src/components"),
      "@/lib": path.resolve(__dirname, "src/lib"),
      "@/context": path.resolve(__dirname, "src/context"),
      "@/utils": path.resolve(__dirname, "src/utils"),
      "@/config": path.resolve(__dirname, "src/config"),
      "@/styles": path.resolve(__dirname, "src/styles"),
      "@/types": path.resolve(__dirname, "src/types"),
      "@/fonts": path.resolve(__dirname, "src/fonts"),
      "@/data": path.resolve(__dirname, "src/data"),
      "@/services": path.resolve(__dirname, "src/services"),
      "@/app": path.resolve(__dirname, "src/app"),
    };

    config.resolve.alias = {
      ...srcAliases,
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
      "next-intl/config": path.resolve(__dirname, "src/i18n/request.ts"),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        pg: false,
      };
    }

    // ── Görev: @babel/runtime polyfill'lerini kaldır ───────────────────────
    // date-fns v2 @babel/runtime'a bağımlıdır; bu paket Array.prototype.at,
    // Array.prototype.flat, Object.fromEntries vb. polyfill'lerini beraberinde
    // getirir (PSI: "Eski JavaScript — 12.7 KiB israf").
    // Modern tarayıcıları (browserslist: last 2 versions) hedeflerken bu
    // polyfill'ler gereksizdir; webpack alias ile boş modüle yönlendirilir.
    if (!isServer && !dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Array.prototype.at — Chrome 92+, Firefox 90+, Safari 15.4+ (hepsi "last 2" kapsamında)
        "@babel/runtime/core-js/array/at": false,
        // Array.prototype.flat / flatMap — Chrome 69+, Firefox 62+
        "@babel/runtime/core-js/array/flat": false,
        "@babel/runtime/core-js/array/flat-map": false,
        // Object.fromEntries — Chrome 73+, Firefox 63+
        "@babel/runtime/core-js/object/from-entries": false,
        // Object.hasOwn — Chrome 93+, Firefox 92+, Safari 15.4+
        "@babel/runtime/core-js/object/has-own": false,
        // String.prototype.trimStart / trimEnd — Chrome 66+, Firefox 61+
        "@babel/runtime/core-js/string/trim-start": false,
        "@babel/runtime/core-js/string/trim-end": false,
      };
    }

    // ── Görev 1: Chunk splitting — büyük vendor'ları ayrı cache grubuna al ─
    // Her grup kendi hash'iyle immutable cache alır; bir kütüphane güncellenince
    // yalnızca o chunk geçersizleşir, diğerleri tarayıcı cache'inde kalır.
    //
    // ⚠ ÖNEMLİ: Eskiden burada `defaultVendor` adında `test: /node_modules/` +
    // `chunks: "all"` olan bir catch-all cache grubu vardı. Bu grup TÜM
    // node_modules paketlerini tek bir `vendor-default` chunk'ında birleştiriyor
    // ve bu chunk her sayfaya ortak (initial) yüklendiği için ana sayfa ~385 KB
    // (büyük kısmı kullanılmayan) vendor JS indiriyordu (PSI: "261 KiB unused JS").
    // Catch-all KALDIRILDI; kalan node_modules webpack'in varsayılan `defaultVendors`
    // grubuna bırakıldı — böylece yalnızca initial chunk'ta gerçekten kullanılan
    // paketler ortak vendor'a, sadece belirli bir sayfada kullanılanlar ise o
    // sayfanın (async) chunk'ına girer.
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...((config.optimization && config.optimization.splitChunks) || {}),
          cacheGroups: {
            // motion — Navbar/Footer gibi her sayfada render edilen bileşenlerde
            // kullanıldığı için bilinçli olarak "all" → ortak chunk (cache dostu).
            motionVendor: {
              name: "vendor-motion",
              test: /[\\/]node_modules[\\/]motion[\\/]/,
              chunks: "all",
              priority: 40,
              reuseExistingChunk: true,
              enforce: true,
            },
            // framer-motion — yalnızca CartSidebar/Odeme (dinamik) kullanıyor;
            // "async" tutulur ki ilk yükte hiç indirilmesin. motion'dan AYRI grup
            // olması, iki paketin tek chunk'ta birleşip her sayfaya yüklenmesini önler.
            framerVendor: {
              name: "vendor-framer",
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              chunks: "async",
              priority: 41,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Lexical editor — büyük, yalnızca admin/blog yazma sayfalarında
            lexicalVendor: {
              name: "vendor-lexical",
              test: /[\\/]node_modules[\\/](@lexical|lexical)[\\/]/,
              chunks: "async", // async: sadece lazy import edildiğinde yüklenir
              priority: 35,
              reuseExistingChunk: true,
              enforce: true,
            },
            // React ekosistemi (react, react-dom, scheduler)
            reactVendor: {
              name: "vendor-react",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              chunks: "all",
              priority: 30,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }

    // ── Görev: Windows'ta boş next-font-manifest düzeltmesi ────────────────
    // Next'in `NextFontManifestPlugin`'i (next-font-manifest-plugin.js) font
    // modüllerini YALNIZCA ileri bölü (`/`) ile eşleştirir:
    //   `mod.request.includes('/next-font-loader/index.js?')`
    // Windows'ta webpack module request'leri ters bölü (`\`) kullanır, hiçbir
    // modül eşleşmez → `next-font-manifest.json` boş kalır (`{"app":{},"pages":{}}`)
    // → renderer hiçbir next/font dosyası için `<link rel="preload">` basmaz →
    // fontlar (PJS latin-ext, DM Mono) kritik zincire CSS keşfinden SONRA
    // takılır (document → CSS → font, PSI: 933ms).
    // Bu plugin modül request'lerindeki `\` → `/` dönüşümünü Next'in plugin'i
    // çalışmadan ÖNCE yapar (stage -2000 < -100 = PROCESS_ASSETS_STAGE_ADDITIONS),
    // böylece manifest dolar ve preload etiketleri üretilir. next/font ve onun
    // size-adjust fallback metrikleri aynen korunur.
    config.plugins.push(
      new (class NormalizeFontLoaderRequestPlugin {
        apply(compiler) {
          compiler.hooks.compilation.tap(
            "NormalizeFontLoaderRequestPlugin",
            (compilation) => {
              compilation.hooks.processAssets.tap(
                {
                  name: "NormalizeFontLoaderRequestPlugin",
                  // webpack Compilation.PROCESS_ASSETS_STAGE_PRE_PROCESS
                  stage: -2000,
                },
                () => {
                  if (!compilation.chunkGraph) return;
                  const seen = new Set();
                  for (const chunk of compilation.chunks) {
                    for (const mod of compilation.chunkGraph.getChunkModulesIterable(chunk)) {
                      if (!mod || seen.has(mod)) continue;
                      seen.add(mod);
                      const req = mod.request || mod.userRequest || "";
                      if (!req.includes("next-font-loader")) continue;
                      if (req.includes("\\")) {
                        mod.request = req.replace(/\\/g, "/");
                      }
                      if (mod.userRequest && mod.userRequest.includes("\\")) {
                        mod.userRequest = mod.userRequest.replace(/\\/g, "/");
                      }
                    }
                  }
                }
              );
            }
          );
        }
      })()
    );

    return config;
  },
  sassOptions: {
    includePaths: ["./styles"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "xipsoft.net" },
      { protocol: "https", hostname: "*.xipsoft.net" },
      { protocol: "https", hostname: "www.googletagmanager.com" },
      { protocol: "https", hostname: "static.cloudflareinsights.com" },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // 320/384/480 arası: küçük görseller (ör. 174px logo, DPR 1.75 → 304px)
    // eskiden doğrudan 640'a zıplıyordu (~18 KB); artık ~6 KB seçiliyor.
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 320, 384, 480],
    // avif önce: daha iyi sıkıştırma oranı = daha hızlı LCP
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    contentDispositionType: "attachment",
    unoptimized: false,
  },
  async redirects() {
    return [
      // ── www → non-www (301 kalıcı) — link juice korunur ─────────────────
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.xipsoft.net" }],
        destination: "https://xipsoft.net/:path*",
        permanent: true,
      },
      // ── http → https (301 kalıcı) — HTTPS sıralama sinyali ──────────────
      ...(process.env.NODE_ENV === "production"
        ? [{
            source: "/:path*",
            has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
            destination: "https://xipsoft.net/:path*",
            permanent: true,
          }]
        : []),
      // NOT: `/:path*.html` -> `/:path*` kurali buradan KALDIRILDI. `.html` eki
      // middleware'de (src/middleware-utils/index.ts, adim 0) locale ve
      // trailing-slash ile AYNI adimda temizlenir; ayri bir kural kalmasi
      // /forum/x/y.html -> /forum/x/y -> /blog/y gibi iki hop'lu zincir uretiyordu.
      // NOT: /forum/* burada toplu yönlendirilmez. Forum bölümü tamamen
      // kaldırıldı; eski WordPress forum URL'leri middleware'de
      // (src/middleware-utils/legacy-forum.ts) DB'deki blog yazılarıyla
      // eşleştirilir:
      //   - taşınmış thread  → 301 /blog/<slug> (blog_posts ile birebir eşleşme)
      //   - eşleşmeyenler    → 301 /blog
      // Buradaki toplu `/forum/* → /blog` soft-404 üretiyordu (GSC: 5.500+ kayıt).
      { source: "/index", destination: "/", permanent: true },
      { source: "/jobs", destination: "/", permanent: true },
      { source: "/download", destination: "/", permanent: true },
      { source: "/DeaFSoft", destination: "/", permanent: true },
      { source: "/DeaFSoft/:path*", destination: "/", permanent: true },
      { source: "/services/web", destination: "/hizmetler/web-yazilim-tasarim", permanent: true },
      { source: "/services/mobile", destination: "/hizmetler/mobil-uygulama", permanent: true },
      { source: "/services/desktop", destination: "/hizmetler/masaustu-yazilim", permanent: true },
      { source: "/services/security", destination: "/hizmetler/siber-guvenlik", permanent: true },
      { source: "/urunler/:path*", destination: "/hizmetler", permanent: true },
      { source: "/:locale(tr|en|de|fr|es|ru)/urunler/:path*", destination: "/:locale/hizmetler", permanent: true },
      // ── siber-guvenlik-hizmetleri alias yönlendirmeleri ──────────────────────
      // GSC'de /siber-guvenlik-hizmetleri/fatih URL'i yanlışlıkla canonical
      // seçildi. Tüm /hizmetler/siber-guvenlik-hizmetleri/* isteklerini
      // kanonik URL'e 301 ile bağlıyoruz — şehir segmenti varsa korunur.
      {
        source: "/hizmetler/siber-guvenlik-hizmetleri",
        destination: "/hizmetler/siber-guvenlik",
        permanent: true,
      },
      {
        source: "/hizmetler/siber-guvenlik-hizmetleri/:sehir*",
        destination: "/hizmetler/siber-guvenlik/:sehir*",
        permanent: true,
      },
      { source: "/services/seo", destination: "/hizmetler/seo-dijital-pazarlama", permanent: true },
      { source: "/drop-search", destination: "/", permanent: true },
      { source: "/clan", destination: "/", permanent: true },
      { source: "/live", destination: "/", permanent: true },
      { source: "/contact", destination: "/contact-us", permanent: true },
      { source: "/iletisim", destination: "/contact-us", permanent: true },
      { source: "/hakkinda", destination: "/hakkimizda", permanent: true },
      { source: "/about", destination: "/hakkimizda", permanent: true },
      { source: "/about-us", destination: "/hakkimizda", permanent: true },
      { source: "/products/:path*", destination: "/hizmetler", permanent: true },
      { source: "/:locale(tr|en|de|fr|es|ru)/products/:path*", destination: "/:locale/hizmetler", permanent: true },
      // NOT: /category, /tag, /author, /page, /feed, /comments → /blog toplu 301
      // burada YOK. Bunlar eski WordPress taksonomi/liste/feed URL'leridir; yeni sitenin
      // gerçek içerik karşılıkları olmadığı için middleware'de
      // (src/middleware-utils/legacy-forum.ts → handleLegacyWpPaths) 301 /blog döner.
      // Toplu `→ /blog` soft-404 üretiyordu (GSC "Yönlendirmeli sayfa" / "404" kaynağı).
      { source: "/wp-admin", destination: "/", permanent: true },
      { source: "/wp-content/:path*", destination: "/", permanent: true },
      { source: "/wp-includes/:path*", destination: "/", permanent: true },
      { source: "/xmlrpc.php", destination: "/", permanent: true },
      { source: "/services", destination: "/hizmetler/web-yazilim-tasarim", permanent: true },
      { source: "/portfolio", destination: "/references", permanent: true },
      { source: "/team", destination: "/hakkimizda", permanent: true },
      { source: "/careers", destination: "/", permanent: true },
      { source: "/news", destination: "/blog", permanent: true },
      { source: "/posts", destination: "/blog", permanent: true },
      { source: "/article/:slug*", destination: "/blog/:slug*", permanent: true },
      // ── Eski/bozuk URL'ler → konsolidasyon ──────────────────────────────────
      // GSC "Bulunamadı (404)" listesinde donen, iceerigi hic var olmamis
      // kalip URL'ler. Hepsi artik var olmadigi icin 404 yerine anasayfaya
      // (veya karsiligi olan sayfaya) tek hop 301 ile gonderilir.
      { source: "/clandetail/:path*", destination: "/", permanent: true },
      { source: "/demos/:path*", destination: "/", permanent: true },
      // Client tarafinda `href={undefined}` ureten bozuk linklerden dogan URL.
      { source: "/undefined", destination: "/", permanent: true },
      { source: "/undefined/:path*", destination: "/", permanent: true },
      // Uzantisiz istenen sitemap (robots.txt'teki gercek adres .xml).
      { source: "/sitemap", destination: "/sitemap.xml", permanent: true },
      // Eski WordPress/karma auth yolu — gercek giris sayfasi /login.
      { source: "/auth/login", destination: "/login", permanent: true },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/:key([0-9a-fA-Z]{8,64}).txt",
        destination: "/api/seo/indexnow-key?key=:key",
      },
    ];
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    return [
      {
        source: "/demos/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com",
              // Google Fonts self-host edildiğinden fonts.googleapis.com / fonts.gstatic.com kaldırıldı
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://cdn.tailwindcss.com",
            ].join("; "),
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/auth/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/teklif/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/login",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/register",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/odeme",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/maintenance",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/blog/:path*",
        has: [{ type: "query", key: "private" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/blog/edit",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/blog/my-posts",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/blog/write",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/x/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/x/edit",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      // ── Çok dilli geçiş: non-tr yereller şimdilik indexlenmesin ──────────
      // [locale] altyapısı en/de/fr/es/ru sayfalarını üretiyor ama mevcut
      // canonical mantığı locale-aware değil (hepsi tr URL'ine işaret ediyor).
      // Çok dilli SEO hazır olana kadar bu diller X-Robots-Tag ile noindex.
      // tr (öneksiz) indexlenmeye devam eder. `follow` bırakıldı ki iç
      // link keşfi ve tr sayfalarına link akışı zarar görmesin.
      ...["en", "de", "fr", "es", "ru"].map((loc) => ({
        source: `/${loc}/:path*`,
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow, noarchive" }],
      })),
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Vary", value: "Accept-Encoding" },
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              // Varsayılan: yalnızca kendi kaynakları
              "default-src 'self'",
              // Script: Next.js inline script'leri + analytics + Turnstile
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com https://challenges.cloudflare.com https://*.cloudflare.com",
              // Style: inline — Google Fonts artık self-host; fonts.googleapis.com kaldırıldı
              "style-src 'self' 'unsafe-inline'",
              // Font: kendi domain — Google Fonts self-host edildiği için fonts.gstatic.com kaldırıldı
              "font-src 'self' data: https://xipsoft.net",
              // Resim: kendi domain + Cloudinary CDN + data/blob
              "img-src 'self' data: blob: https://res.cloudinary.com https://xipsoft.net https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com",
              // Bağlantı: API'ler + analytics + Turnstile
              "connect-src 'self' https://xipsoft.net https://www.google-analytics.com https://analytics.google.com https://static.cloudflareinsights.com https://pagead2.googlesyndication.com https://challenges.cloudflare.com https://*.cloudflare.com",
              // Frame: reklam + Google gömüleri + Turnstile
              "frame-src 'self' https://www.google.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://challenges.cloudflare.com https://*.cloudflare.com",
              // Worker: Next.js service worker
              "worker-src 'self' blob:",
              // Manifest
              "manifest-src 'self'",
              // Media
              "media-src 'self' blob: data:",
              // Form aksiyonu: yalnızca kendi domain
              "form-action 'self'",
              // Frame gömüleme: hiçbiri (clickjacking koruması)
              "frame-ancestors 'none'",
              ...(isDev ? [] : ["upgrade-insecure-requests"]),
            ].join("; "),
          },
        ],
      },
      {
        source: "/:path*(manifest\\.webmanifest|manifest\\.json)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=600, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/:path*(svg|png|jpg|jpeg|webp|gif|ico)$",
        headers: [
          {
            key: "Cache-Control",
            value: isDev ? "no-store" : "public, max-age=31536000, immutable",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/:all*(svg|woff|woff2|ttf|eot)$",
        headers: [
          {
            key: "Cache-Control",
            value: isDev ? "no-store" : "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.(css|js)$",
        headers: [
          {
            key: "Cache-Control",
            value: isDev ? "no-store" : "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/sitemap/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, s-maxage=86400" },
        ],
      },
      {
        source: "/hakkimizda",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/contact-us",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/references",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/blog",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/urunler",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/hizmetler/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      // ── Ana sayfa ──────────────────────────────────────────────────────────
      // max-age=300: sayfanın kendi `revalidate = 300` değeriyle uyumlu — tarayıcı
      // 5 dk boyunca önbellekten sunar (eskiden max-age=0 idi → her ziyarette
      // yeniden doğrulama, TTFB ve dolayısıyla LCP olumsuz etkileniyordu).
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      // Dev chunk URLs are stable across edits; immutable caching keeps stale client bundles.
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: isDev
              ? "no-store, max-age=0, must-revalidate"
              : "public, max-age=31536000, immutable",
          },
        ],
      },
      // ── Next.js image optimization — LCP görselleri için agresif cache ────
      {
        source: "/_next/image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

const config = withBundleAnalyzer(nextConfig);

export default config;
