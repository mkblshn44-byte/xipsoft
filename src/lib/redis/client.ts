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
