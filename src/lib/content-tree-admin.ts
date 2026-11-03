/**
 * content-tree-admin.ts — İçerik ağacı (kategori/sayfa) ADMIN veri erişimi.
 *
 * `content-tree.ts` public resolver'ın aksine bu modül ÖNBELLEKSİZDİR ve
 * taslak/pasif düğümleri de görür; yalnızca admin server action'ları kullanır.
 *
 * Kaynak: `pages` (kind = 'custom').
 * İçerik ağacı, sitenin genel kategori ve içerik sayfalarından sorumludur.
 * Hizmet sayfaları `/admin/hizmetler`, Blog içerikleri ise `/admin/blog`
 * ekranından bağımsız olarak yönetilir.
 */
import pool from "@/lib/db/pool";
import { slugify } from "@/utils/slugify";
import {
  EXTENSIONLESS_ROUTE_EXACT,
  stripContentExtension,
  TREE_STATUSES,
  type TreeStatus,
  type TreeNodeType,
} from "@/lib/content-path";

export { TREE_STATUSES };
export type { TreeStatus, TreeNodeType };

/** Yeni düğümlerin kaynak türü. */
export const TREE_KIND = "custom";

/**
 * Kök segment olarak KULLANILAMAYACAK yollar (diskte `page.tsx`/`route.ts`
 * şablonu OLAN rotalar ve altyapı). Bir düğümün `full_path`'inin ilk segmenti
 * bunlardan biri olamaz; aksi halde düğüm daha spesifik bir rota tarafından
 * gölgelenir ve Next.js routing önceliği yüzünden hiç açılmaz.
 *
 * VERİ ODAKLI KARAR (Kırık Link → Sayfa Aç): eski WordPress kökleri
 * (`forum`, `news`, `posts`, `article`, `products`, `services`) artık
 * LİSTEDE DEĞİL — diskte karşılık gelen bir kod rotası yok, yalnızca
 * middleware'te legacy yönlendirme/`.html` sökme kuralı var. Admin bu adların
 * altında sayfa yayınladığında kararı DB verir: middleware sahipliği görür,
 * 301'i atlar ve isteği kök catch-all'a bırakır.
 *
 * Kod rotası olan legacy kökler (`urunler`, `blog`) ve `EXTENSIONLESS_ROUTE_EXACT`
 * tam eşleşmeleri (aşağıdaki kontrol) ayrılmış kalmaya devam eder.
 */
const RESERVED_ROOT_SEGMENTS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "auth",
  "login",
  "register",
  "erisim-yok",
  "maintenance",
  "takip",
  "odeme",
  "teklif",
  "x",
  "s",
  "blog",
  "urunler",
  "references",
  "hakkimizda",
  "contact-us",
  "privacy-policy",
  "terms-of-service",
  "cookie-policy",
  "istanbul-yazilim-sirketi",
  "sitemap",
  "sitemap.xml",
  "robots.txt",
  "manifest.json",
  "ads.txt",
  "favicon.ico",
  "_next",
  // locale önekleri
  "tr",
  "en",
  "de",
  "fr",
  "es",
  "ru",
]);

export interface AdminServiceData {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  badge_icon: string | null;
  badge_gradient: string | null;
  badge_color: string | null;
  title_gradient: string | null;
  hero_cta: string | null;
  stats: unknown;
  features: unknown;
  features_title: string | null;
  features_desc: string | null;
  tech_stack: unknown;
  tech_title: string | null;
  services_tag: unknown;
  process_title: string | null;
  process_desc: string | null;
  process_steps: unknown;
  packages: unknown;
  packages_title: string | null;
  packages_desc: string | null;
  cta_title: string | null;
  cta_desc: string | null;
  cta_btn: string | null;
  micro_services: unknown;
  micro_title: string | null;
  micro_desc: string | null;
  faq_title: string | null;
  faq_items: unknown;
  guide: unknown;
  metadata: unknown;
  is_active: boolean;
  sort_order: number;
}

export interface AdminTreeNode {
  id: string;
  parentId: string | null;
  nodeType: TreeNodeType;
  kind: string;
  slug: string;
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
  /** Ham JSON-LD metni — panel textarea'sına olduğu gibi girilir. */
  schemaMarkup: string | null;
  status: TreeStatus;
  sortOrder: number;
  isDeleted: boolean;
  updatedAt: string;
  serviceId?: number | null;
  serviceData?: AdminServiceData | null;
}

interface RawAdminNode {
  id: string;
  parent_id: string | null;
  node_type: TreeNodeType;
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
  schema_markup: string | null;
  status: string;
  sort_order: number;
  is_deleted: boolean;
  updated_at: string;
  service_id: number | null;
}

