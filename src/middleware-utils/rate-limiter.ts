/**
 * Rate Limiter — Middleware Module
 *
 * IP bazlı limit. Kova IP başınadır (path başına değil). Süreç içi ön-eşik
 * sayesinde sıradan ziyaretçi Redis'e hiç ulaşmaz; eşiği aşan IP — flood'un
 * kendisi — istek başına tek komutla paylaşımlı sayaçtan geçer.
 * Redis yoksa/erişilemezse fail-open.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit as checkSharedRateLimit,
  checkPayloadSizeFromHeader as checkSharedPayloadSize,
  createRateLimitResponse,
  getClientIp,
  getRateLimitBucket,
  type RateLimitConfig,
} from "@/lib/rate-limit";
import { bumpLocalWindow } from "@/lib/security/local-window";
import { isLoopbackIp } from "@/middleware-utils/ip-blocklist";

const ROUTE_LIMITED_ENDPOINTS = new Set([
  "/api/bot",
  "/api/content",
  "/api/teklif",
  "/api/telegram",
  "/api/revalidate/locations",
]);

/**
 * Yerel ön-eşik: bir IP'nin Redis'e dokunmadan götürebileceği istek sayısı
 * (limitin %10'u, taban 10). Karar instance başına verilir, o yüzden eşik
 * limitin küçük bir kesri olarak tutulur — paylaşım doğruyu Redis'te.
 */
function freeLocalRequests(config: RateLimitConfig): number {
  return Math.max(10, Math.ceil(config.maxRequests * 0.1));
}

export function checkPayloadSize(
  req: NextRequest,
  pathname: string
): NextResponse | null {
  return checkSharedPayloadSize(req, pathname);
}

export async function checkRateLimit(
  req: NextRequest,
  pathname: string
): Promise<NextResponse | null> {
  if (ROUTE_LIMITED_ENDPOINTS.has(pathname)) return null;

  const ip = getClientIp(req);

  // IP tanımlanamıyorsa (`next dev`'de XFF header'ı yok → "unknown") ya da
  // yerelse limit uygulamak anlamsız: bütün trafik tek kovada toplanır ve
  // geliştirici kendini 429'lar. `xip-guard` da aynı ilkeyle ikisini düşürür.
  if (ip === "unknown" || isLoopbackIp(ip)) return null;

  const { config, keyPrefix, endpointSpecific } = getRateLimitBucket(pathname);

  // Özel limit tanımlı yollar (/admin gibi) hacimsiz ama kritik: ön-eşik yok,
  // her istek paylaşımlı sayaçtan geçer.
  if (!endpointSpecific) {
    const local = bumpLocalWindow(`${keyPrefix}:${ip}`, config.windowMs);
    if (local.count <= freeLocalRequests(config)) return null;
  }

  const result = await checkSharedRateLimit(ip, {
    ...config,
    failClosed: config.failClosed || pathname === "/api" || pathname.startsWith("/api/"),
    keyPrefix,
  });
  if (result.success) return null;

  // NOT (PERF/UX): `/api/track` bir telemetri (sendBeacon) endpoint'i. Redis
  // yokken/erişilemezken fail-closed davranıp 503 dönmek:
  //   1) tarayıcı konsoluna "Failed to load resource: 503" hatası yazıyor
  //      (Lighthouse best-practices: errors-in-console),
  //   2) ziyaretçi verisini tamamen kaybediyor.
  // Bu endpoint için sessiz 204 dönüyoruz: hata yok, DB yazımı da yok.
  if (result.unavailable && pathname === "/api/track") {
    return new NextResponse(null, { status: 204 });
  }

  return createRateLimitResponse(result, config);
}
