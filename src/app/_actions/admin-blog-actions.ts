"use server";

import pool from "@/lib/db/pool";
import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/api-guard";
import { SITE_URL } from "@/lib/site-url";
import { invalidateBlogCaches } from "@/lib/blog-cache";
import { invalidateRedirectCache, recordBlogPostSlugChange } from "@/lib/redirect-handler";
import { ensureUniqueSlug, sanitizeSlugInput } from "@/lib/blog/slug";

/**
 * Yazar (author_id) istemciden GÜVENİLMEZ şekilde alınmaz; oturumdaki admin
 * kullanıcıdan türetilir. `blog_posts.author_id` → `users.id` (integer) FK'sı
 * vardır. JWT `sub` string gelir; geçerli bir kullanıcıya çözülemezse ilk
 * admin kullanıcısına düşer (dev fallback token'ları için).
 */
async function resolveAuthorId(sessionUserId: string | null): Promise<number> {
  const parsed = Number.parseInt(String(sessionUserId ?? ""), 10);
  if (Number.isInteger(parsed) && parsed > 0) {
    const found = await pool.query<{ id: number }>(
      `SELECT id FROM users WHERE id = $1 LIMIT 1`,
      [parsed],
    );
    if (found.rows[0]) return found.rows[0].id;
  }
  const fallback = await pool.query<{ id: number }>(
    `SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1`,
  );
  if (fallback.rows[0]) return fallback.rows[0].id;
  throw new Error("Yazar (admin kullanıcı) bulunamadı");
}

export async function createBlogPost(data: {
  title: string;
  description: string;
  content: any;
  /** @deprecated Yazar oturumdan türetilir; geriye dönük uyumluluk için opsiyonel. */
  author_id?: number;
  status: "draft" | "published";
  tags?: string[];
  cover_image_url?: string;
  cover_image_alt?: string;
  citations?: Array<{ url: string; title: string; source?: string }>;
  slug: string;
}) {
  try {
    const ctx = await requireAdminAction();

    const { title, description, content, status, tags = [], cover_image_url, cover_image_alt, citations, slug: providedSlug } = data;
    const authorId = await resolveAuthorId(ctx.userId);

    // Slug üretimi: dışarıdan gelen slug standartlara göre temizlenir; yoksa
    // başlıktan üretilir. Ardından DB'de benzersizleştirilir.
    const baseSlug = sanitizeSlugInput(providedSlug || title || "", title);
    const uniqueSlug = await ensureUniqueSlug(baseSlug);

    const result = await pool.query(
      `INSERT INTO Blog_posts (title, description, content, author_id, status, tags, cover_image_url, cover_image_alt, citations, slug, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNINg *`,
      [
        title,
        description,
        JSON.stringify(content),
        authorId,
        status,
        tags,
        cover_image_url,
        cover_image_alt || null,
        citations && citations.length > 0 ? JSON.stringify(citations) : "[]",
        uniqueSlug,
        status === "published" ? new Date().toISOString() : null,
      ]
    );

    await invalidateBlogCaches(result.rows[0]?.slug);
    revalidatePath("/blog");
    revalidatePath("/", "layout");

    // IndexNow + google ping — yeni Blog yazısı yayınlandıysa arama motorlarını bildir
    if (status === "published" && result.rows[0]?.slug) {
    }

    return { success: true, post: result.rows[0] };
  } catch (error: any) {
    console.error("Blog post creation error:", error);
    return { success: false, error: error.message };
  }
}

