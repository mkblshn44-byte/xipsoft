/**
 * Sayfa önbelleği — Redis read-through katmanı.
 *
 * Veritabanı sorgusu atılmadan ÖNCE Redis okunur; değer yoksa yükleyici (DB)
 * çalışır ve sonucu Redis'e yazar. Redis yapılandırılmamış ya da erişilemez
 * ise tüm yardımcılar sessizce doğrudan yükleyiciye düşer (graceful
 * degradation) — uygulama Redis olmadan da çalışmaya devam eder.
 *
 * Anahtar şeması:  page:slug:{sha1}     → sayfa satırı (pages tablosu)
 *                  page:tree:{sha1}     → içerik ağacı yol çözümlemesi
 *                  page:svc:{sha1}      → hizmet (services) satırı
 *                  page:cat:{sha1}      → kategori bazlı liste önbelleği
 *                  page:sitemap:{sha1}  → sitemap üretimi
 * `{sha1}` normalize edilmiş slug'ın marka damgasıyla birlikte SHA-1 özetidir;
 * böylece uzun/Türkçe karakterli slug'lar sabit uzunlukta güvenli anahtar olur.
 *
 * Stampede (thundering herd) koruması iki mekanizmanın birleşimidir:
 *  1. Mutex lock — anahtar düşmüşse DB'ye giden TEK istek kilidi alır,
 *     diğerleri kısa bir süre sonucu bekler, kilidi alamazsa DB'ye düşer.
 *  2. Probabilistic early expiration — TTL'in son `%10`'luk penceresinde
 *     değer hâlâ geçerlidir ama tazeleme riski olasılıkla dağıtılır; böylece
 *     binlerce anahtar aynı anda düşmez.
 */

import { createHash, randomUUID } from "node:crypto";

import { PALETTE } from "@/config/palette";
import { getRedisClient } from "./client";

/** Varsayılan sayfa önbellek süresi: 24 saat. */
export const PAGE_CACHE_TTL = 60 * 60 * 24;
/** Bulunamayan slug'lar için kısa "negatif" önbellek (DB'yi dövmez). */
export const NEGATIVE_CACHE_TTL = 60 * 2;
/** Tazeleme kilidi süresi — sahipli bir istek çökerse kilit kendiliğinden düşer. */
const LOCK_TTL_S = 15;
/** Kilidi alamayan isteğin sonucu beklerken yoklayacağı aralıklar. */
const LOCK_WAIT_STEPS = 6;
const LOCK_WAIT_MS = 50;

export type PageCacheKind = "slug" | "tree" | "svc" | "cat" | "sitemap";

/**
 * Önbellek anahtarına giren marka damgası.
 *
 * Cache'lenen yükler DB renkleri marka paletine indirgenmiş halde içeriyor
 * (bkz. `normalizeBrandColor`). Palet değiştiğinde bayat renklerin ekrana
 * çıkmasını önlemek için anahtar, ana vurgu rengiyle birlikte hash'lenir:
 * tema değişince tüm anahtarlar kendiliğinden döner, TTL beklenmez.
 */
const BRAND_NONCE = PALETTE.neon[500].replace("#", "");

/** Normalize + hash: anahtarda ham slug kullanılmaz (uzunluk/karakter riski). */
export function pageCacheKey(kind: PageCacheKind, id: string): string {
  const normalized = id.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  const hash = createHash("sha1")
    .update(`${kind}:${BRAND_NONCE}:${normalized}`)
    .digest("hex");
  return `page:${kind}:${hash}`;
}

/** Saklanan zarf: `soft` anından itibaren olasılıksal tazeleme devreye girer. */
interface Envelope<T> {
  v: T;
  /** Epoch ms — bu andan sonra değer "bayatlamaya" başlar. */
  soft: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Erken tazeleme penceresi: TTL'in %10'u (en az 60 sn, en çok 1 saat). */
function refreshWindowMs(ttlSeconds: number): number {
  return Math.min(60 * 60 * 1000, Math.max(60 * 1000, (ttlSeconds * 1000) / 10));
}

/**
 * Read-through sarmalayıcı.
 *
 * @param key    `pageCacheKey()` ile üretilmiş anahtar
 * @param load   Redis ıskalandığında çalışacak yükleyici (DB sorgusu)
 * @param ttl    saniye cinsinden önbellek süresi (varsayılan 24 saat)
 * @param empty  `null`/`undefined` sonucun da önbelleklenip önbelleklenmeyeceği
 */
export async function withPageCache<T>(
  key: string,
  load: () => Promise<T>,
  options: { ttl?: number; cacheEmpty?: boolean } = {},
): Promise<T> {
  const client = getRedisClient();
  if (!client) return load();

  const ttl = options.ttl ?? PAGE_CACHE_TTL;
  const now = Date.now();

  let envelope: Envelope<T> | null = null;
  try {
    const raw = await client.get<string>(key);
    if (raw) {
      const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === "object" && "v" in parsed) envelope = parsed as Envelope<T>;
    }
  } catch {
    return load(); // Redis'e ulaşılamıyor — doğrudan DB
  }

