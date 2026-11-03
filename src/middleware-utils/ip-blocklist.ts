/**
 * IP Blocklist — Middleware Module
 *
 * IP adreslerini ip_blocklist tablosundan ve Redis cache'inden kontrol eder.
 * Fail-open: DB/Redis erisilemezse isteği gecirir.
 *
 * Loopback/localhost IP'ler (127.0.0.1, ::1, 0.0.0.0) ASLA engellenmez —
 * böylece geliştirici kendini kilitlemez.
 *
 * Arama motoru botları (Googlebot, Bingbot vb.) ASLA engellenmez —
 * SEO taraması için zorunludur.
 *
 * Googlebot/Bingbot IP doğrulaması (Reverse DNS):
 *   Saldırganlar UA sahte yapabilir. Yalnızca gerçek Google/Bing IP aralıklarından
 *   gelen istekler muaf tutulur; sahte UA'lar normal rate-limit zincirinden geçer.
 *   Doğrulama sonucu Redis'te 6 saat cache'lenir → her istekte DNS sorgusu yok.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis/client";
import pool from "@/lib/db/pool";

const CACHE_TTL_SECONDS = 5 * 60;
const CACHE_KEY_PREFIX = "ipblock";

const LOOPBACK_IPS = new Set(["127.0.0.1", "::1", "0.0.0.0", "::", "localhost"]);

/**
 * Majör arama motoru ve SEO botlarını tanımlayan User-Agent desenleri.
 * Bu botlar IP blocklist kontrolünden muaf tutulur — ANCAK IP doğrulaması
 * yapılmadan rate-limit muafiyeti verilmez (bkz. isVerifiedSearchBot).
 */
const SEARCH_BOT_PATTERN =
  /googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|sogou|exabot|facebot|ia_archiver|applebot|msnbot|teoma|ask jeeves|googlebot-image|googlebot-mobile|mediapartners-google|adsbot-google/i;

/**
 * Doğrulanmış Googlebot hostnameleri → IP'nin bu domaine ait olması gerekir.
 * Kaynak: https://developers.google.com/search/docs/crawling-indexing/verifying-googlebot
 */
const GOOGLE_HOSTNAME_SUFFIX = "googlebot.com";
const GOOGLE_ALT_SUFFIX = "google.com"; // özel tarayıcı botları bu domenden gelir
const BING_HOSTNAME_SUFFIX = "search.msn.com";

/** Redis'te bot doğrulama önbellek prefix'i (6 saatlik TTL). */
const BOT_VERIFY_PREFIX = "botverify";
const BOT_VERIFY_TTL = 60 * 60 * 6; // 6 saat
const BOT_L1_TTL_MS = 10 * 60 * 1000; // 10 dakika süreç içi L1 önbellek
const botVerifyL1 = new Map<string, { verified: boolean; expiresAt: number }>();

export function isSearchBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return SEARCH_BOT_PATTERN.test(userAgent);
}

/**
 * IP'nin gerçekten Google/Bing'e ait olup olmadığını Reverse DNS ile doğrular.
 *
 * Algoritma (Google'ın resmi rehberi):
 *  1. IP → hostname (PTR kaydı) — örn. "crawl-66-249-66-1.googlebot.com"
 *  2. hostname → A/AAAA kaydı — özgün IP'ye dönmeli
 *  3. Hostname soneki "googlebot.com" veya "google.com" / Bing için "search.msn.com" olmalı
 *
 * Çok katmanlı önbellek:
 *  - L1 (In-Memory Map, 10 dk): Bot peş peşe 50 sayfa gezerken Redis'e dahi çıkmaz (0 komut).
 *  - L2 (Redis, 6 saat): Instance'lar arası ortak havuz.
 *  - DNS hata verirse fail-open (true dönülür) — SEO kaybı riskini minimize et.
 */