const ADMIN_COLUMNS = `
  id::text, parent_id::text, node_type, kind, slug, full_path, title, h1_title,
  meta_title, meta_description, markdown_content, rendered_html, og_image_url,
  robots, is_indexable, schema_markup::text AS schema_markup,
  status, sort_order, is_deleted, service_id,
  to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS updated_at
`;

/**
 * Liste görünümü için hafif kolon seti: ağır gövde alanları (`markdown_content`,
 * `rendered_html`) TAŞINMAZ.
 * Düzenleme formu gövdeyi ayrıca `getTreeNode` ile çeker.
 */
const ADMIN_LIST_COLUMNS = `
  id::text, parent_id::text, node_type, kind, slug, full_path, title, h1_title,
  meta_title, meta_description, NULL::text AS markdown_content, NULL::text AS rendered_html,
  og_image_url, robots, is_indexable, schema_markup::text AS schema_markup,
  status, sort_order, is_deleted, service_id,
  to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS updated_at
`;

function mapNode(row: RawAdminNode): AdminTreeNode {
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
    schemaMarkup: row.schema_markup,
    status: (TREE_STATUSES as ReadonlyArray<string>).includes(row.status)
      ? (row.status as TreeStatus)
      : "draft",
    sortOrder: row.sort_order,
    isDeleted: row.is_deleted,
    updatedAt: row.updated_at,
    serviceId: row.service_id ?? null,
  };
}

/** Ham slug girdisini normalize eder. Boşsa hata döner. */
export function normalizeSlugInput(raw: string): string {
  return slugify(stripContentExtension(String(raw ?? "").trim()));
}

/**
 * Bir `full_path` için biçim/rezerve-segment doğrulaması yapar.
 * `null` → geçerli; aksi halde kullanıcıya gösterilecek hata mesajı.
 */
export function validateFullPath(fullPath: string): string | null {
  if (!fullPath) return "URL yolu boş olamaz.";
  if (fullPath.length > 400) return "URL yolu çok uzun.";
  const segments = fullPath.split("/");
  if (segments.some((segment) => !segment)) return "URL yolu boş segment içeriyor.";
  if (RESERVED_ROOT_SEGMENTS.has(segments[0])) {
    return `"${segments[0]}" ayrılmış bir kök yol; bu ad altında içerik oluşturulamaz.`;
  }
  // Kanonik adresi UZANTISIZ olan kod rotaları (kök, `/hizmetler` hub'ı,
  // `/blog` listesi, politika sayfaları) ağaç tarafından alınamaz: `content-path`
  // bu yollar için `.html` EKLEMEZ, dolayısıyla düğümün kanoniği kod rotasıyla
  // çakışır ve sayfa hiç açılmaz. Alt yollar (`hizmetler/<slug>`) serbesttir.
  const asRoute = `/${segments.join("/")}`;
  if (EXTENSIONLESS_ROUTE_EXACT.includes(asRoute)) {
    return `"${asRoute}" kanonik adresi uzantısız bir kod rotası; bu yolda içerik yayınlanamaz.`;
  }
  return null;
}

/** Parent yolu + slug → tam yol. */
export function buildFullPath(parentPath: string | null, slug: string): string {
  return parentPath ? `${parentPath}/${slug}` : slug;
}

/**
 * İçerik ağacı EKRANI için tüm düğümler:
 *   • `custom`  → genel CMS kategori ve sayfaları
 *   • `service` → 12 ana hizmet ve kök kategori
 *   • `location`→ il/ilçe sayfaları
 */
export async function listTreeNodesForAdmin(): Promise<AdminTreeNode[]> {
  const { rows } = await pool.query<RawAdminNode>(
    `SELECT ${ADMIN_LIST_COLUMNS}
       FROM pages
      WHERE kind IN ('custom', 'service')
         OR (kind = 'location' AND is_deleted = FALSE)
      ORDER BY full_path NULLS LAST, sort_order, title`,
  );
  return rows.map(mapNode);
}

/** Tüm özel ağaç düğümlerini (silinmişler dâhil) döner. */
export async function listTreeNodes(includeDeleted = false): Promise<AdminTreeNode[]> {
  const { rows } = await pool.query<RawAdminNode>(
    `SELECT ${ADMIN_COLUMNS}
       FROM pages
      WHERE (kind = $1 OR kind = 'service')
        ${includeDeleted ? "" : "AND is_deleted = FALSE"}
      ORDER BY full_path NULLS LAST, sort_order, title`,
    [TREE_KIND],
  );
  return rows.map(mapNode);
}

