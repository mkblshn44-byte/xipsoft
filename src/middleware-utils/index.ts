/**
 * Middleware â€” Ana Handler
 *
 * TÃ¼m istekler bu dosyadan geÃ§er. ModÃ¼ler yapÄ±:
 *   1. IP Blocklist  â†’ engellenen IP'leri durdur
 *   2. Rate Limiter  â†’ DDoS/flood korumasÄ±
 *   3. Admin Access  â†’ gizli yol + 2FA guard
 *   4. Maintenance   â†’ bakÄ±m modu yÃ¶nlendirmesi
 *
 * SÄ±ra Ã¶nemlidir: IP blocklist en Ã¶nce kontrol edilir (gereksiz DB/Redis yÃ¼kÃ¼ engellenir).
 */

import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { blockIpIfNecessary, isSearchBot } from "./ip-blocklist";
import { checkRateLimit, checkPayloadSize } from "./rate-limiter";
import { getClientIp } from "@/lib/rate-limit";
import {
  guardAdminAccess,
  guardMaintenanceMode,
  guardAdminApi,
} from "./admin-access";
import { blockCountryIfNecessary } from "./country-blocklist";
import { DELETED_PATH_SET, normalizeTrailingSlash, stripLocalePrefix, buildGoneResponse, stripHtmlExtension, shouldStripHtmlExtension } from "./seo-normalize";
import { handleLegacyForum, handleLegacyWpPaths } from "./legacy-forum";
import { handleRedirect } from "@/lib/redirect-handler";
import { xipGuardCheck } from "@/lib/security/xip-guard";

// next-intl routing middleware — as-needed: tr kök (/hakkimizda), diğer diller önekli (/en/...)
const intlMiddleware = createIntlMiddleware(routing);

// Static assets â€” middleware'den muaf
const STATIC_PATTERN =
  /\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot|css|js|map|ico|json|txt|xml)$/i;

// Public dosyalar â€” her zaman izin ver (manifest, robots, ads.txt vb.)
const PUBLIC_FILES = new Set([
  "/manifest.json",
  "/robots.txt",
  "/ads.txt",
  "/sitemap.xml",
  "/llms.txt",
]);

// Silinen (soft-delete) iÃ§erik kalÄ±plarÄ± â€” 410 Gone dÃ¶ner (Google'a "artÄ±k yok" mesajÄ±)
// `pages.is_deleted = TRUE` veya `Blog_posts.deleted_at NOT NULL` olan slug'lar buraya alÄ±nÄ±r.
// Liste build zamanÄ±nda statik; runtime DB kontrolÃ¼ crawl budget korumak iÃ§in sÄ±nÄ±rlÄ± tutulur.

