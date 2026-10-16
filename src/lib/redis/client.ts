/**
 * Redis client + generic cache yardımcıları.
 *
 * Upstash (primary) ile çalışır. `UPSTASH_REDIS_REST_URL` +
 * `UPSTASH_REDIS_REST_TOKEN` env yoksa no-op davranır (client `null`).
 *
 * Bu katman yalnızca **bağlantı + jenerik JSON cache** işini yapar; domain'e
 * özel cache sarmalayıcıları (blog, …) ayrı dosyalardadır.
 */

import { Redis } from '@upstash/redis';

let _client: Redis | null = null;

/** Client'ı tembel oluşturur; env yoksa `null` döner (no-op). */
function getClient(): Redis | null {
  if (_client) return _client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    _client = new Redis({ url, token });
    return _client;
  } catch {
    return null;
  }
}

/** Ham Redis client'ı döner (blocklist/rate-limit gibi özel kullanımlar için). */
export function getRedisClient() {
  return getClient();
}

// ─── Generic JSON cache (D3) ──────────────────────────────────────────────────

/** JSON değeri okur; Redis yok/hatalıysa `null` (fail-soft). */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const raw = await client.get<string>(key);
    if (!raw) return null;
    return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T);
  } catch {
    return null;
  }
}

/** JSON değeri TTL ile yazar; Redis yok/hatalıysa sessizce geçer. */
export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), { ex: ttl });
  } catch {
    /* Redis hata olsa da uygulama akışı bozulmaz */
  }
}

/** Verilen key'leri siler (boş liste no-op). */
export async function cacheDel(keys: string[]): Promise<void> {
  const client = getClient();
  if (!client || keys.length === 0) return;
  try {
    await client.del(...keys);
  } catch {
    /* ignore */
  }
}

/** Verilen desene uyan key'leri döndürür; Redis yok/hatalıysa `[]`. */
export async function cacheKeys(pattern: string): Promise<string[]> {
  const client = getClient();
  if (!client) return [];
  try {
    return await client.keys(pattern);
  } catch {
    return [];
  }
}
