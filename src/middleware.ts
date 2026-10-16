// ── Middleware — Thin Wrapper ──────────────────────────────────────────────────
// DİKKAT: Next.js `src/` kullanıldığında middleware dosyasını PROJE KÖKÜ'NDE
// değil, `src/` altında arar (next/dist/server/lib/router-utils/setup-dev-bundler.js
// → rootDir = appDir/..). Kökteki middleware.ts asla yüklenmiyordu; tüm
// middleware zinciri (IP blocklist, rate limit, next-intl routing) ölüydü.
// Bu dosya o yüzden src/ altındadır.
//
// Tüm mantık src/middleware-utils/ modüllerine bölünmüştür.
// Bu dosya sadece Next.js'in beklediği export'ları sağlar.

import { default as middlewareHandler } from "./middleware-utils/index";

export default middlewareHandler;

// Middleware, pg/redis gibi Node.js modüllerini kullandığı için Node runtime'da
// çalışır (Edge runtime 'crypto'/pg desteklemez).
export const runtime = "nodejs";

export const config = {
  matcher: [
    /*
     * Tüm istekleri yakala — static asset'ler hariç.
     * www → non-www redirect için blog, hizmetler, x/ dahil her route gerekli.
     * _next/static, _next/image, favicon.ico middleware'den muaf tutulur.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

export { invalidateIpBlockCache } from "./middleware-utils/ip-blocklist";
