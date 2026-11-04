/**
 * content-tree.ts — Esnek `full_path` tabanlı içerik ağacı çözücüsü (Aşama 6).
 *
 * AMAÇ: WordPress benzeri sınırsız kategori/sayfa hiyerarşisi. Gelen slug
 * dizisi tek bir `full_path`'e indirgenir ve `pages` ağacında TEK sorguyla
 * aranır. Eşleşen düğüm bir `category` ise alt düğümleri de döner.
 *
 * Kaynak: `pages` — `TREE_SERVABLE_SQL_FILTER` (`kind='custom'` + hizmet
 * konsolidasyonundaki `kind='service' | 'location'` satırları). Eski
 * hizmet×konum satırları `pages.full_path`'te
 * `hizmetler/<hizmet>/<lokasyon>` olarak saklanır ve kök catch-all tarafından
 * adreslenir; hizmetler için ayrı bir route tanımı yoktur.
 *
 * KANONİK URL: tüm içerik türleri uzantısız URL kullanır. Eski `.html`
 * istekleri middleware tarafından uzantısız adrese yönlendirilir.
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
import type { HomeHeroCopy } from "@/types/common";

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
  /**
   * `pages.title_absolute` — true ise `<title>` kök şablonuna (`%s | XipSoft`)
   * sokulmaz, DB'deki metin olduğu gibi basılır. Statik çerçeve rotaları
   * (`privacy-policy` vb.) böyle yayınlanıyordu; rota silinince bu karar
   * koddan DB'ye geçer. `meta_title` içinde "|" sezgisi ayrıca çalışmaya devam
   * eder (panelden tam marka suffix'i yazılan satırlar için).
   */
  titleAbsolute: boolean;
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
  /**
   * `pages.content_i18n` ham hali: `{ [locale]: LocalizedCopy }`. Temel kolonlar
   * Türkçe'yi taşır; bu harita YALNIZCA örtüştüğü alanları ezer. Örtüşen dil
   * yoksa içerik TR olarak kalır — 5 dilin mesaj dosyalari artık DB'ye taşınırken
   * satır başına 6 kopya açılmaz (bkz. `localizeNode`).
   */
  i18n: Record<string, LocalizedCopy> | null;
}

/** Bir dilin örttüğü alanlar — hepsi opsiyonel, boş alan temel kolonu bırakır. */
export interface LocalizedCopy {
  title?: string;
  h1Title?: string;
  metaTitle?: string;
  metaDescription?: string;
  markdownContent?: string;
  renderedHtml?: string;
  ogImageUrl?: string;
  /**
   * Dil bazlı JSON-LD. Statik çerçeve şemaları `t("title")` ile üretiliyordu
   * (WebPage.name o dilin başlığı); tek `schema_markup` kolonu TR taşır, bu alan
   * diğer dillerde onun yerini alır — aksi halde EN sayfasında TR şema basılır.
   */
  schemaMarkup?: Record<string, unknown>[];
  hero?: Partial<HomeHeroCopy>;
  sections?: Record<string, unknown>;
  faqs?: Array<{ question: string; answer: string }>;
}

/**
 * Temel dil: `pages` kolonları her zaman bu dilin metnini taşır
 * (`content_i18n` yalnızca diğer locale'leri tutar).
 */
export const BASE_LOCALE = "tr";

/**
 * İsteğin dilini önbellekteki ham düğüme uygular.
 *
 * Neden okuma SQL'inde DEĞİL de burada: `resolveContentPath` sonucu yol başına
 * cache'lenir (`content-path:{fullPath}` + Redis L1/L2). Locale'i SQL'e sokmak
 * aynı sayfanın 6 kopyasını ayrı cache anahtarına yazardı (Neon + Upstash yükü
 * 6×). Bu fonksiyon saf ve ucuz: cache paylaşımlı kalır, dil isteğe göre çözülür.
 *
 * Temel dil her zaman kolonlarda: bu yüzden `BASE_LOCALE` için kopya uygulanmaz.
 */
