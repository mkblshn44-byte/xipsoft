"use server";

/**
 * admin-content-tree-actions.ts — Hiyerarşik içerik ağacı (kategori/sayfa)
 * yönetimi server action'ları (Aşama 6.5).
 *
 * Kaynak: `pages` (kind = 'custom'). Tüm action'lar `requireAdminAction()` ile
 * korunur. Yol değişikliğinde torunların `full_path`'leri yeniden hesaplanır,
 * eski URL'ler için kalıcı yönlendirme (301) üretilir ve ilgili önbellekler
 * (`content-tree`, `sitemap`) geçersiz kılınır.
 *
 * KANONİK URL: `<full_path>.html`. Uzantısız ve `.html` eski adresler için
 * ayrı ayrı 301 kaydı oluşturulur.
 */
import { revalidatePath, revalidateTag } from "next/cache";
import type { PoolClient } from "pg";
import pool from "@/lib/db/pool";
import { invalidatePageCaches, invalidateServiceCaches } from "@/lib/redis/page-cache";
import { requireAdminAction } from "@/lib/api-guard";
import { SITE_URL } from "@/lib/site-url";
import { treeNodeCanonicalPath, canonicalPathForNode } from "@/lib/content-tree";
import { hashPageContent } from "@/lib/pages/hash";
import { parseSchemaMarkupInput } from "@/lib/schema-markup";
import { invalidateRedirectCache, upsertSlugRedirect } from "@/lib/redirect-handler";
import { deactivateRedirectsForPublishedPaths } from "@/lib/seo-conflict-guard";
import {
  TREE_KIND,
  TREE_STATUSES,
  type TreeStatus,
  type TreeNodeType,
  type AdminTreeNode,
  type AdminServiceData,
  type TreeParentOption,
  normalizeSlugInput,
  validateFullPath,
  buildFullPath,
  listTreeNodes,
  getTreeNode,
  listCategoryOptions,
  getAncestorIds,
  collectDescendants,
  isFullPathTaken,
  nextSortOrder,
} from "@/lib/content-tree-admin";

const MAX_SEGMENTS = 32;

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Okuma (client tarafı) ────────────────────────────────────────────────────

export async function listContentTree(): Promise<{ nodes: AdminTreeNode[]; error: string | null }> {
  try {
    await requireAdminAction();
    return { nodes: await listTreeNodes(true), error: null };
  } catch (error) {
    return { nodes: [], error: error instanceof Error ? error.message : "Ağaç yüklenemedi" };
  }
}

export async function getContentNode(id: string): Promise<{ node: AdminTreeNode | null; error: string | null }> {
  try {
    await requireAdminAction();
    return { node: await getTreeNode(id), error: null };
  } catch (error) {
    return { node: null, error: error instanceof Error ? error.message : "Düğüm alınamadı" };
  }
}

export async function listParentOptions(excludeId?: string): Promise<{ options: TreeParentOption[]; error: string | null }> {
  try {
    await requireAdminAction();
    return { options: await listCategoryOptions(excludeId), error: null };
  } catch (error) {
    return { options: [], error: error instanceof Error ? error.message : "Kategoriler alınamadı" };
  }
}

// ── Girdi tipleri ────────────────────────────────────────────────────────────

export interface ContentNodeInput {
  parentId?: string | null;
  nodeType?: TreeNodeType;
  slug?: string;
  title?: string;
  h1Title?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  markdownContent?: string | null;
  renderedHtml?: string | null;
  ogImageUrl?: string | null;
  robots?: string | null;
  isIndexable?: boolean;
  /** Ham JSON-LD metni (panel textarea'sından); `null`/boş = kolonu temizle. */
  schemaMarkup?: string | null;
  sortOrder?: number;
  status?: TreeStatus;
  serviceData?: Partial<AdminServiceData> | null;
}

interface ResolvedParent {
  id: string | null;
  fullPath: string | null;
}

function assertStatus(value: unknown): TreeStatus {
  if (typeof value === "string" && (TREE_STATUSES as ReadonlyArray<string>).includes(value)) {
    return value as TreeStatus;
  }
  throw new Error("Geçersiz durum değeri.");
}

