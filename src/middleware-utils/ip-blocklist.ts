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
 */

import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import pool from "@/lib/database";

const CACHE_TTL_SECONDS = 5 * 60;
const CACHE_KEY_PREFIX = "ipblock";

const LOOPBACK_IPS = new Set(["127.0.0.1", "::1", "0.0.0.0", "::", "localhost"]);

/**
 * Majör arama motoru ve SEO botlarını tanımlayan User-Agent desenleri.
 * Bu botlar IP blocklist ve rate limit kontrolünden muaf tutulur.
 */
const SEARCH_BOT_PATTERN =
  /googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|sogou|exabot|facebot|ia_archiver|applebot|msnbot|teoma|ask jeeves|googlebot-image|googlebot-mobile|mediapartners-google|adsbot-google/i;

export function isSearchBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return SEARCH_BOT_PATTERN.test(userAgent);
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

  const cached = await isIpCachedBlocked(ip);
  if (cached !== null) return cached;

  const blocked = await isIpBlockedInDb(ip);
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
