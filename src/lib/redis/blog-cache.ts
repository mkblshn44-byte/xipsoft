/**
 * Blog cache — `Blog:list:*` / `Blog:post:*` anahtarlarının Redis sarmalayıcısı.
 *
 * Jenerik cache primitiflerini (`cacheGet/Set/Del/Keys`) kullanır. TTL ve key
 * şeması yalnızca burada tanımlıdır.
 */

import { cacheGet, cacheSet, cacheDel, cacheKeys } from './client';

const BLOG_TTL = {
  LIST: 60 * 5, // 5 dakika — blog listesi
  POST: 60 * 10, // 10 dakika — tekil post
} as const;

/** Hafif blog liste ögesi — yalnızca listeleme için gerekli alanlar. */
export interface BlogListItem {
  id: string;
  title: string;
  description: string;
  slug: string;
  authorName: string | null;
  authorAvatar: string | null;
  tags: string[];
  coverImageURL: string | null;
  coverImageAlt?: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface BlogListCacheData {
  items: BlogListItem[];
  hasMore: boolean;
  nextOffset: number;
}

/** Blog listesini Redis'e yaz. */
export async function setBlogListCache(
  key: string,
  data: BlogListCacheData,
  ttl = BLOG_TTL.LIST,
): Promise<void> {
  await cacheSet(`Blog:list:${key}`, data, ttl);
}

/** Blog listesini Redis'ten oku. */
export async function getBlogListCache(key: string): Promise<BlogListCacheData | null> {
  return cacheGet<BlogListCacheData>(`Blog:list:${key}`);
}

/** Tekil blog postunu Redis'e yaz. */
export async function setBlogPostCache(
  slug: string,
  data: unknown,
  ttl = BLOG_TTL.POST,
): Promise<void> {
  await cacheSet(`Blog:post:${slug}`, data, ttl);
}

/** Tekil blog postunu Redis'ten oku. */
export async function getBlogPostCache<T>(slug: string): Promise<T | null> {
  return cacheGet<T>(`Blog:post:${slug}`);
}

/**
 * Blog cache'ini temizle (publish/update sonrası çağrılır).
 * Tüm liste + post anahtarları silinir; `slug` verilirse ilgili detay
 * anahtarları da (post/page/adjacent) hedeflenir.
 */
export async function invalidateBlogCache(slug?: string): Promise<void> {
  const keys = [
    ...(await cacheKeys('Blog:list:*')),
    ...(await cacheKeys('Blog:post:*')),
  ];
  if (slug) {
    keys.push(`Blog:post:${slug}`, `Blog:post:page:${slug}`, `Blog:post:adjacent:${slug}`);
  }
  await cacheDel(keys);
}
