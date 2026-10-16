/**
 * Country Blocklist — Middleware Module
 *
 * Ülke kodunu country_blocklist tablosundan kontrol eder.
 * Redis cache ile hızlandırılır (5 dakika TTL).
 * Fail-open: DB/Redis erişilemezse isteği geçirir.
 */

import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import pool from "@/lib/database";

const CACHE_TTL      = 5 * 60;           // 5 dakika
const CACHE_PREFIX   = "ctryblock";

async function isCachedBlocked(code: string): Promise<boolean | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const v = await redis.get<string>(`${CACHE_PREFIX}:${code}`);
    if (v === null) return null;
    return v === "1";
  } catch { return null; }
}

async function setCached(code: string, blocked: boolean): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(`${CACHE_PREFIX}:${code}`, blocked ? "1" : "0", { ex: CACHE_TTL });
  } catch {}
}

async function isCountryBlockedInDb(code: string): Promise<boolean> {
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM country_blocklist WHERE country_code = $1 LIMIT 1`,
      [code]
    );
    return rows.length > 0;
  } catch { return false; }
}

export async function blockCountryIfNecessary(
  country: string | null
): Promise<NextResponse | null> {
  if (!country || country.length !== 2 || country === "XX") return null;

  const code = country.toUpperCase();

  const cached = await isCachedBlocked(code);
  let blocked: boolean;

  if (cached !== null) {
    blocked = cached;
  } else {
    blocked = await isCountryBlockedInDb(code);
    await setCached(code, blocked);
  }

  if (!blocked) return null;

  return NextResponse.json(
    { error: "Forbidden", message: "Bu bölgeden erişim engellenmiştir." },
    { status: 403 }
  );
}

/** Admin API cache invalide et (ülke ekle/kaldır sonrası) */
export async function invalidateCountryBlockCache(code?: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    if (code) {
      await redis.del(`${CACHE_PREFIX}:${code.toUpperCase()}`);
    } else {
      const keys = await redis.keys(`${CACHE_PREFIX}:*`);
      if (keys.length > 0) await redis.del(...keys);
    }
  } catch {}
}