export async function getTreeNode(id: string): Promise<AdminTreeNode | null> {
  const { rows } = await pool.query<RawAdminNode>(
    `SELECT ${ADMIN_COLUMNS}
       FROM pages
      WHERE id = $1::uuid
      LIMIT 1`,
    [id],
  );
  if (!rows[0]) return null;
  const node = mapNode(rows[0]);

  // Eğer düğüm bir hizmet ise veya service_id bağlıysa zengin blokları services tablosundan çek
  if (node.serviceId || node.kind === "service") {
    const svcResult = await pool.query<AdminServiceData>(
      `SELECT id, slug, title, subtitle, badge, badge_icon, badge_gradient, badge_color,
              title_gradient, hero_cta, stats, features, features_title, features_desc,
              tech_stack, tech_title, services_tag, process_title, process_desc, process_steps,
              packages, packages_title, packages_desc, cta_title, cta_desc, cta_btn,
              micro_services, micro_title, micro_desc, faq_title, faq_items, guide,
              metadata, is_active, sort_order
         FROM services
        WHERE (id = $1::int OR slug = $2 OR source_page_id = $3::uuid)
          AND row_type = 'main'
        LIMIT 1`,
      [node.serviceId || 0, node.slug, node.id],
    );
    if (svcResult.rows[0]) {
      node.serviceData = svcResult.rows[0];
      node.serviceId = svcResult.rows[0].id;
    }
  }

  return node;
}

/** Bir düğümün (parent seçimi için) temel bilgisi. */
export interface TreeParentOption {
  id: string;
  fullPath: string;
  title: string;
}

export async function listCategoryOptions(excludeId?: string): Promise<TreeParentOption[]> {
  const { rows } = await pool.query<{ id: string; full_path: string; title: string }>(
    `SELECT id::text, full_path, title
       FROM pages
      WHERE kind IN ('custom', 'service')
        AND node_type = 'category'
        AND is_deleted = FALSE
        ${excludeId ? "AND id <> $1::uuid" : ""}
      ORDER BY full_path`,
    excludeId ? [excludeId] : [],
  );
  return rows.map((row) => ({ id: row.id, fullPath: row.full_path, title: row.title }));
}

/** Düğümün parent zincirini (kök→parent sırasıyla) döner. Cycle koruması için. */
export async function getAncestorIds(id: string): Promise<string[]> {
  const { rows } = await pool.query<{ id: string }>(
    `WITH RECURSIVE ancestors AS (
        SELECT id, parent_id FROM pages WHERE id = $1::uuid
        UNION ALL
        SELECT p.id, p.parent_id
          FROM pages p
          JOIN ancestors a ON p.id = a.parent_id
      )
      SELECT id::text FROM ancestors WHERE id <> $1::uuid`,
    [id],
  );
  return rows.map((row) => row.id);
}

/** Bir düğümün tüm torunlarını döner (path propagation için). */
export async function collectDescendants(
  id: string,
  db: { query: (text: string, values?: unknown[]) => Promise<{ rows: Array<{ id: string; full_path: string | null; kind: string }> }> } = pool,
): Promise<Array<{ id: string; fullPath: string; kind: string }>> {
  const { rows } = await db.query(
    `WITH RECURSIVE subtree AS (
        SELECT id, parent_id, full_path, kind FROM pages WHERE parent_id = $1::uuid
        UNION ALL
        SELECT p.id, p.parent_id, p.full_path, p.kind
          FROM pages p
          JOIN subtree s ON p.parent_id = s.id
      )
      SELECT id::text, full_path, kind FROM subtree`,
    [id],
  );
  return rows.map((row: { id: string; full_path: string | null; kind: string }) => ({
    id: row.id,
    fullPath: row.full_path ?? "",
    // Kanonik uzantı KARARI türe göre değişir: `custom` → `.html`,
    // `service`/`location` → uzantısız. Torun yeniden yazımında bu lazımdır.
    kind: row.kind,
  }));
}

/** Aynı full_path başka aktif düğümde var mı? */
export async function isFullPathTaken(
  fullPath: string,
  exceptId?: string,
  db: { query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }> } = pool,
): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM pages
      WHERE full_path = $1 AND is_deleted = FALSE
        ${exceptId ? "AND id <> $2::uuid" : ""}
      LIMIT 1`,
    exceptId ? [fullPath, exceptId] : [fullPath],
  );
  return rows.length > 0;
}

/** Sibling'ler arasında yeni sort_order (max+1). */
export async function nextSortOrder(parentId: string | null): Promise<number> {
  const { rows } = await pool.query<{ next: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
       FROM pages
      WHERE kind = $1
        AND is_deleted = FALSE
        AND ${parentId ? "parent_id = $2::uuid" : "parent_id IS NULL"}`,
    parentId ? [TREE_KIND, parentId] : [TREE_KIND],
  );
  return rows[0]?.next ?? 0;
}
