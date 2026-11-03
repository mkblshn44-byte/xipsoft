import pool from "@/lib/db/pool";
import { NextRequest, NextResponse } from "next/server";
import type { Pool } from "pg";
import { getRedisClient } from "@/lib/redis/client";
import {
  contentCanonicalPath,
  isDataDependentExtensionless,
  type ExtensionlessPolicy,
} from "@/lib/content-path";
import { isPublishedTreePath } from "@/lib/content-tree-policy";

export type RedirectEntry = { target_path: string; status_code: number } | null;

// ── In-memory snapshot ────────────────────────────────────────────────────────
// Middleware her istekte çalışır; botlar/binlerce bilinmeyen yol için istek
// başına DB sorgusu bağlantı havuzunu tüketir. Bunun yerine `seo_redirects`
// tablosunun TAMAMI tek sorguyla belleğe alınır ve tüm lookups bellekten
// yapılır. DB'ye yalnızca snapshot süresi dolunca (ya da cache invalidation
// sonrası ilk istekte) 1 kez gidilir.
const REDIRECT_SNAPSHOT_TTL_MS = 30_000;

let redirectSnapshot: Map<string, RedirectEntry> | null = null;
let redirectSnapshotExpiresAt = 0;
let redirectSnapshotRequest: Promise<Map<string, RedirectEntry>> | null = null;