function cleanText(value: unknown, max: number): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, max);
}

/** Parent'ı (kategori) doğrulayıp yolunu döner. */
async function resolveParent(
  parentId: string | null | undefined,
  db: PoolClient | typeof pool,
): Promise<ResolvedParent> {
  if (!parentId) return { id: null, fullPath: null };
  const { rows } = await db.query<{ id: string; full_path: string | null; node_type: string }>(
    `SELECT id::text, full_path, node_type
       FROM pages
      WHERE id = $1::uuid AND (kind = 'custom' OR kind = 'service') AND is_deleted = FALSE
      LIMIT 1`,
    [parentId],
  );
  const parent = rows[0];
  if (!parent) throw new Error("Seçilen üst kategori bulunamadı.");
  if (parent.node_type !== "category") {
    throw new Error("Yalnızca bir kategori düğümü üst öğe olabilir.");
  }
  return { id: parent.id, fullPath: parent.full_path ?? "" };
}

/**
 * Bir yol değişimini kalıcı yönlendirmeye bağlar.
 *
 * `kind` ŞART: kanonik uzantı türden türe değişir (`custom` → `.html`,
 * `service`/`location` → uzantısız). Eskiden hedef daima `.html` üretiliyordu;
 * bir hizmet/konum düğümü taşındığında yönlendirme hedefi ile sayfanın kendi
 * kanoniği ayrışıyordu — middleware uzantısız listede olduğu için `.html`i
 * söker, rota geri ekler → bot iki hop görür, canonical ile 301 hedefi
 * birbirinden farklı olurdu.
 */
async function recordPathChange(
  client: PoolClient,
  oldPath: string,
  newPath: string,
  kind: string,
): Promise<void> {
  if (!oldPath || oldPath === newPath) return;
  const target = canonicalPathForNode({ fullPath: newPath, kind });
  const sources = new Set([
    canonicalPathForNode({ fullPath: oldPath, kind }),
    `/${oldPath}`,
  ]);
  for (const source of sources) {
    await upsertSlugRedirect(client, source, target);
  }
}

async function revalidateTreePaths(paths: Array<string | null | undefined>): Promise<void> {
  revalidateTag("content-tree");
  revalidateTag("sitemap");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/cms/content-tree");
  const seen = new Set<string>();
  for (const raw of paths) {
    if (!raw) continue;
    const path = raw.replace(/^\/+/, "");
    if (!path || seen.has(path)) continue;
    seen.add(path);
    revalidatePath(treeNodeCanonicalPath(path));
    revalidatePath(`/${path}`);
  }
  // Redis sayfa önbelleği: Next'in tag/pool cache'i tek süreçlik; Redis tüm
  // instance'lar + CDN arkası için ortak katmandır. Slug + sitemap birlikte.
  await invalidatePageCaches({ slugs: [...seen], sitemap: true });
  // Aynı form `services` satırını da güncelleyebiliyor → hizmet önbelleği de düşer.
  await invalidateServiceCaches();
  // Çakışma koruması: yayındaki yolun eski WordPress redirect'i gölge olmasın +
  // middleware'in ağaç sahipliği snapshot'ı TTL beklemeden tazelensin.
  await deactivateRedirectsForPublishedPaths(paths);
}

// ── Oluşturma ────────────────────────────────────────────────────────────────

