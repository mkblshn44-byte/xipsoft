/**
 * Rate Limiting — Redis tabanlı
 *
 * Kullanım:
 *   - middleware zincirinde IP bazlı limit (bkz. `middleware-utils/rate-limiter.ts`)
 *   - API route'larında kendi identifier'ı ile limit (`/api/teklif`, `/api/telegram`)
 *   - sabit pencere sayacı (Upstash komuta bütçesi için bkz. FIXED_WINDOW_SCRIPT)
 *
 * Üretimde hassas endpoint'ler Redis kullanılamadığında fail-closed davranır.
 */

import { getRedisClient } from '@/lib/redis/client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Sabit pencere sayacı.
 *
 * Eskisi 4 komutluk bir ZSET sliding-window Lua'sıydı (ZREMRANGEBYSCORE + ZCARD +
 * ZADD + EXPIRE, üstüne anahtar başına istek başına bir üyen). Upstash aylık
 * komuta kotasının tek büyük kalemi oydu ve anahtar başına bellek de büyüyordu.
 * Sabit pencere tek INCR + (yalnızca pencerenin ilk vuruşunda) EXPIRE eder:
 * ortalama ~1 komut, sabit anahtar boyutu.
 *
 * Bedeli pencere sınırı burst'u (iki pencere birleşiminde 2x). Limitler IP
 * başına ve geniş tutulduğu için kabul edilebilir; atomellik bozulmasın diye
 * INCR ve EXPIRE aynı betiğin içinde — betik yarıda çökerse TTL'siz, yani
 * sonsuza kadar dolan bir sayaç kalmaz.
 */
const FIXED_WINDOW_SCRIPT = `
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
local count = redis.call('INCR', key)
if count == 1 then
  redis.call('EXPIRE', key, ttl)
end
return count
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

/** Sabit pencerede sıradaki sıfırlanma anı — pencere sınırları hizalı varsayılır. */
function fixedWindowEnd(now: number, windowMs: number): number {
  return now - (now % windowMs) + windowMs;
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
  const reset = fixedWindowEnd(now, config.windowMs);

  try {
    const response = await redis.eval(FIXED_WINDOW_SCRIPT, [key], [
      String(Math.ceil(config.windowMs / 1000)),
    ]);
    const count = Number(response);
    if (!Number.isFinite(count)) {
      throw new Error('Unexpected Redis rate-limit response');
    }

    return count <= config.maxRequests
      ? {
          success: true,
          remaining: Math.max(0, config.maxRequests - count),
          limit: config.maxRequests,
          reset,
        }
      : {
          success: false,
          remaining: 0,
          limit: config.maxRequests,
          reset,
          // Kalan pencere yerelden hesaplanır; TTL okumak ekstra komut harcardı.
          retryAfter: Math.max(0, reset - now),
        };
  } catch {
    // Hata logunu devre kesici taşır (olay başına bir satır). Buradaki
    // `console.error` kota dolmuşken istek başına tam stack basıyordu.
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
 * Endpoint bazlı rate limit konfigürasyonları — tek kaynak burası.
 *
 * KOVA KARARI: varsayılan limit IP BAŞINA tek kovada uygulanır, path başına değil.
 * Eskiden anahtar `ip:pathname` idi; yani tek bir IP her farklı URL için ayrı
 * 200'lük hak alıyordu — uzun kuyruklu tarama/flood karşısında limit fiilen
 * yoktu, kalan tek şey Upstash komuta ve bellek harcamasıydı.
 *
 * Hassas endpoint'ler kendi kovasında ve daha düşük limitle korunur.
 *
 * ⚠️ Limitleri çok cömert ayarlamak = saldırganlar için açık kapı.
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

/** `pathname`'e denk gelen özel limit girdisi; yoksa null (varsayılan devreye girer). */
function matchEndpointLimit(pathname: string): [string, RateLimitConfig] | null {
  for (const [endpoint, config] of Object.entries(ENDPOINT_RATE_LIMITS)) {
    if (pathname === endpoint || pathname.startsWith(`${endpoint}/`)) return [endpoint, config];
  }
  return null;
}

/**
 * Pathname'e göre dogru rate limit konfigürasyonunu döndürür.
 * Eslesme yoksa default limit uygulanır. API route'ları kendi identifier'ıyla
 * çağırdığı için bu arayüz olduğu gibi korundu (bkz. /api/teklif, /api/telegram).
 */
export function getEndpointRateLimit(pathname: string): RateLimitConfig {
  return matchEndpointLimit(pathname)?.[1] ?? DEFAULT_ENDPOINT_LIMIT;
}

export interface RateLimitBucket {
  config: RateLimitConfig;
  /** Redis anahtar öneki — endpoint-ezgili kovada yol dahil, varsayılanda değil. */
  keyPrefix: string;
  /**
   * true => bu yol için özel bir limit tanımlı. Böyle yollarda yerel ön-eşik
   * atlanır ve her istek paylaşımlı sayaçtan geçer (düşük hacim, yüksek önem).
   */
  endpointSpecific: boolean;
}

/** Middleware zincirinin kullanacağı kova kararı. */
export function getRateLimitBucket(pathname: string): RateLimitBucket {
  const match = matchEndpointLimit(pathname);
  if (!match) {
    return { config: DEFAULT_ENDPOINT_LIMIT, keyPrefix: 'middleware', endpointSpecific: false };
  }
  const [endpoint, config] = match;
  return {
    config,
    keyPrefix: `middleware:${endpoint.replace(/[^a-z0-9]+/gi, '')}`,
    endpointSpecific: true,
  };
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