async function verifySearchBotIp(ip: string, userAgent: string): Promise<boolean> {
  // Sadece Google ve Bing botlarını doğrula; diğerleri UA tespitine güven
  const isGoogle = /googlebot|mediapartners-google|adsbot-google/i.test(userAgent);
  const isBing = /bingbot|msnbot/i.test(userAgent);
  if (!isGoogle && !isBing) return true; // diğer botlar (Yandex vb.) için muafiyet koru

  // 1. Önce L1 süreç içi belleğe bak
  const now = Date.now();
  const l1 = botVerifyL1.get(ip);
  if (l1 && l1.expiresAt > now) {
    return l1.verified;
  }

  // 2. Redis'e bak (L2)
  const redis = getRedisClient();
  const cacheKey = `${BOT_VERIFY_PREFIX}:${ip}`;
  if (redis) {
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached !== null) {
        const verifiedFromRedis = cached === "1";
        if (botVerifyL1.size >= 1_000) botVerifyL1.delete(botVerifyL1.keys().next().value!);
        botVerifyL1.set(ip, { verified: verifiedFromRedis, expiresAt: now + BOT_L1_TTL_MS });
        return verifiedFromRedis;
      }
    } catch {
      // Redis'e ulaşılamazsa DNS'e git
    }
  }

  // Reverse DNS çözümlemesi — Node.js runtime (middleware nodejs runtime'da çalışır)
  let verified = false;
  try {
    // PTR sorgusu: dns.promises modülü Next.js middleware'de (nodejs runtime) mevcut
    const { promises: dnsPromises } = await import("dns");

    // 1. PTR kaydı → hostname(ler)
    let hostnames: string[] = [];
    try {
      hostnames = await Promise.race([
        dnsPromises.reverse(ip),
        new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error("DNS timeout")), 2000)),
      ]) as string[];
    } catch {
      // PTR kaydı yok veya timeout → fail-open
      verified = true;
    }

    if (hostnames.length > 0) {
      const expectedSuffix = isGoogle
        ? [GOOGLE_HOSTNAME_SUFFIX, GOOGLE_ALT_SUFFIX]
        : [BING_HOSTNAME_SUFFIX];

      for (const hostname of hostnames) {
        const h = hostname.toLowerCase().replace(/\.+$/, "");
        const suffixOk = expectedSuffix.some((s) => h === s || h.endsWith(`.${s}`));
        if (!suffixOk) continue;

        // 2. Forward DNS: hostname → A kaydı → özgün IP'ye dönmeli
        try {
          const addresses = await Promise.race([
            dnsPromises.resolve4(h).catch(() => dnsPromises.resolve6(h)),
            new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error("DNS timeout")), 2000)),
          ]) as string[];
          if (addresses.includes(ip)) {
            verified = true;
            break;
          }
        } catch {
          // Forward DNS başarısız → bu hostname'i atla, diğerini dene
        }
      }
    }
  } catch {
    // dns modülü yüklenemedi vb. → fail-open
    verified = true;
  }

  // Sonucu L1 belleğe yaz
  if (botVerifyL1.size >= 1_000) botVerifyL1.delete(botVerifyL1.keys().next().value!);
  botVerifyL1.set(ip, { verified, expiresAt: now + BOT_L1_TTL_MS });

  // Sonucu Redis'e yaz
  if (redis) {
    try {
      await redis.set(cacheKey, verified ? "1" : "0", { ex: BOT_VERIFY_TTL });
    } catch {
      // yazma hatası akışı bozmaz
    }
  }

  return verified;
}

/**
 * User-Agent arama motoru botu olduğunu söylüyor VE IP doğrulamasından geçiyor mu?
 * Rate-limit muafiyeti için bu fonksiyon kullanılır.
 */
export async function isVerifiedSearchBot(
  userAgent: string | null,
  ip: string,
): Promise<boolean> {
  if (!userAgent || !isSearchBot(userAgent)) return false;
  if (isLoopbackIp(ip)) return true; // dev ortamı
  return verifySearchBotIp(ip, userAgent);
}

export function isLoopbackIp(ip: string): boolean {
  const trimmed = ip.trim();
  if (LOOPBACK_IPS.has(trimmed)) return true;
  if (trimmed.startsWith("127.")) return true;
  if (trimmed.startsWith("::ffff:127.")) return true;
  return false;
}