function normalizePath(p: string): string {
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

async function loadRedirectSnapshot(
  database: Pick<Pool, "query">,
): Promise<Map<string, RedirectEntry>> {
  const { rows } = await database.query<{
    source_path: string;
    target_path: string;
    status_code: number;
  }>(
    `SELECT source_path, target_path, status_code
     FROM seo_redirects
     WHERE is_active = TRUE`,
  );
  const map = new Map<string, RedirectEntry>();
  for (const row of rows) {
    map.set(normalizePath(row.source_path), {
      target_path: row.target_path,
      status_code: row.status_code,
    });
  }
  return map;
}

/**
 * Hem in-memory hem de Redis redirect önbelleğini temizler.
 * sourcePath verilirse yalnızca o yolu; verilmezse tümünü temizler.
 */
export function invalidateRedirectCache(sourcePath?: string): void {
  if (sourcePath) {
    const normalized = normalizePath(sourcePath);
    redirectSnapshot?.delete(normalized);
  } else {
    redirectSnapshot = null;
  }
  // Snapshot'ı bayat işaretle → sonraki istek DB'den taze yükler.
  redirectSnapshotExpiresAt = 0;

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
 * Yönlendirme hedefini getirir.
 *
 * - Varsayılan (middleware) yolu: bellekteki tam tablo snapshot'ından O(1)
 *   lookup — DB'ye hiç gidilmez.
 * - `database` parametresi verilirse (script/test) eski davranış korunur:
 *   yalnızca o path için DB sorgusu yapılır.
 */
export async function getRedirectTarget(
  pathname: string,
  database: Pick<Pool, "query"> = pool,
): Promise<RedirectEntry> {
  const normalized = normalizePath(pathname);

  // Test/script explicit DB hedefledi → per-key eski davranış.
  if (database !== pool) {
    try {
      const { rows } = await database.query<NonNullable<RedirectEntry>>(
        `SELECT target_path, status_code FROM seo_redirects
         WHERE source_path = $1 AND is_active = TRUE
         LIMIT 1`,
        [normalized],
      );
      return rows[0] ?? null;
    } catch (error) {
      console.error("[RedirectHandler] DB query error:", error);
      return null;
    }
  }

  // Snapshot bayattıysa (veya yoksa) tazele — eş zamanlı istekler tek sorgu paylaşır.
  if (!redirectSnapshot || Date.now() >= redirectSnapshotExpiresAt) {
    if (!redirectSnapshotRequest) {
      redirectSnapshotRequest = loadRedirectSnapshot(database)
        .then((map) => {
          redirectSnapshot = map;
          redirectSnapshotExpiresAt = Date.now() + REDIRECT_SNAPSHOT_TTL_MS;
          return map;
        })
        .catch((error) => {
          console.error("[RedirectHandler] Snapshot load failed:", error);
          // Eski snapshot varsa onunla devam et (fail-open).
          return redirectSnapshot ?? new Map<string, RedirectEntry>();
        })
        .finally(() => {
          redirectSnapshotRequest = null;
        });
    }
    await redirectSnapshotRequest;
  }

  return redirectSnapshot?.get(normalized) ?? null;
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

/**
 * `seo_redirects.target_path` değerini ağacın `.html` kanoniğine indirger.
 *
 * Neden okuma tarafında: tablodaki 116 satır (`web-yazilim-tasarim/…` →
 * `…1/…`) uzantısız hedef yazıldığında üretilmişti; hedef ayrıca 308 ile
 * `.html`'e döndüğü için botlar iki yönlendirme hop'u görüyordu. Burada
 * `contentCanonicalPath` çağrılmak üzere hedef tek adımda kanoniğe çözülür —
 * DB'de geri sayım/düzeltme yazımı gerektirmez ve sonraki kayıtlar da kapsanır.
 *
 * Kanonik uzantı kararı VERİDEN gelebildiği için (`kind='custom'` düğümü
 * `.html`, eski hizmet/konum satırları uzantısız) sahiplik bilgisi policy olarak
 * VERİLMEK zorunda; verilmezse legacy liste kazanır ve yayınlanmış bir düğüme
 * giden hedef uzantısız kalıp ikinci hop'u geri getirir.
 *
 * Uzantısız kanonik rotalar (`/blog/…`, `/hizmetler` hub'ı) ve kök dışı/
 * sorgulu hedefler olduğu gibi geçer.
 */
export function canonicalizeTargetPath(
  targetPath: string,
  policy?: ExtensionlessPolicy,
): string {
  if (!targetPath.startsWith("/")) return targetPath;
  const boundary = targetPath.search(/[?#]/);
  if (boundary === -1) return contentCanonicalPath(targetPath, policy);
  return `${contentCanonicalPath(targetPath.slice(0, boundary), policy)}${targetPath.slice(boundary)}`;
}

/**
 * Hedefin ağaç sahipliğini ÖNCEDEN çözer ve sync kanonik üreticisine verilebilir
 * policy'ye çevirir. Yalnızca kararın veriden değişebildiği yollarda sorgu
 * atılır (`isDataDependentExtensionless`) — EXACT kod rotaları ve `.html`
 * kanonik hedefler DB'ye dokunmaz.
 */
export async function targetPathPolicy(
  targetPath: string,
  treeLookup: (path: string) => Promise<boolean> = isPublishedTreePath,
): Promise<ExtensionlessPolicy | undefined> {
  const bare = targetPath.split(/[?#]/)[0];
  if (!isDataDependentExtensionless(bare)) return undefined;
  const owned = await treeLookup(bare);
  return { isTreeOwned: () => owned };
}

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
  policy?: ExtensionlessPolicy,
): NextResponse | null {
  if (!entry) return null;

  const target = new URL(canonicalizeTargetPath(entry.target_path, policy), req.url);
  const allowedStatuses = [301, 302, 307, 308];
  if (target.href === req.url || !allowedStatuses.includes(entry.status_code)) return null;
  return NextResponse.redirect(target, entry.status_code as 301 | 302 | 307 | 308);
}

/**
 * Middleware katmanında gelen isteği yönlendirir.
 *
 * `treeLookup` yalnızca test/ödeme noktasıdır: production'daki öntanımlı
 * değer `isPublishedTreePath` (60 sn TTL önbellekli, kök ön elemeli).
 */
export async function handleRedirect(
  req: NextRequest,
  lookup: (pathname: string) => Promise<RedirectEntry> = getRedirectTarget,
  treeLookup: (path: string) => Promise<boolean> = isPublishedTreePath,
): Promise<NextResponse | null> {
  try {
    const entry = await lookup(req.nextUrl.pathname);
    if (!entry) return null;
    const policy = await targetPathPolicy(entry.target_path, treeLookup);
    return createRedirectResponse(req, entry, policy);
  } catch (error) {
    console.error("[RedirectHandler] Failed to check redirect:", error);
    return null;
  }
}