export async function getBlogPosts(
  limit = 50,
  offset = 0,
  options: { status?: "published" | "draft"; search?: string } = {},
) {
  try {
    await requireAdminAction();

    const values: unknown[] = [];
    const where = ["bp.deleted_at IS NULL"];
    const add = (value: unknown) => { values.push(value); return `$${values.length}`; };

    if (options.status) where.push(`bp.status = ${add(options.status)}`);
    const term = options.search?.trim();
    if (term) {
      const param = add(`%${term}%`);
      where.push(`(bp.title ILIKE ${param} OR bp.slug ILIKE ${param})`);
    }

    const limitParam = add(limit);
    const offsetParam = add(offset);

    const result = await pool.query(
      `SELECT bp.*, u.display_name as author_name, u.email as author_email,
              COUNT(*) OVER()::int AS total_count
       FROM Blog_posts bp
       LEFT JOIN users u ON bp.author_id = u.id
       WHERE ${where.join(" AND ")}
       ORDER BY bp.created_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values
    );

    const total = result.rows[0]?.total_count ?? 0;
    return { success: true, posts: result.rows, total };
  } catch (error: any) {
    console.error("get Blog posts error:", error);
    return { success: false, error: error.message, posts: [], total: 0 };
  }
}

export async function getBlogCountsAction() {
  try {
    await requireAdminAction();
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'published')::int AS published,
         COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'draft')::int     AS draft,
         COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::int                      AS trash
       FROM Blog_posts`
    );
    const row = result.rows[0] ?? { published: 0, draft: 0, trash: 0 };
    return {
      success: true,
      counts: { published: row.published, draft: row.draft, trash: row.trash },
    };
  } catch (error: any) {
    console.error("get Blog counts error:", error);
    return {
      success: false,
      counts: { published: 0, draft: 0, trash: 0 },
      error: error.message,
    };
  }
}

