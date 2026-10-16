/**
 * Rate Limiting Middleware — Redis-based
 *
 * Rate Limiting Middleware — Redis-based
 * 
 * Kullanım:
 *   - API route'larda rate limit kontrolü
 *   - IP-based ve user-based limit destegi
 *   - sliding window algoritması
 *
 * Üretimde hassas endpoint'ler Redis kullanılamadığında fail-closed davranır.
 */

import { getRedisClient } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local maxRequests = tonumber(ARGV[3])
local member = ARGV[4]
local ttl = tonumber(ARGV[5])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= maxRequests then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfter = window
  if #oldest > 0 then
    retryAfter = tonumber(oldest[2]) + window - now
  end
  return {0, 0, math.max(0, retryAfter)}
end

redis.call('ZADD', key, now, member)
redis.call('EXPIRE', key, ttl)
return {1, maxRequests - count - 1, window}
`;

// ─── Payload boyut limitleri ──────────────────────────────────────────────────
// Endpoint bazlı maksimum request body boyutu (byte)
const PAYLOAD_LIMITS: Record<string, number> = {
  '/api/bot':      512 * 1024, // 512 KB
  '/api/content': 512 * 1024, // 512 KB
  '/api/telegram': 64 * 1024,  // 64 KB
  '/api/teklif':   32 * 1024,  // 32 KB
};

const DEFAULT_PAYLOAD_LIMIT = 64 * 1024; // 64 KB — genel default

/**
 * Pathname'e göre payload boyut limitini döndürür.
 */
function getPayloadLimit(pathname: string): number {
  for (const [endpoint, limit] of Object.entries(PAYLOAD_LIMITS)) {
    if (pathname === endpoint || pathname.startsWith(`${endpoint}/`)) return limit;
  }
  return DEFAULT_PAYLOAD_LIMIT;
}

/** 413 yanıtı — tüm boyut kontrolleri için ortak gövde. */
function payloadTooLargeResponse(limit: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Payload Too Large',
      message: `Istek boyutu çok büyük. Maksimum: ${Math.round(limit / 1024)} KB`,
      limit,
    },
    {
      status: 413,
      headers: { 'Content-Length': '0' },
    }
  );
}

/** Content-Length header'ına göre hızlı (senkron) boyut kontrolü. */
export function checkPayloadSizeFromHeader(req: NextRequest, pathname: string): NextResponse | null {
  const contentLength = req.headers.get('content-length');
  if (!contentLength) return null;
  const size = parseInt(contentLength, 10);
  if (!isNaN(size) && size > getPayloadLimit(pathname)) {
    return payloadTooLargeResponse(getPayloadLimit(pathname));
  }
  return null;
}

/** Content-Length yokken (chunked) gövdeyi sınırı aşmadan okuyup ölçer. */
async function exceedsBodyLimit(req: NextRequest, limit: number): Promise<boolean> {
  const body = req.clone().body;
  if (!body) return false;
  const reader = body.getReader();
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value?.byteLength ?? 0;
      if (total > limit) {
        await reader.cancel();
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Request body boyutunu kontrol eder.
 * Content-Length header'ı varsa hızlı kontrol yapar.
 * Yoksa (chunked) body'yi clone üzerinden sınırı aşmadan okuyup ölçer.
 */
export async function checkPayloadSize(
  req: NextRequest,
  pathname: string
): Promise<NextResponse | null> {
  const limit = getPayloadLimit(pathname);

  const headerCheck = checkPayloadSizeFromHeader(req, pathname);
  if (headerCheck) return headerCheck;

  // Content-Length yoksa gövdeyi ölç (aksi halde chunked istekler limiti atlar).
  if (!req.headers.get('content-length') && (await exceedsBodyLimit(req, limit))) {
    return payloadTooLargeResponse(limit);
  }

  return null; // OK
}

export function getClientIp(req: NextRequest): string {
  const trustedAddress =
    req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-real-ip')?.trim();
  if (trustedAddress) return trustedAddress;

  const forwardedAddresses = req.headers.get('x-forwarded-for');
  return forwardedAddresses?.split(',').pop()?.trim() || 'unknown';
}

export interface RateLimitConfig {
  windowMs: number;      // Zaman penceresi (milisaniye)
  maxRequests: number;   // Maksimum istek sayısı
  keyPrefix?: string;    // Redis key prefix
  message?: string;      // Limit asıldıgında mesaj
  failClosed?: boolean;  // Redis yoksa/bozulursa üretimde isteği reddet
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  reset: number;         // Window reset timestamp
  retryAfter?: number;   // Tekrar deneme süresi (ms)
  unavailable?: boolean;
}

function isRateLimitResponse(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((part) => typeof part === 'number' && Number.isFinite(part))
  );
}

/**
 * Rate limit kontrolü yap
 * 
 * @param identifier - IP adresi veya user ID
 * @param config - Rate limit yapılandırması
 * @returns Rate limit sonucu
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  // Redis yoksa fail-open — istegi geçir (UX engellenmesin)
  // Rate limiting sadece Redis ile çalısır; Redis yoksa limitsiz çalısır.
  if (!redis) {
    if (config.failClosed && process.env.NODE_ENV === 'production') {
      return {
        success: false,
        remaining: 0,
        limit: config.maxRequests,
        reset: Date.now() + config.windowMs,
        retryAfter: config.windowMs,
        unavailable: true,
      };
    }
    return {
      success: true,
      remaining: config.maxRequests,
      limit: config.maxRequests,
      reset: Date.now() + config.windowMs,
    };
  }

  const prefix = config.keyPrefix || 'ratelimit';
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const reset = now + config.windowMs;

  try {
    const response = await redis.eval(
      SLIDING_WINDOW_SCRIPT,
      [key],
      [
        String(now),
        String(config.windowMs),
        String(config.maxRequests),
        `${now}-${randomUUID()}`,
        String(Math.ceil(config.windowMs / 1000)),
      ],
    );
    if (!isRateLimitResponse(response)) {
      throw new Error('Unexpected Redis rate-limit response');
    }
    const [allowed, remaining, retryAfter] = response;

    return allowed === 1
      ? {
          success: true,
          remaining: Math.max(0, remaining),
          limit: config.maxRequests,
          reset,
        }
      : {
          success: false,
          remaining: 0,
          limit: config.maxRequests,
          reset,
          retryAfter: Math.max(0, retryAfter),
        };
  } catch (error) {
    console.error('[RateLimit] Redis error:', error);
    if (config.failClosed && process.env.NODE_ENV === 'production') {
      return {
        success: false,
        remaining: 0,
        limit: config.maxRequests,
        reset: Date.now() + config.windowMs,
        retryAfter: config.windowMs,
        unavailable: true,
      };
    }
    return {
      success: true,
      remaining: config.maxRequests,
      limit: config.maxRequests,
      reset: Date.now() + config.windowMs,
    };
  }
}

/**
 * Endpoint bazlı rate limit konfigürasyonları
 * Önceden middleware.ts içindeydi — tek kaynak burası.
 *
 * gENEL KURAL: Her IP, 10 dakikada maksimum 50 istek atabilir (100 → 50 DDoS saldırısı sonrası).
 * Hassas endpoint'ler (auth, upload, stream) daha düsük limitlerle korunur.
 * 
 * ⚠️ SALDIRI ÖNCESI NOT: Limitleri çok cömert ayarlamak = saldırganlar için aç kapı
 */
const ENDPOINT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/bot': { windowMs: 10 * 60 * 1000, maxRequests: 60, failClosed: true, message: 'Bot API istek limiti aşıldı. Lütfen bekleyin.' },
  '/api/content': { windowMs: 10 * 60 * 1000, maxRequests: 60, failClosed: true, message: 'İçerik API istek limiti aşıldı. Lütfen bekleyin.' },
  '/api/teklif': { windowMs: 10 * 60 * 1000, maxRequests: 5, failClosed: true, message: 'Çok fazla teklif sorgusu. Lütfen bekleyin.' },
  '/api/telegram': { windowMs: 10 * 60 * 1000, maxRequests: 15, failClosed: true, message: 'Telegram limit aşıldı.' },
  '/api/revalidate/locations': { windowMs: 10 * 60 * 1000, maxRequests: 30, failClosed: true, message: 'Revalidate limiti aşıldı. Lütfen bekleyin.' },
  '/admin': { windowMs: 10 * 60 * 1000, maxRequests: 100, message: 'Admin rate limit aşıldı.' },
};

const DEFAULT_ENDPOINT_LIMIT: RateLimitConfig = {
  windowMs: 10 * 60 * 1000, // 10 dakika
  maxRequests: 200,          // ← genel kural: her IP 10 dakikada 200 istek (SEO optimizasyonu)
  message: 'API rate limit asıldı. Lütfen bekleyin.',
};

/**
 * Pathname'e göre dogru rate limit konfigürasyonunu döndürür.
 * Eslesme yoksa default limit uygulanır.
 */
export function getEndpointRateLimit(pathname: string): RateLimitConfig {
  for (const [endpoint, config] of Object.entries(ENDPOINT_RATE_LIMITS)) {
    if (pathname === endpoint || pathname.startsWith(`${endpoint}/`)) return config;
  }
  return DEFAULT_ENDPOINT_LIMIT;
}

export function createRateLimitResponse(
  result: RateLimitResult,
  config: RateLimitConfig,
): NextResponse {
  const unavailable = result.unavailable === true;
  const retryAfter = Math.max(1, Math.ceil((result.retryAfter ?? config.windowMs) / 1000));
  return NextResponse.json(
    {
      error: unavailable ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMIT_EXCEEDED',
      message: unavailable ? 'İstek koruması şu anda kullanılamıyor.' : config.message ?? 'Rate limit aşıldı.',
    },
    {
      status: unavailable ? 503 : 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
      },
    },
  );
}
