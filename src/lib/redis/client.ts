/**
 * Redis client + generic cache yardımcıları.
 *
 * Upstash (primary) ile çalışır. `UPSTASH_REDIS_REST_URL` +
 * `UPSTASH_REDIS_REST_TOKEN` env yoksa no-op davranır (client `null`). Aynı
 * `null`, devre kesici açıldığında da döner — bkz. `./breaker`.
 *
 * Bu katman yalnızca **bağlantı + jenerik JSON cache** işini yapar; domain'e
 * özel cache sarmalayıcıları (blog, …) ayrı dosyalardadır.
 */

import { Redis } from '@upstash/redis';
import { isRedisAvailable, recordRedisFailure, recordRedisSuccess } from './breaker';

let _client: Redis | null = null;

/**
 * Komutları izleyen ince proxy: her başarısızlığı devre kesiciye bildirir, hata
 * yine olduğğu gibi yukarı fırlar — çağıran tarafın `try/catch`i değişmez.
 *
 * Bu tek nokta, `eval`/`get`/`set`/`del`/`keys` kullanan altı çağrı yerine
 * geçmek zorunda kalan ayrı hata yollarını gereksiz kılıyor. (Pipeline kullanım
 * yok; olsa `exec` yakalanmazdı.)
 */
function instrument(client: Redis): Redis {
  return new Proxy(client, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) =>
        Promise.resolve(value.apply(target, args)).then(
          (result) => {
            recordRedisSuccess();
            return result;
          },
          (error) => {
            recordRedisFailure(error);
            throw error;
          },
        );
    },
  });
}

/**
 * Client'ı tembel oluşturur. İki durumda `null` (no-op) döner:
 *   - env yoksa,
 *   - devre kesici açıksa (kota dolu / Redis'e ulaşılamıyor) → HTTP'e hiç çıkma.
 */
function getClient(): Redis | null {
  if (!isRedisAvailable()) return null;
  if (_client) return _client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    _client = instrument(new Redis({ url, token }));
    return _client;
  } catch {
    return null;
  }
}

/** Ham Redis client'ı döner (blocklist/rate-limit gibi özel kullanımlar için). */
export function getRedisClient() {
  return getClient();
}

// ─── Generic JSON cache (D3) + In-Memory L1 Cache ──────────────────────────────
interface L1CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const L1_MAX_KEYS = 2_000;
const l1Cache = new Map<string, L1CacheEntry<unknown>>();

/** L1 bellekten oku — 5-10 saniyelik mikro önbellek (Upstash istek kotasını korur). */
function getFromL1<T>(key: string): T | null {
  const entry = l1Cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    l1Cache.delete(key);
    return null;
  }
  return entry.value as T;
}

/** L1 belleğe yaz (en fazla 10 sn). */
function setToL1<T>(key: string, value: T, ttlSeconds: number): void {
  const l1TtlMs = Math.min(10_000, Math.max(1_000, ttlSeconds * 1000));
  if (l1Cache.size >= L1_MAX_KEYS) {
    const oldest = l1Cache.keys().next().value;
    if (oldest !== undefined) l1Cache.delete(oldest);
  }
  l1Cache.set(key, { value, expiresAt: Date.now() + l1TtlMs });
}

/** L1 bellekten anahtarları düşür. */
function removeFromL1(keys: string[]): void {
  for (const k of keys) {
    l1Cache.delete(k);
  }
}

/** JSON değeri okur; önce L1 (bellek), sonra L2 (Redis). Yok/hatalıysa `null` (fail-soft). */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const l1 = getFromL1<T>(key);
  if (l1 !== null) return l1;

  const client = getClient();
  if (!client) return null;
  try {
    const raw = await client.get<string>(key);
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T);
    setToL1(key, parsed, 10);
    return parsed;
  } catch {
    return null;
  }
}

/** JSON değeri TTL ile yazar; L1 + Redis (L2). */
export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  setToL1(key, value, ttl);
  const client = getClient();
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), { ex: ttl });
  } catch {
    /* Redis hata olsa da uygulama akışı bozulmaz */
  }
}

/** Verilen key'leri siler (boş liste no-op); L1 + Redis. */
export async function cacheDel(keys: string[]): Promise<void> {
  removeFromL1(keys);
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
