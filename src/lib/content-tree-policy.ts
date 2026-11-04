/**
 * content-tree-policy.ts — "Bu yolu içerik ağacı sahipleniyor mu?" (DB önbelleği).
 *
 * NEDEN GEREKLİ? Eski WordPress yönlendirmeleri elle tutulan listelerde
 * (`RESERVED_ROOT_SEGMENTS`) karar veriyordu. Admin yeni bir `/forum/...` ya da
 * `/haberler/...` sayfası yayınladığında liste hâlâ "bu kök legacy, blog'a 301"
 * der ve yayınlanan sayfa hiç açılamazdı. Yol sahipliği artık VERİDEN gelir:
 *
 *   1. KÖK FİLTRESİ  — tek `GROUP BY` sorgusuyla yayınlanmış `kind='custom'`
 *      düğümlerinin İLK segmentleri belleğe alınır. Kök listede yoksa DB'ye
 *      hiç gidilmez (bot taraması / bilinmeyen URL havuzu maliyeti sıfır).
 *   2. YOL ARAMA     — yalnızca kök eşleşirse `full_path` üzerinde İNDEKSLİ
 *      tek `SELECT 1 ... LIMIT 1` çalışır; sonuç TTL penceresi boyunca
 *      sınırlı boyutlu bir haritada tutulur.
 *
 * EŞDEĞERLİK KURALI (yönlendirme döngüsü koruması): buradaki WHERE koşulu
 * `content-tree.ts → queryContentNode()` ile BİREBİR aynıdır (`kind='custom'`,
 * `status='published'`, `is_deleted=FALSE`, `full_path=$1`). Yani middleware
 * "sahipleniyor" derse rota da aynı düğümü çözer; "sahiplenmiyor" derse rota da
 * 404 verir — iki tarafın ayrı ayrı karar vermesi yapısal olarak imkânsız.
 *
 * YOL NORMALİZASYONU da rota ile ortak: `normalizeRequestPath` (locale öneki +
 * trailing slash) ve `normalizeContentPath` (segment slugify) kullanılır. Böylece
 * `/en/Forum/HABERLER.html` ile rotanın ürettiği `full_path` aynı anahtara
 * indirgenir.
 *
 * FAIL-OPEN: DB yok/hata olursa `false` döner → davranış bugünkü elle tutulan
 * liste kararının aynısıdır (eski URL'ler eskisi gibi `/blog`'a 301). Eski 5.500+
 * forum URL'i bu yüzden yeni mekanizmadan etkilenmez.
 */
import pool from "@/lib/db/pool";
import {
  CONTENT_PAGE_KIND_SQL,
  MAX_CONTENT_SEGMENTS,
  normalizeContentPath,
  normalizeContentSlug,
  normalizeRequestPath,
  stripContentExtension,
} from "@/lib/content-path";

/** Snapshot süresi. Admin publish'i `invalidateContentTreePolicy()` ile bekletmez. */
const TREE_POLICY_TTL_MS = 60_000;

/** Bilinmeyen alt yolların harita büyümesini sınırla (rotadan bağımsız koruma). */
const MAX_PATH_DECISIONS = 2_000;

let schemaPromise: Promise<void> | null = null;