export async function createContentNode(input: ContentNodeInput): Promise<ActionResult<AdminTreeNode>> {
  try {
    await requireAdminAction();

    const title = cleanText(input.title, 300);
    if (!title) return { success: false, error: "Başlık zorunludur." };

    const nodeType: TreeNodeType = input.nodeType === "category" ? "category" : "page";
    const slug = normalizeSlugInput(input.slug || title);
    if (!slug) return { success: false, error: "Geçerli bir slug üretilemedi." };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const parent = await resolveParent(input.parentId, client);
      const fullPath = buildFullPath(parent.fullPath, slug);

      if (fullPath.split("/").length > MAX_SEGMENTS) {
        throw new Error("URL yolu izin verilen derinlikten daha fazla segment içeriyor.");
      }
      const pathError = validateFullPath(fullPath);
      if (pathError) throw new Error(pathError);

      if (await isFullPathTaken(fullPath, undefined, client)) {
        throw new Error(`"${fullPath}" yolu zaten kullanımda; çakışma engellendi.`);
      }

      const status = input.status ? assertStatus(input.status) : "draft";
      const sortOrder = Number.isFinite(input.sortOrder)
        ? Number(input.sortOrder)
        : await nextSortOrder(parent.id);
      const isIndexable = input.isIndexable ?? nodeType === "category";
      const markdown = input.markdownContent ?? null;
      const renderedHtml = input.renderedHtml ?? null;

      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO pages
           (parent_id, kind, node_type, page_type, slug, full_path, title, h1_title,
            meta_title, meta_description, markdown_content, rendered_html,
            og_image_url, robots, is_indexable, canonical_url, status, sort_order,
            content_hash, published_at, schema_markup)
         VALUES ($1::uuid, $2, $3, $3, $4, $5, $6, $7,
                 $8, $9, $10, $11,
                 $12, $13, $14, $15, $16, $17,
                 $18, $19, $20::jsonb)
         RETURNING id::text`,
        [
          parent.id, TREE_KIND, nodeType, slug, fullPath, title,
          cleanText(input.h1Title, 300), cleanText(input.metaTitle, 320), cleanText(input.metaDescription, 500),
          markdown, renderedHtml, cleanText(input.ogImageUrl, 1000), cleanText(input.robots, 100),
          isIndexable, `${SITE_URL}${treeNodeCanonicalPath(fullPath)}`, status, sortOrder,
          markdown ? hashPageContent(markdown) : null, status === "published" ? new Date() : null,
          parseSchemaMarkupInput(input.schemaMarkup),
        ],
      );
      await client.query("COMMIT");

      await revalidateTreePaths([fullPath]);
      const node = await getTreeNode(rows[0].id);
      return { success: true, data: node as AdminTreeNode };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Düğüm oluşturulamadı" };
  }
}

// ── Güncelleme ───────────────────────────────────────────────────────────────

export async function updateContentNode(
  id: string,
  input: ContentNodeInput,
): Promise<ActionResult<AdminTreeNode>> {
  try {
    await requireAdminAction();
    if (!id) return { success: false, error: "Düğüm kimliği zorunludur." };

    const client = await pool.connect();
    let affectedPaths: string[] = [];
    try {
      await client.query("BEGIN");

      const currentRes = await client.query<{
        id: string;
        parent_id: string | null;
        node_type: TreeNodeType;
        slug: string;
        full_path: string | null;
        status: string;
        kind: string;
        service_id: number | null;
        schema_markup: unknown;
      }>(
        `SELECT id::text, parent_id::text, node_type, slug, full_path, status, kind, service_id, schema_markup
           FROM pages
          WHERE id = $1::uuid AND is_deleted = FALSE
          FOR UPDATE`,
        [id],
      );
      const current = currentRes.rows[0];
      if (!current) throw new Error("Düğüm bulunamadı.");

      const oldFullPath = current.full_path ?? current.slug;
      const nodeType: TreeNodeType = input.nodeType
        ? input.nodeType === "category" ? "category" : "page"
        : current.node_type;

      const nextParentId = input.parentId === undefined ? current.parent_id : input.parentId;
      if (nextParentId === id) throw new Error("Bir düğüm kendi üst öğesi olamaz.");

      const parent = await resolveParent(nextParentId, client);

      const title = cleanText(input.title, 300) ?? undefined;
      const rawSlug = input.slug !== undefined ? input.slug : current.slug;
      const slug = normalizeSlugInput(rawSlug);
      if (!slug) throw new Error("Geçerli bir slug üretilemedi.");

      const newFullPath = buildFullPath(parent.fullPath, slug);

      if (newFullPath.split("/").length > MAX_SEGMENTS) {
        throw new Error("URL yolu izin verilen derinlikten daha fazla segment içeriyor.");
      }
      const pathError = validateFullPath(newFullPath);
      if (pathError) throw new Error(pathError);

      // Döngü koruması (uygulama katmanı; DB trigger'ı da ikinci savunma hattı).
      if (parent.id) {
        const ancestors = await getAncestorIds(id);
        if (ancestors.includes(parent.id)) {
          throw new Error("Üst öğe bu düğümün alt ağacından seçilemez (çevrim engellendi).");
        }
      }

      if (newFullPath !== oldFullPath && await isFullPathTaken(newFullPath, id, client)) {
        throw new Error(`"${newFullPath}" yolu zaten kullanımda; çakışma engellendi.`);
      }

      const pathChanged = newFullPath !== oldFullPath;
      // Torunlar yol değişiminden ÖNCE toplanır (eski yollarıyla).
      const descendants = pathChanged ? await collectDescendants(id, client) : [];

      const status = input.status ? assertStatus(input.status) : current.status;
      const markdown = input.markdownContent === undefined ? undefined : input.markdownContent;
      const renderedHtml = input.renderedHtml === undefined ? undefined : input.renderedHtml;

      await client.query(
        `UPDATE pages
            SET parent_id = $2::uuid,
                node_type = $3,
                page_type = $3,
                slug = $4,
                full_path = $5,
                title = COALESCE($6, title),
                h1_title = $7,
                meta_title = $8,
                meta_description = $9,
                markdown_content = $10,
                rendered_html = $11,
                og_image_url = $12,
                robots = $13,
                is_indexable = COALESCE($14, is_indexable),
                sort_order = COALESCE($15, sort_order),
                canonical_url = $16,
                status = $17,
                content_hash = CASE WHEN $10 IS NULL THEN content_hash ELSE $18 END,
                schema_markup = $19::jsonb,
                published_at = CASE WHEN $17 = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END,
                updated_at = NOW()
          WHERE id = $1::uuid`,
        [
          id, parent.id, nodeType, slug, newFullPath,
          title, cleanText(input.h1Title, 300), cleanText(input.metaTitle, 320), cleanText(input.metaDescription, 500),
          markdown ?? null, renderedHtml ?? null,
          input.ogImageUrl === undefined ? null : cleanText(input.ogImageUrl, 1000),
          input.robots === undefined ? null : cleanText(input.robots, 100),
          input.isIndexable === undefined ? null : input.isIndexable,
          Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : null,
          `${SITE_URL}${canonicalPathForNode({ fullPath: newFullPath, kind: current.kind })}`,
          status,
          markdown ? hashPageContent(markdown) : null,
          // Alan formda hiç gönderilmediyse (NULL değil `undefined`) mevcut değer korunur.
          input.schemaMarkup === undefined
            ? current.schema_markup ?? null
            : parseSchemaMarkupInput(input.schemaMarkup),
        ],
      );

      // Torun yollarını yeni önekle güncelle + eski→yeni 301 üret.
      await recordPathChange(client, oldFullPath, newFullPath, current.kind);
      for (const descendant of descendants) {
        if (!descendant.fullPath.startsWith(`${oldFullPath}/`)) continue;
        const updatedPath = `${newFullPath}${descendant.fullPath.slice(oldFullPath.length)}`;
        await client.query(
          `UPDATE pages SET full_path = $2, canonical_url = $3, updated_at = NOW() WHERE id = $1::uuid`,
          [
            descendant.id,
            updatedPath,
            `${SITE_URL}${canonicalPathForNode({ fullPath: updatedPath, kind: descendant.kind })}`,
          ],
        );
        await recordPathChange(client, descendant.fullPath, updatedPath, descendant.kind);
        affectedPaths.push(updatedPath);
      }

      // Eğer düğüm bağlı bir hizmet içeriyorsa veya serviceData gönderildiyse services tablosunu güncelle
      if (input.serviceData || current.service_id || current.kind === "service") {
        const s = input.serviceData;
        const svcId = current.service_id || s?.id;
        if (svcId && s) {
          await client.query(
            `UPDATE services
                SET subtitle = COALESCE($2, subtitle),
                    badge = COALESCE($3, badge),
                    badge_icon = COALESCE($4, badge_icon),
                    badge_gradient = COALESCE($5, badge_gradient),
                    badge_color = COALESCE($6, badge_color),
                    title_gradient = COALESCE($7, title_gradient),
                    hero_cta = COALESCE($8, hero_cta),
                    stats = CASE WHEN $9::text IS NULL THEN stats ELSE $9::jsonb END,
                    features = CASE WHEN $10::text IS NULL THEN features ELSE $10::jsonb END,
                    features_title = COALESCE($11, features_title),
                    features_desc = COALESCE($12, features_desc),
                    tech_stack = CASE WHEN $13::text IS NULL THEN tech_stack ELSE $13::jsonb END,
                    tech_title = COALESCE($14, tech_title),
                    services_tag = CASE WHEN $15::text IS NULL THEN services_tag ELSE $15::jsonb END,
                    process_title = COALESCE($16, process_title),
                    process_desc = COALESCE($17, process_desc),
                    process_steps = CASE WHEN $18::text IS NULL THEN process_steps ELSE $18::jsonb END,
                    packages = CASE WHEN $19::text IS NULL THEN packages ELSE $19::jsonb END,
                    packages_title = COALESCE($20, packages_title),
                    packages_desc = COALESCE($21, packages_desc),
                    cta_title = COALESCE($22, cta_title),
                    cta_desc = COALESCE($23, cta_desc),
                    cta_btn = COALESCE($24, cta_btn),
                    micro_services = CASE WHEN $25::text IS NULL THEN micro_services ELSE $25::jsonb END,
                    micro_title = COALESCE($26, micro_title),
                    micro_desc = COALESCE($27, micro_desc),
                    faq_title = COALESCE($28, faq_title),
                    faq_items = CASE WHEN $29::text IS NULL THEN faq_items ELSE $29::jsonb END,
                    guide = CASE WHEN $30::text IS NULL THEN guide ELSE $30::jsonb END,
                    title = COALESCE($31, title),
                    slug = COALESCE($32, slug),
                    is_active = COALESCE($33, is_active),
                    sort_order = COALESCE($34, sort_order),
                    h1_title = COALESCE($35, h1_title),
                    meta_title = COALESCE($36, meta_title),
                    meta_description = COALESCE($37, meta_description),
                    updated_at = NOW()
              WHERE id = $1`,
            [
              svcId,
              s.subtitle ?? null,
              s.badge ?? null,
              s.badge_icon ?? null,
              s.badge_gradient ?? null,
              s.badge_color ?? null,
              s.title_gradient ?? null,
              s.hero_cta ?? null,
              s.stats ? JSON.stringify(s.stats) : null,
              s.features ? JSON.stringify(s.features) : null,
              s.features_title ?? null,
              s.features_desc ?? null,
              s.tech_stack ? JSON.stringify(s.tech_stack) : null,
              s.tech_title ?? null,
              s.services_tag ? JSON.stringify(s.services_tag) : null,
              s.process_title ?? null,
              s.process_desc ?? null,
              s.process_steps ? JSON.stringify(s.process_steps) : null,
              s.packages ? JSON.stringify(s.packages) : null,
              s.packages_title ?? null,
              s.packages_desc ?? null,
              s.cta_title ?? null,
              s.cta_desc ?? null,
              s.cta_btn ?? null,
              s.micro_services ? JSON.stringify(s.micro_services) : null,
              s.micro_title ?? null,
              s.micro_desc ?? null,
              s.faq_title ?? null,
              s.faq_items ? JSON.stringify(s.faq_items) : null,
              s.guide ? JSON.stringify(s.guide) : null,
              title ?? null,
              slug,
              status === "published",
              Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : null,
              cleanText(input.h1Title, 300),
              cleanText(input.metaTitle, 320),
              cleanText(input.metaDescription, 500),
            ],
          );
        }
      }

      await client.query("COMMIT");
      affectedPaths = [oldFullPath, newFullPath, ...affectedPaths];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    await revalidateTreePaths(affectedPaths);
    for (const path of affectedPaths) invalidateRedirectCache(`/${path}`);
    const node = await getTreeNode(id);
    return { success: true, data: node as AdminTreeNode };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Düğüm güncellenemedi" };
  }
}

// ── Sıralama / silme / durum ─────────────────────────────────────────────────

export async function reorderContentNode(id: string, direction: "up" | "down"): Promise<ActionResult<null>> {
  try {
    await requireAdminAction();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const currentRes = await client.query<{ parent_id: string | null; sort_order: number }>(
        `SELECT parent_id::text, sort_order FROM pages WHERE id = $1::uuid FOR UPDATE`,
        [id],
      );
      const current = currentRes.rows[0];
      if (!current) throw new Error("Düğüm bulunamadı.");

      const siblingsRes = await client.query<{ id: string; sort_order: number }>(
        `SELECT id::text, sort_order FROM pages
          WHERE is_deleted = FALSE
            AND ${current.parent_id ? "parent_id = $1::uuid" : "parent_id IS NULL"}
          ORDER BY sort_order, title`,
        current.parent_id ? [current.parent_id] : [],
      );
      const siblings = siblingsRes.rows;
      const index = siblings.findIndex((sibling) => sibling.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
        await client.query("ROLLBACK");
        return { success: false, error: "Bu yönde taşınamaz." };
      }

      const neighbor = siblings[targetIndex];
      // Sort_order'ları normalize et (0..n-1), sonra ikisini yer değiştir.
      for (let i = 0; i < siblings.length; i += 1) {
        await client.query(`UPDATE pages SET sort_order = $2 WHERE id = $1::uuid`, [siblings[i].id, i]);
      }
      await client.query(`UPDATE pages SET sort_order = $2 WHERE id = $1::uuid`, [id, targetIndex]);
      await client.query(`UPDATE pages SET sort_order = $2 WHERE id = $1::uuid`, [neighbor.id, index]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await revalidateTreePaths([]);
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Sıralama değiştirilemedi" };
  }
}

export async function deleteContentNode(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdminAction();
    const client = await pool.connect();
    let paths: string[] = [];
    try {
      await client.query("BEGIN");
      const currentRes = await client.query<{ full_path: string | null }>(
        `SELECT full_path FROM pages WHERE id = $1::uuid AND is_deleted = FALSE FOR UPDATE`,
        [id],
      );
      if (!currentRes.rows[0]) throw new Error("Düğüm bulunamadı.");
      paths = [currentRes.rows[0].full_path ?? ""];
      const descendants = await collectDescendants(id, client);

      // Alt ağaçla birlikte soft-delete
      await client.query(
        `UPDATE pages SET is_deleted = TRUE, deleted_at = NOW(), status = 'paused', updated_at = NOW()
          WHERE id = $1::uuid`,
        [id],
      );
      if (descendants.length) {
        await client.query(
          `UPDATE pages SET is_deleted = TRUE, deleted_at = NOW(), status = 'paused', updated_at = NOW()
            WHERE id = ANY($1::uuid[])`,
          [descendants.map((descendant) => descendant.id)],
        );
        paths = [...paths, ...descendants.map((descendant) => descendant.fullPath)];
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await revalidateTreePaths(paths);
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Düğüm silinemedi" };
  }
}

export async function restoreContentNode(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdminAction();
    const { rows } = await pool.query<{ full_path: string | null }>(
      `UPDATE pages
          SET is_deleted = FALSE, deleted_at = NULL, status = 'draft', updated_at = NOW()
        WHERE id = $1::uuid AND is_deleted = TRUE
        RETURNING full_path`,
      [id],
    );
    if (!rows[0]) return { success: false, error: "Düğüm bulunamadı veya zaten aktif." };
    await revalidateTreePaths([rows[0].full_path ?? ""]);
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Düğüm geri yüklenemedi" };
  }
}

export async function setContentNodeStatus(id: string, status: TreeStatus): Promise<ActionResult<null>> {
  try {
    await requireAdminAction();
    const valid = assertStatus(status);
    const { rows } = await pool.query<{ full_path: string | null }>(
      `UPDATE pages
          SET status = $2,
              published_at = CASE WHEN $2 = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END,
              updated_at = NOW()
        WHERE id = $1::uuid AND is_deleted = FALSE
        RETURNING full_path`,
      [id, valid],
    );
    if (!rows[0]) return { success: false, error: "Düğüm bulunamadı." };
    await revalidateTreePaths([rows[0].full_path ?? ""]);
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Durum güncellenemedi" };
  }
}