export default async function middleware(
  req: NextRequest
): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // 00. XipGuard — zincirin en başındaki en ucuz kesim. Kısa ömürlü blok veya
  // istek aşımı varsa redirect/DB/render katmanlarına hiç uğramadan 403/429
  // döner. Upstash env'i yoksa katman no-op'tur (bkz. lib/security/xip-guard).
  const guardResponse = await xipGuardCheck(req);
  if (guardResponse) return guardResponse;

  // 0a-pre. www → non-www — Vercel kendi routing katmanında 308 ürettiği için
  // next.config.mjs redirect kuralı yetersiz kalıyor. Middleware Node.js
  // runtime'da çalışıyor (build çıktısı: middleware.js.nft.json `pg` trace ediyor,
  // `.next/server/edge/` üretilmiyor) → kesin 301 garantisi.
  const host = req.headers.get("host") ?? "";
    if (process.env.NODE_ENV === "production" && host.startsWith("www.")) {
    const nonWwwHost = host.slice(4); // "www." kaldır
    const target = new URL(req.url);
    target.host = nonWwwHost;
    const resp = NextResponse.redirect(target.toString(), { status: 301 });
    resp.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return resp;
  }

  // 0. URL normalizasyonu — trailing slash + TR locale öneki TEK adımda 301
  // next.config.mjs `trailingSlash: false` olduğu için:
  //   /x/        -> 301 /x  (kök / hariç)
  // A seçeneği (Türkçe kök):
  //   /tr/hakkimizda   -> 301 /hakkimizda   (SEO kopya içerik önlenir)
  //   /tr/hakkimizda/  -> 301 /hakkimizda   (zincir yok, tek hop)
  //   /tr              -> 301 /
  //
  // `.html` POLİTİKASI (Aşama 6 + veri odaklı karar): İçerik ağacı düğümlerinin
  // kanonik adresi `.html` ile biter → bu uzantı KORUNUR. Yalnızca uzantısız
  // kanoniğe sahip kod/legacy rotalarda (`/hizmetler`, `/blog`, statik
  // sayfalar…) eski WordPress `.html` bağlantılarını tek adımda temizlemek için
  // sökülür. Legacy bir kökün (`/forum`, `/news`, `/urunler`…) altında
  // yayınlanmış bir ağaç sayfası varsa kararı VERİ verir: `.html` kanonik
  // kalır ve istek rotaya ulaşır. Ağaç kararı yoksa elle liste geçerlidir.
  const htmlStripped = stripHtmlExtension(pathname);
  const hasHtmlExtension = htmlStripped !== pathname;
  const basePath =
    hasHtmlExtension && (await shouldStripHtmlExtension(htmlStripped))
      ? htmlStripped
      : pathname;
  const normalized =
    normalizeTrailingSlash(
      process.env.NODE_ENV === "development"
        ? basePath
        : stripLocalePrefix(basePath, routing.defaultLocale)
    ) || "/";

  // NOT: www -> non-www redirect yukarida (0a-pre) middleware'de yapiliyor.




  // 0b. Bilinen silinmiÅŸ URL kalÄ±plarÄ± â†’ 410 Gone (crawl budget tasarrufu, Madde 26)
  if (DELETED_PATH_SET.has(normalized)) {
    return buildGoneResponse(normalized) as unknown as NextResponse;
  }

  // 0c. Eski WordPress forum URL'leri (forum bölümü kaldırıldı) -> taşınmışsa
  //     301 /blog/<slug>, aksi halde 301 /blog (GSC'de "Yonlendirmeli sayfa").
  //     YAYIN decision istisnası: yolu kök catch-all'un çözdüğü bir ağaç
  //     düğümü sahipleniyorsa handler null döner ve istek devam eder.
  const localePrefix = routing.locales.find(
    (locale) => normalized === `/${locale}` || normalized.startsWith(`/${locale}/`)
  );
  const legacyPathname = localePrefix
    ? normalized.slice(localePrefix.length + 1) || "/"
    : normalized;

  // Eski blog query URL'lerini temiz, path tabanlı blog URL'lerine taşı.
  // Slug tek bir URL segmentine kodlanır; sorgu parametreleri hedefe taşınmaz.
  if (
    (legacyPathname === "/blog" || legacyPathname === "/blog/post") &&
    req.nextUrl.searchParams.has("slug")
  ) {
    const rawSlug = req.nextUrl.searchParams.get("slug")?.trim();
    const slug = rawSlug?.replace(/^\/+/, "").replace(/^blog\//i, "");
    if (slug) {
      const target = new URL(req.nextUrl);
      target.pathname = `${localePrefix ? `/${localePrefix}` : ""}/blog/${encodeURIComponent(slug)}`;
      target.search = "";
      return NextResponse.redirect(target, 301);
    }
  }

  const legacyForumResponse = await handleLegacyForum(req, legacyPathname);
  if (legacyForumResponse) return legacyForumResponse;

  const legacyWordPressResponse = await handleLegacyWpPaths(req, legacyPathname);
  if (legacyWordPressResponse) return legacyWordPressResponse;

  // 0d. Yalnizca normalizasyon (locale / trailing slash / .html) gerekiyorsa
  // tek hop'ta 301 yonlendir. Forum/taksonomi karari YUKARIDA verildigi icin
  // .html ekli bir forum URL'i buraya gelmeden dogrudan hedefe gider.
  if (normalized !== pathname) {
    const target = new URL(req.nextUrl);
    target.pathname = normalized;
    return NextResponse.redirect(target, 301);
  }

  // Static dosyalarÄ± ve public dosyalarÄ± atla
  if (STATIC_PATTERN.test(pathname) || PUBLIC_FILES.has(pathname)) {
    return NextResponse.next();
  }

  // X-Forwarded-For'dan IP al (Vercel/Netlify proxy arkasÄ±nda)
  const ip = getClientIp(req);

  const userAgent = req.headers.get("user-agent");

  // Arama motoru botlarÄ± IP blocklist ve rate limit'ten tamamen muaf
  const isBot = isSearchBot(userAgent);

  // 1. IP Blocklist + Country Blocklist & Rate Limiting (parallel)
  const country = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || null;
  const shouldApplyRateLimit = !isBot || pathname === "/api" || pathname.startsWith("/api/");
  const [blockResponse, countryResponse, rateLimitResponse] = await Promise.all([
    blockIpIfNecessary(ip, userAgent),
    isBot ? Promise.resolve(null) : blockCountryIfNecessary(country),
    shouldApplyRateLimit ? checkRateLimit(req, pathname) : Promise.resolve(null),
  ]);
  if (blockResponse) return blockResponse;
  if (countryResponse) return countryResponse;
  if (rateLimitResponse) return rateLimitResponse;

  // 3. Payload Size Check
  const payloadResponse = checkPayloadSize(req, pathname);
  if (payloadResponse) return payloadResponse;

  // 4. Admin Access guard
  const adminResponse = await guardAdminAccess(req);
  if (adminResponse) return adminResponse;

  // 5. Admin API guard
  const apiResponse = await guardAdminApi(req);
  if (apiResponse) return apiResponse;

  // 6. Maintenance Mode
  const maintenanceResponse = guardMaintenanceMode(req);
  if (maintenanceResponse) return maintenanceResponse;

  // DB-backed redirects run after security guards and before locale rewriting.
  if (
    (req.method === "GET" || req.method === "HEAD") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/admin")
  ) {
    const redirectResponse = await handleRedirect(req);
    if (redirectResponse) return redirectResponse;
  }

  // 7. next-intl routing — as-needed: tr kök (/hakkimizda), diğer diller önekli (/en/...).
  // Ayrıca /tr/... gibi kalan önekli tr isteklerini de o normalizer (biz 0. adımda 301 ile yakalarız).
  // DİKKAT: middleware her durumda bir response döndürür; bu yüzden
  // security headers ESKİ `return intlResponse` sonrasına yazılamazdı (ölü koddu).
  //
  // KRİTİK: `/api/*` route'ları next-intl locale rewrite'ına UĞRAMAMALIDIR.
  // Aksi halde `/api/bot` → `/tr/api/bot` olarak yeniden yazılır, `[locale]`
  // altında böyle bir route olmadığı için API 404 döner (bot API tamamen kırılır).
  // API istekleri guard'lardan (IP/rate-limit/admin) yukarıda geçti; burada
  // yalnızca intl rewrite'ı atlanır.
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isApiPath = pathname === "/api" || pathname.startsWith("/api/");
  // Erişim reddi sayfası — `/admin/*` istekleri buraya rewrite edilir; next-intl
  // locale rewrite'ına uğramamalıdır (aksi halde /tr/erisim-yok 404 verir).
  const isNoAccessPath = pathname === "/erisim-yok";
  const hasLocalePrefix = routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  const devLocaleRewrite = process.env.NODE_ENV === "development"
    ? hasLocalePrefix
      ? NextResponse.next()
      : NextResponse.rewrite(new URL(`/tr${pathname}`, req.url))
    : null;
  const res =
    isApiPath || isAdminPath || isNoAccessPath
      ? NextResponse.next()
      : devLocaleRewrite ?? intlMiddleware(req);

  // 8. Güvenlik header'ları burada DEĞİL — tek kaynak `next.config.mjs`
  //    `headers()` bloğu (`source: "/:path*"`). Eskiden üç yer (vercel.json,
  //    next.config.mjs, middleware) aynı dört başlığı ayrı ayrı yazıyordu;
  //    değerler eşit olsa da hangisinin kazanacağı belirsizdi. next.config
  //    hem `next dev`/`next start` hem Vercel tarafında çalıştığı ve CDN
  //    statiklerini de kapsadığı için o bırakıldı, buradaki tekrar silindi.
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

export { invalidateIpBlockCache } from "./ip-blocklist";
