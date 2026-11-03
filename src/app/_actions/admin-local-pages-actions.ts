"use server";

import pool from "@/lib/db/pool";
import { requireAdminAction } from "@/lib/api-guard";
import { revalidatePath, revalidateTag } from "next/cache";
import { hashPageContent } from "@/lib/pages/hash";
import { CENTRAL_LOCATION_COLUMNS } from "@/lib/pages/sql";
import { SITE_URL } from "@/lib/site-url";
// Otomatik yerel üretim motorları iptal edildi.
import {
  performSEOAudit,
  type PageAuditData
} from "@/lib/seo/page-audit";
import { saveSEOAudit } from "@/lib/seo/audit-store";
import { invalidateRedirectCache, upsertSlugRedirect } from "@/lib/redirect-handler";
import { servicePath, locationTreeFullPath } from "@/lib/content-path";
import { isFullPathTaken } from "@/lib/content-tree-admin";
import { invalidatePageCaches } from "@/lib/redis/page-cache";
import { slugify } from "@/utils/slugify";

/**
 * Redis sayfa önbelleğini Next tarafındaki tag/pool geçersiz kılmayla birlikte
 * düşürür. Next önbelleği tek süreçlik olduğu için panel değişikliği diğer
 * instance'lara ve CDN'e ancak buradan geçerse anında yansır.
 */
async function dropPageCache(...slugs: Array<string | null | undefined>): Promise<void> {
  await invalidatePageCaches({ slugs, sitemap: true });
}


