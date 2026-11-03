/**
 * seo-conflict-guard.ts — Yayınlanmış içerik ↔ `seo_redirects` çakışma koruması.
 *
 * Çakışma iki yönde de doğabilir ve ikisinde de sonuç aynıdır: bir adres ya
 * canlı bir sayfadır ya da bir yönlendirmedir; ikisi aynı anda olamaz.
 *
 *   YÖN 1 (yayın kazanır): admin `/forum/x/y.html` gibi bir adresi yayına
 *     aldığında, o adrese işaret eden (eski WP devrinden kalan) aktif redirect
 *     satırları `is_active = FALSE` yapılır. Satır SİLİNMEZ — GSC/rapor
 *     geçmişi ve geri alma imkânı korunur. Pasif satır middleware'in
 *     `seo_redirects` snapshot'ından düşer, sayfa anında açılır.
 *
 *   YÖN 2 (yönlendirme kazanır): admin bir yolu redirect kaynağı yaptığında ve
 *     o yolda yayınlı bir ağaç sayfası varsa sayfa `status = 'paused'` olur.
 *     Aksi halde sayfa route'u redirect'i gölgede bırakır (Next routing,
 *     middleware sırası) ve admin'in "bu adres şuraya taşındı" kararı çalışmaz.
 *
 * Kod rotaları (`EXTENSIONLESS_ROUTE_EXACT`: kök, `/blog` listesi, `/hizmetler`
 * hub'ı, politika sayfaları) her iki yönde de DOKUNULMAZ — onlar veriden
 * türemez, ağaç doğrulaması (`validateFullPath`) o yollarda düğüm yaratmayı
 * zaten engeller.
 *
 * ek olarak: yayın/durum değişimlerinde `invalidateContentTreePolicy()`
 * çağrılır, böylece middleware'in ağaç sahipliği snapshot'ı 60 sn TTL'i
 * beklemeden tazelenir (Hızlı Sayfa Aç akışının "dakikalar değil, saniyeler"
 * şartı).
 */
import pool from "@/lib/db/pool";
import {
  EXTENSIONLESS_ROUTE_EXACT,
  normalizeRequestPath,
  toRouteKey,
  treeNodeCanonicalPath,
} from "@/lib/content-path";
import {
  PUBLISHED_TREE_SQL_FILTER,
  invalidateContentTreePolicy,
} from "@/lib/content-tree-policy";
import { invalidateRedirectCache } from "@/lib/redirect-handler";

/** `pool` ve `PoolClient`'in ortak asgari imzası (transaction içinde de çalışır). */
type Queryable = { query: (...args: any[]) => Promise<any> };

const db: Queryable = pool;

/**
 * `pages.full_path` biçimine indirger: baş/son slash yok, `.html` yok.
 * (`full_path` uzantısız saklanır — bkz. content-tree.ts başı.)
 */
function toFullPathKey(pathname: string): string | null {
  const raw = normalizeRequestPath(String(pathname ?? ""));
  const key = toRouteKey(raw).replace(/^\/+/, "");
  return key || null;
}

/** Bir tam yolun istek-side olası biçimleri: kanonik + uzantısız. */
function candidateSourcePaths(fullPath: string): string[] {
  const asPath = `/${fullPath}`;
  const canonical = treeNodeCanonicalPath(fullPath);
  const candidates = new Set<string>([asPath, canonical]);
  if (!EXTENSIONLESS_ROUTE_EXACT.includes(canonical)) candidates.add(`${asPath}.html`);
  return Array.from(candidates);
}

/**
 * YÖN 1 — verilen yollardan YAYINDA olanların redirect satırlarını pasifleştir.
 * Çağıran taraf durum bilmeden yolu pass'leyebilir; yayında olmayan yol burada
 * elenir (draft/paused sayfa redirect'i gölgeleyemez).
 */
export async function deactivateRedirectsForPublishedPaths(
  fullPaths: Array<string | null | undefined>,
): Promise<void> {
  invalidateContentTreePolicy();

  const keys = Array.from(
    new Set(fullPaths.map((path) => toFullPathKey(String(path ?? ""))).filter(Boolean)),
  ) as string[];
  if (keys.length === 0) return;

  const publishedRes: { rows: Array<{ full_path: string }> } = await db.query(
    `SELECT full_path
       FROM pages
      WHERE full_path = ANY($1::text[])
        AND ${PUBLISHED_TREE_SQL_FILTER}`,
    [keys],
  );
  if (publishedRes.rows.length === 0) return;

  const sources = Array.from(
    new Set(publishedRes.rows.flatMap((row) => candidateSourcePaths(row.full_path))),
  );

  const updatedRes: { rows: Array<{ source_path: string }> } = await db.query(
    `UPDATE seo_redirects
        SET is_active = FALSE, updated_at = NOW()
      WHERE is_active = TRUE
        AND source_path = ANY($1::text[])
    RETURNING source_path`,
    [sources],
  );

  // Snapshot'ı hem değişen satırlar hem de aday yollar için bayat bırak.
  for (const source of sources) invalidateRedirectCache(source);

  if (updatedRes.rows.length > 0) {
    console.info(
      `[seo-conflict-guard] ${updatedRes.rows.length} redirect satırı pasifleştirildi (yol yayında):`,
      updatedRes.rows.map((row) => row.source_path),
    );
  }
}

/**
 * YÖN 2 — bir yolu redirect KAYNAĞI yaparken, o yoldaki yayınlı ağaç sayfasını
 * duraklat. `db` çağıranın transaction bağlantısıysa onunla birlikte çalışır.
 */
export async function pausePublishedNodeForRedirectSource(
  sourcePath: string,
  database: Queryable = db,
): Promise<void> {
  invalidateContentTreePolicy();

  const key = toFullPathKey(sourcePath);
  if (!key) return;
  // Kod rotaları yönlendirme kaynağı olabilir ama ağaç sayfası içermez.
  if (EXTENSIONLESS_ROUTE_EXACT.includes(toRouteKey(sourcePath))) return;

  const pausedRes: { rows: Array<{ id: string; full_path: string }> } = await database.query(
    `UPDATE pages
        SET status = 'paused', updated_at = NOW()
      WHERE full_path = $1
        AND ${PUBLISHED_TREE_SQL_FILTER}
    RETURNING id::text AS id, full_path`,
    [key],
  );

  for (const row of pausedRes.rows) {
    invalidateRedirectCache(`/${row.full_path}`);
  }

  if (pausedRes.rows.length > 0) {
    console.info(
      "[seo-conflict-guard] Redirect kaynağı ile çakışan sayfa duraklatıldı:",
      pausedRes.rows.map((row) => `/${row.full_path}`),
    );
  }
}