export async function updateBlogPost(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    content: any;
    status: "draft" | "published";
    tags: string[];
    cover_image_url: string;
    cover_image_alt: string;
    citations: Array<{ url: string; title: string; source?: string }>;
    slug: string;
  }>
) {
  try {
    await requireAdminAction();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Parameterized query — SQL injection koruması
    if (data.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.content !== undefined) {
      fields.push(`content = $${paramCount++}`);
      values.push(JSON.stringify(data.content));
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
      if (data.status === "published") {
        fields.push(`published_at = CURRENT_TIMESTAMP`);
      }
    }
    if (data.tags !== undefined) {
      fields.push(`tags = $${paramCount++}`);
      values.push(data.tags);
    }
    if (data.cover_image_url !== undefined) {
      fields.push(`cover_image_url = $${paramCount++}`);
      values.push(data.cover_image_url);
    }
    if (data.cover_image_alt !== undefined) {
      fields.push(`cover_image_alt = $${paramCount++}`);
      values.push(data.cover_image_alt || null);
    }
    if (data.citations !== undefined) {
      fields.push(`citations = $${paramCount++}`);
      values.push(JSON.stringify(data.citations || []));
    }
    // Eger explicit slug verilmisse kullan; verilmemis ve baslık degismisse
    // baslıktan otomatik olarak slug üret ve benzersizlestir (mevcut id hariç)
    if (data.slug !== undefined) {
      fields.push(`slug = $${paramCount++}`);
      values.push(sanitizeSlugInput(String(data.slug), String(data.title ?? "")));
    } else if (data.title !== undefined) {
      const uniq = await ensureUniqueSlug(sanitizeSlugInput(String(data.title)), id);
      fields.push(`slug = $${paramCount++}`);
      values.push(uniq);
    }

    if (fields.length === 0) return { success: false, error: "güncellenecek alan yok" };

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const client = await pool.connect();
    let previousSlug: string;
    let updatedPost: any;
    try {
      await client.query("BEGIN");
      const previous = await client.query<{ slug: string }>(
        `SELECT slug FROM Blog_posts WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (!previous.rows[0]) {
        await client.query("ROLLBACK");
        return { success: false, error: "Yazı bulunamadı" };
      }
      previousSlug = previous.rows[0].slug;

      const result = await client.query(
        `UPDATE Blog_posts SET ${fields.join(", ")} WHERE id = $${paramCount} RETURNING *`,
        values,
      );
      updatedPost = result.rows[0];
      if (previousSlug !== updatedPost.slug) {
        await recordBlogPostSlugChange(client, previousSlug, updatedPost.slug);
      }
      await client.query("COMMIT");
    } catch (transactionError) {
      await client.query("ROLLBACK");
      throw transactionError;
    } finally {
      client.release();
    }

    await invalidateBlogCaches(previousSlug);
    await invalidateBlogCaches(updatedPost?.slug);
    if (previousSlug !== updatedPost?.slug) {
      invalidateRedirectCache(`/blog/${previousSlug}`);
      invalidateRedirectCache(`/blog/${updatedPost.slug}`);
    }
    revalidatePath("/blog");
    revalidatePath("/blog/[slug]", "page");
    if (updatedPost?.slug) revalidatePath(`/blog/${updatedPost.slug}`);
    revalidatePath("/", "layout");

    // IndexNow — Blog yazısı yayınlandıysa veya güncellendiyse bildir
    if (updatedPost?.slug && (data.status === "published" || updatedPost.status === "published")) {
      const eventType = data.status === "published" ? "add" : "update";
    }

    return { success: true, post: updatedPost };
  } catch (error: any) {
    console.error("Update Blog post error:", error);
    return { success: false, error: error.message };
  }
}

// ── Çöp Kutusu ──────────────────────────────────────────────────────────────

export async function getDeletedBlogPostsAction() {
  try {
    await requireAdminAction();
    const result = await pool.query(
      `SELECT bp.id, bp.title, bp.slug, bp.deleted_at, u.display_name as author_name
       FROM Blog_posts bp
       LEFT JOIN users u ON bp.author_id = u.id
       WHERE bp.deleted_at IS NOT NULL
       ORDER BY bp.deleted_at DESC
       LIMIT 200`
    );
    return { success: true, posts: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message, posts: [] };
  }
}

export async function restoreBlogPostAction(id: number) {
  try {
    await requireAdminAction();
    if (!Number.isInteger(id) || id <= 0) return { success: false, error: "geçersiz ID" };

    const slugResult = await pool.query<{ slug: string }>(
      `SELECT slug FROM Blog_posts WHERE id = $1`,
      [id]
    );
    const slug = slugResult.rows[0]?.slug;

    await pool.query(
      `UPDATE Blog_posts SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await invalidateBlogCaches(slug);
    revalidatePath("/blog");
    revalidatePath("/blog/[slug]", "page");
    if (slug) revalidatePath(`/blog/${slug}`);
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("restoreBlogPostAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function hardDeleteBlogPostAction(id: number) {
  try {
    await requireAdminAction();
    if (!Number.isInteger(id) || id <= 0) return { success: false, error: "geçersiz ID" };

    const slugResult = await pool.query<{ slug: string }>(
      `SELECT slug FROM Blog_posts WHERE id = $1 AND deleted_at IS NOT NULL`,
      [id]
    );
    await pool.query(
      `DELETE FROM Blog_posts WHERE id = $1 AND deleted_at IS NOT NULL`,
      [id]
    );

    await invalidateBlogCaches(slugResult.rows[0]?.slug);
    revalidatePath("/blog");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("hardDeleteBlogPostAction error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteBlogPost(id: number) {
  try {
    await requireAdminAction();

    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: "geçersiz ID" };
    }

    const slugResult = await pool.query<{ slug: string }>(
      `SELECT slug FROM Blog_posts WHERE id = $1`,
      [id]
    );
    const slug = slugResult.rows[0]?.slug;

    await pool.query(
      `UPDATE Blog_posts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await invalidateBlogCaches(slug);
    revalidatePath("/blog");
    revalidatePath("/blog/[slug]", "page");
    if (slug) revalidatePath(`/blog/${slug}`);
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Delete Blog post error:", error);
    return { success: false, error: error.message };
  }
}
