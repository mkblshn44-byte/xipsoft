/**
 * redis.ts — GERİYE DÖNÜK UYUMLULUK (barrel)
 *
 * Redis katmanı `src/lib/redis/*` altına sorumluluk bazında bölünmüştür.
 * Dışarıya aynı genel yüzey (`@/lib/redis`) sunulur; mevcut import'lar
 * değişmeden çalışır.
 *
 *   redis/client.ts     → getClient/getRedisClient + cacheGet/Set/Del/Keys
 *   redis/blog-cache.ts → blog liste/post cache + invalidateBlogCache
 */

export * from './redis/client';
export * from './redis/blog-cache';
