/**
 * İçerik API rotalarının ortak ön-yüzü (request guard).
 *
 * Sıra tek yerde sabitlenmiştir: **rate-limit → auth → payload** (→ opsiyonel
 * gövde parse). Böylece 4 rota (bot / content / content/update /
 * revalidate/locations) aynı davranışı paylaşır (DRY) ve auth/payload sırası
 * tutarlı kalır (B1).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  checkRateLimit,
  createRateLimitResponse,
  getEndpointRateLimit,
  checkPayloadSize,
  getClientIp,
} from "@/lib/rate-limit";
import { verifyContentApiKey } from "./auth";

export interface GuardResult {
  /** Guard geçilemediyse döndürülecek yanıt; geçildiyse `null`. */
  response: NextResponse | null;
  /** `withBody` ise parse edilmiş gövde (aksi halde `{}`). */
  body: Record<string, unknown>;
}

export interface GuardOptions {
  /** Rate-limit konfigürasyonu için endpoint yolu, ör. "/api/content". */
  endpoint: string;
  /** Rate-limit Redis anahtar ön eki, ör. "content". */
  rateKeyPrefix: string;
  /** Gövde gerekiyorsa `true` — JSON parse edilir. */
  withBody?: boolean;
  /** Geçersiz JSON gövdesi için HTTP durumu (varsayılan 422). */
  invalidJsonStatus?: number;
  /** Geçersiz JSON gövdesi için mesaj (varsayılan "geçersiz JSON"). */
  invalidJsonMessage?: string;
}

/**
 * Rate-limit + auth + payload kontrolünü sırayla uygular; `withBody` ise
 * gövdeyi parse eder. Guard geçilmezse `response` dolu döner.
 */
export async function guardContentApiRequest(
  req: NextRequest,
  options: GuardOptions,
): Promise<GuardResult> {
  const ip = getClientIp(req);
  const rateConfig = getEndpointRateLimit(options.endpoint);
  const rateResult = await checkRateLimit(`${options.rateKeyPrefix}:${ip}`, rateConfig);
  if (!rateResult.success) {
    return { response: createRateLimitResponse(rateResult, rateConfig), body: {} };
  }

  const authErr = verifyContentApiKey(req);
  if (authErr) return { response: authErr, body: {} };

  const payloadCheck = await checkPayloadSize(req, options.endpoint);
  if (payloadCheck) return { response: payloadCheck, body: {} };

  if (!options.withBody) return { response: null, body: {} };

  try {
    const body = (await req.json()) as Record<string, unknown>;
    return { response: null, body };
  } catch {
    return {
      response: NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: options.invalidJsonMessage ?? "geçersiz JSON",
        },
        { status: options.invalidJsonStatus ?? 422 },
      ),
      body: {},
    };
  }
}

/**
 * Yalnızca rate-limit + auth gerektiren GET (dokümantasyon) uçları için kısa
 * yol. Yetkisizse NextResponse, aksi halde `null` döner.
 */
export async function guardContentApiRead(
  req: NextRequest,
  options: { endpoint: string; rateKeyPrefix: string },
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const rateConfig = getEndpointRateLimit(options.endpoint);
  const rateResult = await checkRateLimit(`${options.rateKeyPrefix}:${ip}`, rateConfig);
  if (!rateResult.success) return createRateLimitResponse(rateResult, rateConfig);

  return verifyContentApiKey(req);
}