export interface LocalPageFilters {
  locationType?: string;
  locationId?: string;
  serviceId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listPages(filters: LocalPageFilters = {}) {
  try {
    await requireAdminAction();
    const values: unknown[] = [];
    const where = ["p.is_deleted = FALSE"];
    const add = (value: unknown) => { values.push(value); return `$${values.length}`; };

    if (filters.locationType) where.push(`l.location_type = ${add(filters.locationType)}`);
    if (filters.locationId) where.push(`p.location_id = ${add(filters.locationId)}::uuid`);
    if (filters.serviceId) where.push(`p.service_id = ${add(filters.serviceId)}`);
    if (filters.status) where.push(`p.status = ${add(filters.status)}`);
    if (filters.search) {
      const term = `%${filters.search.trim()}%`;
      const param = add(term);
      where.push(`(p.title ILIKE ${param} OR p.slug ILIKE ${param})`);
    }

    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
    const offset = Math.max(filters.offset ?? 0, 0);
    const limitParam = add(limit);
    const offsetParam = add(offset);
    const result = await pool.query(
      `SELECT p.id::text, p.title, p.slug, p.status, p.source_type,
              p.meta_title, p.updated_at, p.published_at,
              s.id::text AS service_id, s.title AS service_title,
              l.id::text AS location_id, l.name AS location_name,
              l.location_type, parent.name AS parent_location_name
       FROM pages p
       JOIN services s ON s.id = p.service_id
       JOIN locations l ON l.id = p.location_id
       LEFT JOIN locations parent ON parent.id = l.parent_id
       WHERE ${where.join(" AND ")}
       ORDER BY p.updated_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values,
    );
    return { success: true, pages: result.rows, error: null };
  } catch (error) {
    console.error("listPages error:", error);
    return { success: false, pages: [], error: error instanceof Error ? error.message : "Sayfalar alınamadı" };
  }
}

export async function createPage(input: {
  serviceId: string;
  locationId: string;
  markdownContent: string;
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  status?: "draft" | "review" | "published" | "paused";
}) {
  try {
    await requireAdminAction();
    if (!input.serviceId || !input.locationId || !input.markdownContent.trim()) {
      return { success: false, error: "Hizmet, konum ve Markdown içeriği zorunludur" };
    }

    const context = await pool.query<any>(
      `SELECT
              ${CENTRAL_LOCATION_COLUMNS}
       FROM services s
       JOIN locations l ON l.id = $2::uuid AND l.is_active = TRUE
       LEFT JOIN locations parent ON parent.id = l.parent_id
       WHERE s.id = $1::int AND s.row_type = 'main' AND s.is_active = TRUE LIMIT 1`,
      [input.serviceId, input.locationId],
    );
    const location = context.rows[0];
    if (!location) return { success: false, error: "Aktif hizmet veya konum bulunamadı" };

    const locationSlug = location.locationSlug ?? location.locationName.toLowerCase().replace(/\s+/g, "-");
    const serviceSlug = location.serviceSlug ?? "hizmet";
    const slug = `${serviceSlug}/${locationSlug}`;
    const fullPath = locationTreeFullPath(slug);
    if (await isFullPathTaken(fullPath)) {
      return { success: false, error: `"${fullPath}" yolu ağaçta zaten kullanımda` };
    }
    const canonicalUrl = `${SITE_URL}${servicePath(slug)}`;
    const title = input.title?.trim() || `${location.serviceTitle} ${location.locationName}`;
    const metaTitle = input.metaTitle?.trim() || `${title} | XipSoft`;
    const metaDescription = input.metaDescription?.trim() || `${location.locationName} için ${location.serviceTitle}`;
    const status = input.status ?? "review";
    const result = await pool.query(
      `INSERT INTO pages
         (service_id, location_id, slug, full_path, kind, node_type,
          title, markdown_content, meta_title, meta_description,
          canonical_url, status, content_hash, published_at)
       VALUES ($1::int, $2::uuid, $3, $12, 'location', 'page',
               $4, $5, $6, $7,
               $8, $9, $10, $11)
       RETURNING id::text, slug, status`,
      [input.serviceId, input.locationId, slug, title, input.markdownContent, metaTitle, metaDescription,
        canonicalUrl, status, hashPageContent(input.markdownContent),
        status === "published" ? new Date() : null, fullPath],
    );
    const pageId = result.rows[0]?.id;
    if (pageId) {
      // Perform SEO audit
      const auditData: PageAuditData = {
        id: pageId,
        title,
        markdownContent: input.markdownContent,
        metaTitle,
        metaDescription,
        canonicalUrl,
        serviceTitle: location.serviceTitle,
        locationName: location.locationName,
      };
      const audit = await performSEOAudit(auditData);
      await saveSEOAudit(pageId, audit);

      revalidateTag(`local-page:${pageId}`);
      revalidateTag(`local-page:${location.serviceSlug}:${location.locationType}:${location.locationSlug}`);
    }
    revalidateTag("local-pages");
    revalidateTag("sitemap");
    revalidatePath(servicePath(slug));
    revalidatePath("/sitemap.xml");
    await dropPageCache(slug);
    return { success: true, page: result.rows[0] };
  } catch (error) {
    console.error("createPage error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Sayfa oluşturulamadı" };
  }
}

export async function getPage(id: string) {
  try {
    await requireAdminAction();
    const result = await pool.query(
      `SELECT p.*, s.title AS service_title, l.name AS location_name,
              l.slug AS location_slug, l.location_type, parent.name AS parent_location_name
       FROM pages p
       JOIN services s ON s.id = p.service_id
       JOIN locations l ON l.id = p.location_id
       LEFT JOIN locations parent ON parent.id = l.parent_id
       WHERE p.id = $1::uuid
       LIMIT 1`,
      [id],
    );
    return { success: true, page: result.rows[0] ?? null, error: null };
  } catch (error) {
    return { success: false, page: null, error: error instanceof Error ? error.message : "Sayfa alınamadı" };
  }
}

export async function updatePage(input: {
  id: string;
  markdownContent: string;
  title?: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  lokalAciklama?: string;
  ozelMetaDesc?: string;
  lokalSss?: Array<{ question: string; answer: string }>;
  status?: "draft" | "review" | "published" | "paused";
}) {
  try {
    await requireAdminAction();
    if (!input.id || !input.markdownContent.trim()) {
      return { success: false, error: "Markdown içeriği zorunludur" };
    }
    if (input.lokalSss && (
      !Array.isArray(input.lokalSss) ||
      input.lokalSss.length > 30 ||
      input.lokalSss.some((item) => typeof item.question !== "string" || typeof item.answer !== "string" || item.question.length > 300 || item.answer.length > 3000)
    )) return { success: false, error: "Lokal SSS alanları geçersiz" };

    const client = await pool.connect();
    let previousSlug = "";
    let page: { id: string; slug: string; status: string } | undefined;
    try {
      await client.query("BEGIN");
      const current = await client.query<{ slug: string; service_slug: string }>(
        `SELECT p.slug, s.slug AS service_slug
         FROM pages p JOIN services s ON s.id = p.service_id
         WHERE p.id = $1::uuid AND p.is_deleted = FALSE
         FOR UPDATE OF p`,
        [input.id],
      );
      if (!current.rows[0]) {
        await client.query("ROLLBACK");
        return { success: false, error: "Sayfa bulunamadı" };
      }
      previousSlug = current.rows[0].slug;
      const nextSlug = input.slug === undefined
        ? previousSlug
        : input.slug.split("/").map((part) => slugify(part)).filter(Boolean).join("/");
      const [serviceSlug, locationSlug] = nextSlug.split("/");
      if (!serviceSlug || !locationSlug || nextSlug.split("/").length !== 2 || serviceSlug !== current.rows[0].service_slug) {
        await client.query("ROLLBACK");
        return { success: false, error: `Slug iki bölümden oluşmalı ve hizmet bölümü "${current.rows[0].service_slug}" kalmalıdır` };
      }

      const collision = await client.query(
        `SELECT 1 FROM pages WHERE slug = $1 AND id <> $2::uuid LIMIT 1`,
        [nextSlug, input.id],
      );
      if (collision.rows.length) {
        await client.query("ROLLBACK");
        return { success: false, error: "Bu slug başka bir sayfada kullanılıyor" };
      }
      if (await isFullPathTaken(locationTreeFullPath(nextSlug), input.id, client)) {
        await client.query("ROLLBACK");
        return { success: false, error: "Bu adres (full_path) ağaçta başka bir düğüm tarafından kullanılıyor" };
      }

      const result = await client.query(
        `UPDATE pages
         SET slug = $2,
             full_path = $14,
             title = COALESCE(NULLIF($3, ''), title),
             markdown_content = $4,
             meta_title = COALESCE(NULLIF($5, ''), meta_title),
             meta_description = COALESCE(NULLIF($6, ''), meta_description),
             lokal_aciklama = COALESCE($7, lokal_aciklama),
             ozel_meta_desc = COALESCE($8, ozel_meta_desc),
             lokal_sss = COALESCE($9::jsonb, lokal_sss),
             canonical_url = CASE WHEN $2 <> $10 THEN $11 ELSE canonical_url END,
             status = COALESCE($12, status),
             content_hash = $13,
             published_at = CASE WHEN $12 = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END,
             updated_at = NOW()
         WHERE id = $1::uuid AND is_deleted = FALSE
         RETURNING id::text, slug, status`,
        [input.id, nextSlug, input.title?.trim() ?? "", input.markdownContent,
          input.metaTitle?.trim() ?? "", input.metaDescription?.trim() ?? "",
          input.lokalAciklama ?? null, input.ozelMetaDesc ?? null,
          input.lokalSss === undefined ? null : JSON.stringify(input.lokalSss),
          previousSlug, `${SITE_URL}${servicePath(nextSlug)}`, input.status ?? null,
          hashPageContent(input.markdownContent), locationTreeFullPath(nextSlug)],
      );
      page = result.rows[0];

      if (previousSlug !== nextSlug) {
        await upsertSlugRedirect(client, servicePath(previousSlug), servicePath(nextSlug));
      }
      await client.query("COMMIT");
    } catch (transactionError) {
      await client.query("ROLLBACK");
      throw transactionError;
    } finally {
      client.release();
    }
    if (!page) return { success: false, error: "Sayfa güncellenemedi" };

    if (previousSlug !== page.slug) {
      invalidateRedirectCache(servicePath(previousSlug));
      invalidateRedirectCache(servicePath(page.slug));
      revalidatePath(servicePath(previousSlug));
      revalidatePath(servicePath(page.slug));
    }
    revalidateTag(`local-page:${input.id}`);
    revalidateTag("local-pages");
    revalidateTag("sitemap");
    revalidatePath("/admin/cms/local-pages");
    revalidatePath("/sitemap.xml");
    await dropPageCache(page.slug, previousSlug);
    return { success: true, page };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Sayfa güncellenemedi" };
  }
}

export async function publishPage(id: string) {
  return updatePage({ id, markdownContent: (await getPage(id)).page?.markdown_content ?? "", status: "published" });
}

export async function createGenerationJob() {
  return { success: false, dryRun: true, preview: null, job: null, error: "Otomatik yerel içerik üretimi iptal edildi (DB-only model)" };
}

export async function softDeletePage(id: string) {
  try {
    await requireAdminAction();
    const deleted = await pool.query<{ slug: string }>(
      `UPDATE pages SET is_deleted = TRUE, deleted_at = NOW(), status = 'paused', updated_at = NOW()
        WHERE id = $1::uuid RETURNING slug`,
      [id],
    );
    revalidateTag(`local-page:${id}`);
    revalidateTag("local-pages");
    revalidateTag("sitemap");
    revalidatePath("/sitemap.xml");
    revalidatePath("/admin/cms/local-pages");
    await dropPageCache(deleted.rows[0]?.slug);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Sayfa silinemedi" };
  }
}

export async function restorePage(id: string) {
  try {
    await requireAdminAction();
    const result = await pool.query(
      `UPDATE pages SET is_deleted = FALSE, deleted_at = NULL, status = 'draft', updated_at = NOW()
       WHERE id = $1::uuid AND is_deleted = TRUE
       RETURNING id::text, slug, status`,
      [id],
    );
    if (!result.rows[0]) return { success: false, error: "Sayfa bulunamadı veya zaten aktif" };
    revalidateTag(`local-page:${id}`);
    revalidateTag("local-pages");
    revalidateTag("sitemap");
    revalidatePath("/admin/cms/local-pages");
    revalidatePath("/sitemap.xml");
    await dropPageCache(result.rows[0].slug);
    return { success: true, page: result.rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Sayfa geri yüklenemedi" };
  }
}

export async function previewPage(input: {
  serviceId: string;
  locationId: string;
  markdownContent?: string;
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
}) {
  try {
    await requireAdminAction();
    if (!input.serviceId || !input.locationId) {
      return { success: false, error: "Hizmet ve konum zorunludur" };
    }

    const context = await pool.query<any>(
      `SELECT
              ${CENTRAL_LOCATION_COLUMNS}
       FROM services s
       JOIN locations l ON l.id = $2::uuid AND l.is_active = TRUE
       LEFT JOIN locations parent ON parent.id = l.parent_id
       WHERE s.id = $1 AND s.row_type = 'main' AND s.is_active = TRUE LIMIT 1`,
      [input.serviceId, input.locationId],
    );
    const location = context.rows[0];
    if (!location) return { success: false, error: "Aktif hizmet veya konum bulunamadı" };

    const locationSlug = location.locationSlug ?? location.locationName.toLowerCase().replace(/\s+/g, "-");
    const serviceSlug = location.serviceSlug ?? "hizmet";
    const slug = `${serviceSlug}/${locationSlug}`;
    const canonicalUrl = `${SITE_URL}${servicePath(slug)}`;
    const title = input.title?.trim() || `${location.serviceTitle} ${location.locationName}`;
    const metaTitle = input.metaTitle?.trim() || `${title} | XipSoft`;
    const metaDescription = input.metaDescription?.trim() || `${location.locationName} için ${location.serviceTitle}`;
    const markdownContent = input.markdownContent?.trim() || "";

    return {
      success: true,
      preview: {
        title,
        metaTitle,
        metaDescription,
        markdownContent,
        slug,
        canonicalUrl,
        location: {
          serviceTitle: location.serviceTitle,
          locationName: location.locationName,
          locationType: location.locationType,
        },
      },
      error: null,
    };
  } catch (error) {
    console.error("previewPage error:", error);
    return { success: false, preview: null, error: error instanceof Error ? error.message : "Önizleme oluşturulamadı" };
  }
}

export async function processJob() {
  return { success: false, error: "Otomatik üretim iptal edildi (DB-only model)" };
}

export async function cancelJob() {
  return { success: false, error: "Otomatik üretim iptal edildi (DB-only model)" };
}

export async function pauseJob() {
  return { success: false, error: "Otomatik üretim iptal edildi (DB-only model)" };
}

export async function resumeJob() {
  return { success: false, error: "Otomatik üretim iptal edildi (DB-only model)" };
}

export async function getJobStatus() {
  return { success: false, status: null, error: "Otomatik üretim iptal edildi (DB-only model)" };
}
