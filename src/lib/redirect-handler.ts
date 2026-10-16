import pool from "@/lib/database";
import { NextRequest, NextResponse } from "next/server";
import type { Pool } from "pg";
import { getRedisClient } from "@/lib/redis";

export type RedirectEntry = { target_path: string; status_code: number } | null;

const REDIRECT_CACHE_TTL_MS = 15_000;
const redirectCache = new Map<string, { entry: RedirectEntry; expiresAt: number }>();

/**
 * Hem in-memory hem de Redis redirect önbelleğini temizler.
 * sourcePath verilirse yalnızca o yolu; verilmezse tümünü temizler.
 */
export function invalidateRedirectCache(sourcePath?: string): void {
  if (sourcePath) {
    redirectCache.delete(sourcePath);
    const normalized = sourcePath.length > 1 && sourcePath.endsWith("/")
      ? sourcePath.slice(0, -1)
      : sourcePath;
    redirectCache.delete(normalized);
  } else {
    redirectCache.clear();
  }

  // Best-effort Redis cache invalidation
  try {
    const redis = getRedisClient();
    if (redis) {
      if (sourcePath) {
        redis.del(`redirect:${sourcePath}`).catch(() => {});
      } else {
        redis.keys("redirect:*").then((keys) => {
          if (keys && keys.length > 0) {
            redis.del(...keys.slice(0, 200)).catch(() => {});
          }
        }).catch(() => {});
      }
    }
  } catch {
    // Redis optional / no-op
  }
}

/**
 * Yönlendirme hedefini getirir: Memory -> Redis -> DB hiyerarşisi.
 */
export async function getRedirectTarget(
  pathname: string,
  database: Pick<Pool, "query"> = pool,
): Promise<RedirectEntry> {
  const normalized = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;

  // 1. In-memory cache
  const cached = redirectCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.entry;

  // 2. Redis cache (Upstash)
  const redis = getRedisClient();
  if (redis) {
    try {
      const redisVal = await redis.get<string | { target_path: string; status_code: number }>(`redirect:${normalized}`);
      if (redisVal) {
        const parsed: NonNullable<RedirectEntry> =
          typeof redisVal === "string" ? JSON.parse(redisVal) : redisVal;
        redirectCache.set(normalized, { entry: parsed, expiresAt: Date.now() + REDIRECT_CACHE_TTL_MS });
        return parsed;
      }
    } catch {
      // Redis fallback
    }
  }

  // 3. NeonDB sorgusu
  try {
    const { rows } = await database.query<NonNullable<RedirectEntry>>(
      `SELECT target_path, status_code FROM seo_redirects
       WHERE source_path = $1 AND is_active = TRUE
       LIMIT 1`,
      [normalized],
    );
    const entry = rows[0] ?? null;
    redirectCache.set(normalized, { entry, expiresAt: Date.now() + REDIRECT_CACHE_TTL_MS });

    if (redis && entry) {
      redis.set(`redirect:${normalized}`, JSON.stringify(entry), { ex: 3600 }).catch(() => {});
    }

    return entry;
  } catch (error) {
    console.error("[RedirectHandler] DB query error:", error);
    return null;
  }
}

/**
 * `seo_redirects` tablosuna yönlendirme ekler/günceller (UPSERT) ve ilgili
 * önbelleği temizler. Kaynak/hedef normalizasyonu çağıran tarafça
 * `redirect-utils` ile yapılır. Admin paneli (`createRedirect`) ve dış içerik
 * API'si (`handleRedirectIngest`) bu tek fonksiyonu ortak kullanır (DRY).
 */