export function localizeNode(node: ContentTreeNode, locale: string): ContentTreeNode {
  if (!node.i18n || locale === BASE_LOCALE) return node;
  const copy = node.i18n[locale];
  if (!copy) return node;
  return {
    ...node,
    title: clean(copy.title) ?? node.title,
    h1Title: clean(copy.h1Title) ?? node.h1Title,
    metaTitle: clean(copy.metaTitle) ?? node.metaTitle,
    metaDescription: clean(copy.metaDescription) ?? node.metaDescription,
    markdownContent: clean(copy.markdownContent) ?? node.markdownContent,
    renderedHtml: clean(copy.renderedHtml) ?? node.renderedHtml,
    ogImageUrl: clean(copy.ogImageUrl) ?? node.ogImageUrl,
    schemaMarkup:
      Array.isArray(copy.schemaMarkup) && copy.schemaMarkup.length > 0
        ? copy.schemaMarkup
        : node.schemaMarkup,
  };
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Temel dil metni kolonlardan, ek sayfa alanları ise content_i18n'den gelir. */
function parseI18n(raw: unknown): Record<string, LocalizedCopy> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return parseI18n(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, LocalizedCopy> = {};
  for (const [locale, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const copy = value as LocalizedCopy;
      if (locale === BASE_LOCALE) {
        const baseExtras: LocalizedCopy = {};
        if (copy.hero && typeof copy.hero === "object" && !Array.isArray(copy.hero)) {
          baseExtras.hero = copy.hero;
        }
        if (copy.sections && typeof copy.sections === "object" && !Array.isArray(copy.sections)) {
          baseExtras.sections = copy.sections;
        }
        if (Array.isArray(copy.faqs)) baseExtras.faqs = copy.faqs;
        if (Object.keys(baseExtras).length > 0) out[locale] = baseExtras;
      } else {
        out[locale] = copy;
      }
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export interface ContentTreeResult {
  node: ContentTreeNode;
  /** Yalnızca `nodeType === 'category'` için dolu. */
  children: ContentTreeNode[];
}

/**
 * A node's canonical extensionless URL is generated by
 * `content-path.canonicalPathForNode`.
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
  title_absolute: boolean | null;
  meta_description: string | null;
  markdown_content: string | null;
  rendered_html: string | null;
  og_image_url: string | null;
  robots: string | null;
  is_indexable: boolean;
  schema_markup: Record<string, unknown> | unknown[] | string | null;
  content_i18n: Record<string, LocalizedCopy> | string | null;
  status: string;
  sort_order: number;
  updated_at: string | null;
}

const NODE_COLUMNS = `
  id::text, parent_id::text, node_type, kind, slug, full_path, title, h1_title,
  meta_title, title_absolute, meta_description, markdown_content, rendered_html,
  og_image_url, robots, is_indexable, schema_markup, content_i18n, status, sort_order,
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
    titleAbsolute: row.title_absolute === true,
    metaDescription: row.meta_description,
    markdownContent: row.markdown_content,
    renderedHtml: row.rendered_html,
    ogImageUrl: row.og_image_url,
    robots: row.robots,
    isIndexable: row.is_indexable,
    schemaMarkup: toSchemaMarkup(row.schema_markup),
    i18n: parseI18n(row.content_i18n),
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
 *
 * `locale` SONUÇ üzerinde uygulanır (cache locale'den bağımsız): `tr` temel
 * kolonlar demek olduğundan varsayılandır.
 */
export async function resolveContentPath(
  slugArray: string[],
  locale = BASE_LOCALE,
): Promise<ContentTreeResult | null> {
  const fullPath = normalizeContentPath(slugArray);
  if (!fullPath) return null;

  const result = await withPageCache(pageCacheKey("tree", fullPath), () =>
    unstable_cache(
      () => queryContentNode(fullPath),
      ["content-tree-v3", fullPath],
      { revalidate: 300, tags: ["content-tree", `content-path:${fullPath}`] },
    )(),
  );
  if (!result) return null;
  return {
    node: localizeNode(result.node, locale),
    children: result.children.map((child) => localizeNode(child, locale)),
  };
}
