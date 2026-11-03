/**
 * content-tree.ts — Esnek `full_path` tabanlı içerik ağacı çözücüsü (Aşama 6).
 *
 * AMAÇ: WordPress benzeri sınırsız kategori/sayfa hiyerarşisi. Gelen slug
 * dizisi tek bir `full_path`'e indirgenir ve `pages` ağacında TEK sorguyla
 * aranır. Eşleşen düğüm bir `category` ise alt düğümleri de döner.
 *
 * Kaynak: `pages` — `TREE_SERVABLE_SQL_FILTER` (`kind='custom'` + hizmet
 * konsolidasyonundaki `kind='service' | 'location'` satırları). Eski
 * hizmet×konum satırları `pages.full_path`'te `hizmetler/<hizmet>/<lokasyon>`
 * olarak ZATEN duruyor (ölçüldü: 1.270/1.270 dolu), bu yüzden kök catch-all
 * onları da adresleyebilir; `/hizmetler/[...slug]` rotası var olduğu sürece
 * Next rota önceliği gereği bu yollar oraya düşmez.
 *
 * KANONİK URL: `.html` yalnız admin'in ağaçtan yarattığı `kind='custom'`
 * düğümlerinde kullanılır (`PUBLISHED_TREE_SQL_FILTER` o sahiplenmeyi verir).
 * `service`/`location` satırları canlı tasarımı koruyarak UZANTISIZ kanonik
 * alır; `/hizmetler` bu yüzden `EXTENSIONLESS_ROUTE_PREFIXES` içindedir.
 * `pages.full_path` her koşulda uzantısız saklanır.
 *
 * Önbellek: `unstable_cache` (300 sn) — `content-tree` / `content-path:<path>`
 * tag'leri ile admin kaydında invalidate edilir.
 */
import { unstable_cache } from "next/cache";
import pool from "@/lib/db/pool";
import { normalizeContentPath } from "@/lib/content-path";
import { TREE_SERVABLE_SQL_FILTER } from "@/lib/content-tree-policy";
import { pageCacheKey, withPageCache } from "@/lib/redis/page-cache";
import { toSchemaMarkup } from "@/lib/schema-markup";

export {
  CONTENT_EXTENSION,
  stripContentExtension,
  contentCanonicalPath,
  treeNodeCanonicalPath,
  canonicalPathForNode,
  normalizeContentPath,
} from "@/lib/content-path";

export type ContentNodeType = "page" | "category";

export interface ContentTreeNode {
  id: string;
  parentId: string | null;
  nodeType: ContentNodeType;
  kind: string;
  /** Yalnızca son segment (ör. "aksamcilar-nerde"). */
  slug: string;
  /**
   * Tam URL yolu, baş eğik çizgi yok (ör. "haberler/gundem/aksamcilar-nerde").
   * Kanonik adres DB kolonundan OKUNMAZ, bu alan + `kind`'den türer:
   * `canonicalPathForNode()` (MIMARI.md §3.1).
   */
  fullPath: string;
  title: string;
  h1Title: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  markdownContent: string | null;
  renderedHtml: string | null;
  ogImageUrl: string | null;
  robots: string | null;
  isIndexable: boolean;
  /**
   * DB'den gelen ham JSON-LD şemaları (`pages.schema_markup`). Doluysa sayfanın
   * `<script type="application/ld+json">` çıktısına EKLENİR — kodun tür
   * bazında ürettiği şemanın yerine geçmez, onu tamamlar.
   */
  schemaMarkup: Record<string, unknown>[] | null;
  status: string;
  sortOrder: number;
  updatedAt: string | null;
}

export interface ContentTreeResult {
  node: ContentTreeNode;
  /** Yalnızca `nodeType === 'category'` için dolu. */
  children: ContentTreeNode[];
}

/**
 * Bir düğümün kanonik URL yolu — karar `content-path.canonicalPathForNode`
 * içindedir (`kind='custom'` → `.html`, `service`/`location` → uzantısız).
 */

interface RawNode {
  id: string;
  parent_id: string | null;
  node_type: ContentNodeType;
  kind: string;
  slug: string;
  full_path: string | null;
  title: string;
  h1_title: string | null;
  meta_title: string | null;
  meta_description: string | null;
  markdown_content: string | null;
  rendered_html: string | null;
  og_image_url: string | null;
  robots: string | null;
  is_indexable: boolean;
  schema_markup: Record<string, unknown> | unknown[] | string | null;
  status: string;
  sort_order: number;
  updated_at: string | null;
}

const NODE_COLUMNS = `
  id::text, parent_id::text, node_type, kind, slug, full_path, title, h1_title,
  meta_title, meta_description, markdown_content, rendered_html,
  og_image_url, robots, is_indexable, schema_markup, status, sort_order,
  to_char(updated_at, 'YYYY-MM-DD') AS updated_at
`;

function mapNode(row: RawNode): ContentTreeNode {
  return {
    id: row.id,
    parentId: row.parent_id,
    nodeType: row.node_type,
    kind: row.kind,
    slug: row.slug,
    fullPath: row.full_path ?? row.slug,
    title: row.title,
    h1Title: row.h1_title,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    markdownContent: row.markdown_content,
    renderedHtml: row.rendered_html,
    ogImageUrl: row.og_image_url,
    robots: row.robots,
    isIndexable: row.is_indexable,
    schemaMarkup: toSchemaMarkup(row.schema_markup),
    status: row.status,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

async function queryContentNode(fullPath: string): Promise<ContentTreeResult | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    const { rows } = await pool.query<RawNode>(
      `SELECT ${NODE_COLUMNS}
         FROM pages
        WHERE full_path = $1
          AND ${TREE_SERVABLE_SQL_FILTER}
        LIMIT 1`,
      [fullPath],
    );
    if (rows.length === 0) return null;

    const node = mapNode(rows[0]);
    if (node.nodeType !== "category") {
      return { node, children: [] };
    }

    const childrenResult = await pool.query<RawNode>(
      `SELECT ${NODE_COLUMNS}
         FROM pages
        WHERE parent_id = $1::uuid
          AND ${TREE_SERVABLE_SQL_FILTER}
        ORDER BY sort_order, title`,
      [node.id],
    );

    return { node, children: childrenResult.rows.map(mapNode) };
  } catch (error) {
    console.warn(
      "[ContentTree] full_path lookup failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Slug dizisini `pages.full_path` üzerinden çözer. Bulunamazsa null döner
 * (çağıran `notFound()` atmalıdır).
 */
export function resolveContentPath(
  slugArray: string[],
): Promise<ContentTreeResult | null> {
  const fullPath = normalizeContentPath(slugArray);
  if (!fullPath) return Promise.resolve(null);

  return withPageCache(pageCacheKey("tree", fullPath), () =>
    unstable_cache(
      () => queryContentNode(fullPath),
      ["content-tree-v1", fullPath],
      { revalidate: 300, tags: ["content-tree", `content-path:${fullPath}`] },
    )(),
  );
}