function cacheKey(ip: string): string {
  return `${CACHE_KEY_PREFIX}:${ip}`;
}

// ── In-memory LRU cache (Redis'ten önce) ─────────────────────────────────────
// Middleware her istekte çalışır; Redis'e gitmemiş her yeni IP DB'ye düşerdi.
// IP kümesi sınırsız olduğundan sabit boyutlu LRU + TTL kullanılır.
const MEM_CACHE_MAX = 5_000;
const MEM_TTL_BLOCKED_MS = CACHE_TTL_SECONDS * 1000;   // 5 dk
const MEM_TTL_ALLOWED_MS = 60 * 1000;                  // 1 dk (negatif kısa)

const memCache = new Map<string, { blocked: boolean; expiresAt: number }>();

function memGet(ip: string): boolean | null {
  const entry = memCache.get(ip);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memCache.delete(ip);
    return null;
  }
  // LRU: en son kullanılanı sona taşı
  memCache.delete(ip);
  memCache.set(ip, entry);
  return entry.blocked;
}

function memSet(ip: string, blocked: boolean): void {
  if (memCache.size >= MEM_CACHE_MAX) {
    // En eski (en az kullanılan) girişi düşür
    const oldest = memCache.keys().next().value;
    if (oldest !== undefined) memCache.delete(oldest);
  }
  memCache.set(ip, {
    blocked,
    expiresAt: Date.now() + (blocked ? MEM_TTL_BLOCKED_MS : MEM_TTL_ALLOWED_MS),
  });
}

async function isIpCachedBlocked(ip: string): Promise<boolean | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const val = await redis.get<string>(cacheKey(ip));
    if (val === null) return null;
    return val === "1";
  } catch {
    return null;
  }
}

async function setIpCache(ip: string, blocked: boolean): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(cacheKey(ip), blocked ? "1" : "0", {
      ex: CACHE_TTL_SECONDS,
    });
  } catch {
    // ignore
  }
}

async function isIpBlockedInDb(ip: string): Promise<boolean> {
  try {
    const { rows } = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM ip_blocklist
         WHERE ip_address = $1
           AND (is_permanent = true OR expires_at > NOW())
       ) AS exists`,
      [ip]
    );
    return rows[0]?.exists ?? false;
  } catch {
    return false;
  }
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  if (isLoopbackIp(ip)) return false;

  // 1. Bellek LRU — Redis/DB'ye hiç gitmeden cevap ver
  const mem = memGet(ip);
  if (mem !== null) return mem;

  // 2. Redis
  const cached = await isIpCachedBlocked(ip);
  if (cached !== null) {
    memSet(ip, cached);
    return cached;
  }

  // 3. DB — yalnızca iki önbellek katmanında da yoksa
  const blocked = await isIpBlockedInDb(ip);
  memSet(ip, blocked);
  await setIpCache(ip, blocked);
  return blocked;
}

export async function blockIpIfNecessary(
  ip: string,
  userAgent?: string | null
): Promise<NextResponse | null> {
  if (isLoopbackIp(ip)) return null;

  // Arama motoru botları ASLA engellenmez
  if (isSearchBot(userAgent ?? null)) return null;

  const blocked = await isIpBlocked(ip);
  if (!blocked) return null;

  return NextResponse.json(
    {
      error: "Forbidden",
      message: "Erisiminiz engellenmistir.",
    },
    { status: 403 }
  );
}

export async function invalidateIpBlockCache(ip?: string): Promise<void> {
  // 1. Bellek LRU — admin işlemi sonrası eski "izinli" cevabı servis edilmesin
  if (ip) {
    memCache.delete(ip);
  } else {
    memCache.clear();
  }

  // 2. Redis — best-effort
  const redis = getRedisClient();
  if (!redis) return;
  try {
    if (ip) {
      await redis.del(cacheKey(ip));
    } else {
      const keys = await redis.keys(`${CACHE_KEY_PREFIX}:*`);
      if (keys.length > 0) await redis.del(...keys);
    }
  } catch {
    // ignore
  }
}