export async function ensureContentTreeSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await pool.query("ALTER TABLE pages ADD COLUMN IF NOT EXISTS full_path TEXT");
      await pool.query("ALTER TABLE pages ADD COLUMN IF NOT EXISTS parent_id UUID");
      await pool.query(
        "ALTER TABLE pages ADD COLUMN IF NOT EXISTS node_type TEXT NOT NULL DEFAULT 'page'",
      );
      await pool.query(
        "ALTER TABLE pages ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0",
      );
      await pool.query("ALTER TABLE pages ADD COLUMN IF NOT EXISTS schema_markup JSONB");
      // Ağaç okuyucusu bu iki kolonu SELECT listesinde taşır (`content-tree.ts`):
      // çok dilli örtüşme haritası ve mutlak `<title>` kararı. Kod DB'den önce
      // yayınlanırsa ilk istek kolonları ekler, aksine okuma null'a düşer.
      await pool.query("ALTER TABLE pages ADD COLUMN IF NOT EXISTS content_i18n JSONB");
      await pool.query("ALTER TABLE pages ADD COLUMN IF NOT EXISTS title_absolute BOOLEAN");
      await pool.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS pages_full_path_uq
           ON pages (full_path)
          WHERE full_path IS NOT NULL AND is_deleted = FALSE`,
      );
    })().catch((error: unknown) => {
      schemaPromise = null;
      console.error(
        "[content-tree-policy] Şema hazırlanamadı:",
        error instanceof Error ? error.message : error,
      );
      throw error;
    });
  }
  return schemaPromise;
}

/**
 * Published custom page paths used by content-tree lookup and legacy redirect
 * conflict checks. URL extension normalization is global and separate.
 */
export const PUBLISHED_TREE_SQL_FILTER =
  `kind IN (${CONTENT_PAGE_KIND_SQL}) AND is_deleted = FALSE AND status = 'published' AND full_path IS NOT NULL AND full_path <> ''`;

/**
 * SUNULABİLİR düğüm koşulu — ağaç çözümleyicisinin (`resolveContentPath`)
 * okuyabileceği satırlar. Konsolidasyon hedefi tek motor olduğundan hizmet ve
 * konum satırları da ağaçtan adreslenebilir.
 */
export const TREE_SERVABLE_SQL_FILTER =
  `kind IN (${CONTENT_PAGE_KIND_SQL}, 'service', 'location') AND is_deleted = FALSE AND status = 'published' AND full_path IS NOT NULL AND full_path <> ''`;

let treeRoots: Set<string> | null = null;
let treeRootsExpiresAt = 0;
let treeRootsRequest: Promise<Set<string> | null> | null = null;

/** `full_path` (uzantısız, başsız) → sahipleniyor mu? */
const pathDecisions = new Map<string, boolean>();
let pathDecisionsExpiresAt = 0;

async function loadTreeRoots(): Promise<Set<string>> {
  await ensureContentTreeSchema();
  const { rows } = await pool.query<{ root: string }>(
    `SELECT DISTINCT split_part(full_path, '/', 1) AS root
       FROM pages
      WHERE ${PUBLISHED_TREE_SQL_FILTER}`,
  );
  const roots = new Set<string>();
  for (const row of rows) {
    const root = normalizeContentSlug(row.root);
    if (root) roots.add(root);
  }
  return roots;
}

/** Kök setini döner; süre dolmuşsa tek sorgu paylaşarak tazeler. */
async function getTreeRoots(): Promise<Set<string> | null> {
  if (!process.env.DATABASE_URL) return null;

  const now = Date.now();
  if (treeRoots && now < treeRootsExpiresAt) return treeRoots;
  if (treeRootsRequest) return treeRootsRequest;

  treeRootsRequest = loadTreeRoots()
    .then((roots) => {
      treeRoots = roots;
      treeRootsExpiresAt = Date.now() + TREE_POLICY_TTL_MS;
      return roots;
    })
    .catch((error) => {
      console.warn("[content-tree-policy] Kök snapshot'ı alınamadı:", error);
      // Bayat snapshot varsa onunla devam et; yoksa "sahiplenmiyor" (fail-open).
      return treeRoots ?? null;
    })
    .finally(() => {
      treeRootsRequest = null;
    });

  return treeRootsRequest;
}

async function treeOwnsFullPath(fullPath: string): Promise<boolean> {
  // TTL penceresi dolduysa yol kararlarını tamamen düşür (sınırsız büyüme yok).
  if (Date.now() >= pathDecisionsExpiresAt) {
    pathDecisions.clear();
    pathDecisionsExpiresAt = Date.now() + TREE_POLICY_TTL_MS;
  }

  const cached = pathDecisions.get(fullPath);
  if (cached !== undefined) return cached;

  let owned = false;
  try {
    await ensureContentTreeSchema();
    const { rows } = await pool.query<{ found: number }>(
      `SELECT 1 AS found
         FROM pages
        WHERE full_path = $1
          AND ${PUBLISHED_TREE_SQL_FILTER}
        LIMIT 1`,
      [fullPath],
    );
    owned = rows.length > 0;
  } catch (error) {
    console.warn("[content-tree-policy] full_path sorgusu başarısız:", error);
    return false; // hata anında legacy liste davranışı
  }

  if (pathDecisions.size >= MAX_PATH_DECISIONS) pathDecisions.clear();
  pathDecisions.set(fullPath, owned);
  return owned;
}

/**
 * İstek yolu yayınlanmış bir içerik ağacı düğümüne mi ait?
 * `pathname` `.html` ekli ya da ekisiz olabilir; locale öneki taşabilir.
 */
export async function isPublishedTreePath(pathname: string): Promise<boolean> {
  const normalized = stripContentExtension(normalizeRequestPath(pathname || "/"));
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0 || segments.length > MAX_CONTENT_SEGMENTS) return false;

  // 1) Hızlı ön eleme: yalnızca İLK segmenti normalize et.
  const root = normalizeContentSlug(segments[0]);
  const roots = await getTreeRoots();
  if (!roots || !root || !roots.has(root)) return false;

  // 2) Kök ağaca ait → tam yolu rota ile aynı normalizer'dan geçir ve ara.
  const fullPath = normalizeContentPath(segments);
  if (!fullPath) return false;
  return treeOwnsFullPath(fullPath);
}

/**
 * Yayınlandı/silindi/durum değişti → snapshot'ı bayat bırak. Admin ekranı
 * kaydından sonra çağrılır; sayfa 60 sn beklemeden açılabilir.
 */
export function invalidateContentTreePolicy(): void {
  treeRoots = null;
  treeRootsExpiresAt = 0;
  treeRootsRequest = null;
  pathDecisions.clear();
  pathDecisionsExpiresAt = 0;
}