  if (envelope) {
    if (now < envelope.soft) return envelope.v;
    // Erken tazeleme penceresi: her istek değil, olasılıkla bir istek tazeler.
    const elapsed = now - envelope.soft;
    const window = refreshWindowMs(ttl);
    if (Math.random() > Math.min(1, elapsed / window)) return envelope.v;
  }

  // Isabet yok (veya tazeleme sırası bu isteğe düştü) → tek yükleyici kilidi alır.
  const lockKey = `lock:${key}`;
  const token = randomUUID();
  let locked = false;
  try {
    locked = (await client.set(lockKey, token, { ex: LOCK_TTL_S, nx: true })) === "OK";
  } catch {
    return load();
  }

  if (!locked) {
    // Başka bir istek yüklüyor: kısa süre bekle, hâlâ yoksa DB'ye düş.
    for (let i = 0; i < LOCK_WAIT_STEPS; i += 1) {
      await sleep(LOCK_WAIT_MS);
      try {
        const raw = await client.get<string>(key);
        if (raw) {
          const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (parsed && typeof parsed === "object" && "v" in parsed) {
            return (parsed as Envelope<T>).v;
          }
        }
      } catch {
        break;
      }
    }
    return load();
  }

  try {
    const value = await load();
    const isEmpty = value === null || value === undefined;
    if (!isEmpty || options.cacheEmpty !== false) {
      const writeTtl = isEmpty ? NEGATIVE_CACHE_TTL : ttl;
      const body: Envelope<T | null> = {
        v: value,
        soft: Date.now() + Math.max(1000, writeTtl * 1000 - refreshWindowMs(writeTtl)),
      };
      try {
        await client.set(key, JSON.stringify(body), { ex: writeTtl });
      } catch {
        /* yazma hatası akışı bozmaz */
      }
    }
    return value;
  } finally {
    try {
      await client.del(lockKey);
    } catch {
      /* kilit TTL ile düşer */
    }
  }
}

/** Slug'a bağlı tüm önbellek anahtarları (sayfa/ağaç/hizmet + sayfa meta'sı). */
export function pageKeysForSlug(slug: string): string[] {
  return [
    pageCacheKey("slug", slug),
    pageCacheKey("tree", slug),
    pageCacheKey("svc", slug),
    pageCacheKey("cat", `meta:${slug}`),
  ];
}

/** Bir kategorinin tüm önbellek anahtarları (SSS + meta + düz kategori). */
export function pageKeysForCategory(category: string): string[] {
  return [
    pageCacheKey("cat", category),
    pageCacheKey("cat", `faq:${category}`),
    pageCacheKey("cat", `meta:${category}`),
  ];
}

/**
 * Otomatik invalidation: admin içerik/SEO güncellediğinde çağrılır.
 *
 * İlgili slug anahtarları + (verildiyse) bağlı kategoriler + sitemap önbelleği
 * birlikte silinir; böylece panelde yapılan değişiklik TTL beklemeden yansır.
 */
export async function invalidatePageCaches(input: {
  slugs?: Array<string | null | undefined>;
  categories?: Array<string | null | undefined>;
  sitemap?: boolean;
}): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const keys: string[] = [];
  for (const slug of input.slugs ?? []) if (slug) keys.push(...pageKeysForSlug(slug));
  for (const category of input.categories ?? [])
    if (category) keys.push(...pageKeysForCategory(category));

  if (input.sitemap) {
    try {
      keys.push(...(await client.keys("page:sitemap:*")));
    } catch {
      /* desen okunamazsa yalnızca içerik anahtarları silinir */
    }
  }
  if (keys.length === 0) return;

  try {
    await client.del(...keys);
  } catch {
    /* Redis erişilemez: anahtarlar TTL sonunda zaten düşer */
  }
}

/** Sitemap önbelleğini tek başına temizler. */
export async function invalidateSitemapCache(): Promise<void> {
  await invalidatePageCaches({ sitemap: true });
}

/**
 * Tüm hizmet sayfaları + sitemap önbelleğini temizler.
 * Hizmetlerin tamamını etkileyen içeriklerde (ör. genel SSS) kullanılır —
 * Next tarafındaki `revalidateTag("services")` karşılığıdır.
 */
export async function invalidateServiceCaches(): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    const keys = await client.keys("page:svc:*");
    keys.push(...(await client.keys("page:sitemap:*")));
    if (keys.length > 0) await client.del(...keys);
  } catch {
    /* ignore — TTL sonunda düşer */
  }
}

/** Tüm sayfa önbelleğini temizler (toplu içerik işlemleri / deploy sonrası). */
export async function invalidateAllPageCaches(): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    const keys = await client.keys("page:*");
    if (keys.length > 0) await client.del(...keys);
  } catch {
    /* ignore */
  }
}
