/**
 * Country Blocklist — Middleware Module
 *
 * Ülke kodu sınırlı bir küme (~250) olduğundan tablonun TAMAMI tek sorguyla
 * belleğe alınır (snapshot). Middleware her istekte çalıştığı için per-istek
 * DB sorgusu bağlantı havuzunu tüketir; snapshot sayesinde DB'ye yalnızca
 * TTL dolunca 1 kez gidilir.
 *
 * Bellek yoksa/DB erişilemezse Redis katmanı, o da yoksa fail-open: isteği
 * geçirir.
 */

import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis/client";
import pool from "@/lib/db/pool";

const SNAPSHOT_TTL_MS = 5 * 60 * 1000; // 5 dakika
const CACHE_PREFIX = "ctryblock";

let blockedSet: Set<string> | null = null;
let snapshotExpiresAt = 0;
let snapshotRequest: Promise<Set<string>> | null = null;

async function loadBlockedCountries(): Promise<Set<string>> {
  const { rows } = await pool.query<{ country_code: string }>(
    `SELECT country_code FROM country_blocklist`
  );
  return new Set(rows.map((r) => String(r.country_code).toUpperCase()));
}

/** Snapshot bayatsa tazele; eş zamanlı istekler tek sorguyu paylaşır. */
async function getBlockedSet(): Promise<Set<string> | null> {
  if (blockedSet && Date.now() < snapshotExpiresAt) return blockedSet;

  if (!snapshotRequest) {
    snapshotRequest = loadBlockedCountries()
      .then((set) => {
        blockedSet = set;
        snapshotExpiresAt = Date.now() + SNAPSHOT_TTL_MS;
        return set;
      })
      .catch(() => {
        // Fail-open: eski snapshot varsa onunla devam et.
        return blockedSet ?? new Set<string>();
      })
      .finally(() => {
        snapshotRequest = null;
      });
  }
  return snapshotRequest;
}

/**
 * Redis'i yalnızca DB snapshot'ı boş/unavailableken ikinci katman olarak
 * kullanır (çok instance'lı ortamlarda cross-instance tazelik için).
 */
async function isCachedBlocked(code: string): Promise<boolean | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const v = await redis.get<string>(`${CACHE_PREFIX}:${code}`);
    if (v === null) return null;
    return v === "1";
  } catch { return null; }
}

export async function blockCountryIfNecessary(
  country: string | null
): Promise<NextResponse | null> {
  if (!country || country.length !== 2 || country === "XX") return null;

  const code = country.toUpperCase();

  // 1. Bellek snapshot (ana kaynak — DB'ye istek başına gidilmez)
  const set = await getBlockedSet();
  let blocked = set ? set.has(code) : false;

  // 2. Snapshot DB'den yüklenemediyse Redis'e düş
  if (!set) {
    blocked = (await isCachedBlocked(code)) ?? false;
  }

  if (!blocked) return null;

  return NextResponse.json(
    { error: "Forbidden", message: "Bu bölgeden erişim engellenmiştir." },
    { status: 403 }
  );
}

/** Admin API cache invalide et (ülke ekle/kaldır sonrası) */
export async function invalidateCountryBlockCache(code?: string): Promise<void> {
  // Bellek snapshot'ını bayat işaretle → sonraki istek DB'den taze yükler.
  snapshotExpiresAt = 0;
  if (code) {
    blockedSet?.delete(code.toUpperCase());
  } else {
    blockedSet = null;
  }

  // Best-effort Redis cache invalidation (eski instance'lar için)
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