export async function upsertRedirect(
  db: { query: (text: string, values?: any[]) => Promise<{ rows: any[] }> },
  input: {
    sourcePath: string;
    targetPath: string;
    statusCode?: number;
    isActive?: boolean;
    createdBy?: string | null;
  },
): Promise<{
  id: string;
  source_path: string;
  target_path: string;
  status_code: number;
  is_active: boolean;
  is_insert: boolean;
} | undefined> {
  const {
    sourcePath,
    targetPath,
    statusCode = 301,
    isActive = true,
    createdBy = null,
  } = input;

  const { rows } = await db.query(
    `INSERT INTO seo_redirects (source_path, target_path, status_code, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (source_path) DO UPDATE
     SET target_path = EXCLUDED.target_path,
         status_code = EXCLUDED.status_code,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
     RETURNING id::text, source_path, target_path, status_code, is_active, (xmax = 0) AS is_insert`,
    [sourcePath, targetPath, statusCode, isActive, createdBy],
  );

  invalidateRedirectCache(sourcePath);
  return rows[0];
}

/**
 * Bir içeriğin slug'ı değiştiğinde 301 kalıcı yönlendirmesini tek ve merkezi
 * olarak kaydeder.
 * 
 * Sorumluluklar:
 * 1. Eğer oldPath === newPath ise işlem yapmaz.
 * 2. Yönlendirme zincirlerini düzleştirir: Daha önce oldPath'e yönlenen kuralları newPath'e çeker.
 * 3. Yeni sayfanın gölgelenmesini ve çift yönlü döngüleri (loop) önlemek için
 *    source_path = newPath olan eski yönlendirmeyi siler.
 * 4. seo_redirects tablosuna 301 UPSERT eder.
 * 5. İlgili önbellekleri geçersiz kılar.
 */
export async function recordSlugRedirect(
  client: { query: (text: string, values?: any[]) => Promise<any> },
  oldPath: string,
  newPath: string,
): Promise<void> {
  const normOld = oldPath.trim();
  const normNew = newPath.trim();
  if (!normOld || !normNew || normOld === normNew) return;

  // 1. Zincirleri düzleştir: daha önce oldPath'e yönelenleri doğrudan newPath'e çevir
  await client.query(
    `UPDATE seo_redirects
     SET target_path = $2, updated_at = NOW()
     WHERE target_path = $1 AND source_path <> $2`,
    [normOld, normNew],
  );

  // 2. Yeni slug artık canlı bir rota. Kaynağı bu olan eski bir yönlendirme
  // varsa kaldır; aksi halde sayfa gölgelenir ve çift yönlü döngü (A->B->A) oluşur.
  await client.query(
    `DELETE FROM seo_redirects WHERE source_path = $1`,
    [normNew],
  );

  // 3. 301 yönlendirmesini UPSERT et
  await client.query(
    `INSERT INTO seo_redirects (source_path, target_path, status_code, updated_at)
     VALUES ($1, $2, 301, NOW())
     ON CONFLICT (source_path) DO UPDATE
     SET target_path = EXCLUDED.target_path,
         status_code = 301,
         is_active = TRUE,
         updated_at = NOW()`,
    [normOld, normNew],
  );

  // 4. Cache temizliği
  invalidateRedirectCache(normOld);
  invalidateRedirectCache(normNew);
}

export const upsertSlugRedirect = recordSlugRedirect;

export async function recordBlogPostSlugChange(
  client: { query: (text: string, values?: any[]) => Promise<any> },
  oldSlug: string,
  newSlug: string,
): Promise<void> {
  await recordSlugRedirect(client, `/blog/${oldSlug}`, `/blog/${newSlug}`);
}

export function createRedirectResponse(
  req: NextRequest,
  entry: RedirectEntry,
): NextResponse | null {
  if (!entry) return null;

  const target = new URL(entry.target_path, req.url);
  const allowedStatuses = [301, 302, 307, 308];
  if (target.href === req.url || !allowedStatuses.includes(entry.status_code)) return null;
  return NextResponse.redirect(target, entry.status_code as 301 | 302 | 307 | 308);
}

/**
 * Middleware katmanında gelen isteği yönlendirir.
 */
export async function handleRedirect(
  req: NextRequest,
  lookup: (pathname: string) => Promise<RedirectEntry> = getRedirectTarget,
): Promise<NextResponse | null> {
  try {
    const entry = await lookup(req.nextUrl.pathname);
    return createRedirectResponse(req, entry);
  } catch (error) {
    console.error("[RedirectHandler] Failed to check redirect:", error);
    return null;
  }
}
