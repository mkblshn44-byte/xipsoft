/**
 * Rate Limiter — Middleware Module
 *
 * Sliding window algoritmasıyla IP bazlı rate limiting.
 * Redis (Upstash) ile çalışır; Redis yoksa fail-open.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit as checkSharedRateLimit,
  checkPayloadSizeFromHeader as checkSharedPayloadSize,
  createRateLimitResponse,
  getClientIp,
  getEndpointRateLimit,
} from "@/lib/rate-limit";

const ROUTE_LIMITED_ENDPOINTS = new Set([
  "/api/bot",
  "/api/content",
  "/api/teklif",
  "/api/telegram",
  "/api/revalidate/locations",
]);

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
  const config = getEndpointRateLimit(pathname);
  const result = await checkSharedRateLimit(`${ip}:${pathname}`, {
    ...config,
    failClosed: config.failClosed || pathname === "/api" || pathname.startsWith("/api/"),
    keyPrefix: "middleware",
  });
  return result.success ? null : createRateLimitResponse(result, config);
}
