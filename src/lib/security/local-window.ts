/**
 * Süreç içi kapı primitifleri.
 *
 * Amaç tek: Upstash komut sayısını "istek başına 1"den "gerekli istek başına 1"e
 * indirmek. Sıradan ziyaretçi bir oturumda 10-15 istek yapar; bu sayacılar onun
 * Redis'e hiç ulaşmasını engeller. Eşiği aşan IP — yani flood'un kendisi — yine
 * Redis'e gider, çünkü paylaşımlı doğru orada durur.
 *
 * Sınırlama: Vercel'de her warm lambda kendi haritasını taşır. Yani buradan çıkan
 * "serbest" kararı tahminîdir (instance başına eşik), kesin karar Redis sayacıdır.
 * Bu yüzden eşikler cömert değil, limitin küçük bir yüzdesi olarak tutulur.
 *
 * Harita boyutu sabit (LRU): flood altında gelen IP sayısı sınırsız olduğu için
 * sınırsız bellek biriktirilemez. Desen `ip-blocklist.ts` ile aynı.
 */

const MAX_KEYS = 20_000;

interface WindowBucket {
  count: number;
  /** Pencere bitişi (epoch ms). */
  resetAt: number;
}

const windows = new Map<string, WindowBucket>();
/** key -> bir sonraki yoklama zamanı (epoch ms). */
const gates = new Map<string, number>();
/** key -> engelin geçerli olduğu son an (epoch ms). */
const blocks = new Map<string, number>();

/** LRU bakımını tek yerde yap: en son kullanılanı sona taşı, taşınca en eskisini düşür. */
function touchLRU<V>(map: Map<string, V>, key: string, value: V): void {
  map.delete(key);
  map.set(key, value);
  if (map.size <= MAX_KEYS) return;
  const oldest = map.keys().next().value;
  if (oldest !== undefined) map.delete(oldest);
}

/** `windowMs`'lik sabit pencere için yerel sayaç. Redis'e dokunmaz. */
export function bumpLocalWindow(key: string, windowMs: number): WindowBucket {
  const now = Date.now();
  const resetAt = now - (now % windowMs) + windowMs;
  const existing = windows.get(key);
  const count = existing && existing.resetAt > now ? existing.count + 1 : 1;
  touchLRU(windows, key, { count, resetAt });
  return { count, resetAt };
}

/**
 * Aynı `key` için `intervalMs`'de en fazla bir kez `true` döner.
 * "Bu IP için uzaktaki duruma bakmayalı şu kadar oldu mu?" sorusunun kapısı.
 */
export function shouldProbe(key: string, intervalMs: number): boolean {
  const now = Date.now();
  const next = gates.get(key);
  if (next !== undefined && next > now) return false;
  touchLRU(gates, key, now + intervalMs);
  return true;
}

/** Öğrenilen engeli süreç içine de yaz — okuma kapısı engeli UNUTMAMALI. */
export function noteLocalBlock(key: string, ttlMs: number): void {
  touchLRU(blocks, key, Date.now() + ttlMs);
}

export function isLocallyBlocked(key: string): boolean {
  const until = blocks.get(key);
  if (until === undefined) return false;
  if (until <= Date.now()) {
    blocks.delete(key);
    return false;
  }
  return true;
}
