"use server";

import { unstable_cache } from "next/cache";
import pool from "@/lib/db/pool";
import { generateSlug, ensureUniqueSlug } from "@/lib/blog/slug";
import { shareBlogToTelegram } from "@/lib/telegram";
import type { BlogPost, BlogPostInput } from "@/types/blog";
import type { PaginatedResult } from "@/types/common";
import type { AuthUser } from "@/context/AuthContext";
import { getServerActionContext } from "@/lib/api-guard";
import { SITE_URL } from "@/lib/site-url";
import { invalidateBlogCaches } from "@/lib/blog-cache";
import { BLOG_BY_SLUG_SQL } from "@/lib/blog/detail";
import {
  invalidateRedirectCache,
  recordBlogPostSlugChange,
} from "@/lib/redirect-handler";
import {
  getBlogListCache,
  setBlogListCache,
  getBlogPostCache,
  setBlogPostCache,
} from "@/lib/redis/blog-cache";

const ALLOWED_TABLES = ["blog_posts"] as const;

function assertAllowedTable(table: string, action: string): boolean {
  if ((ALLOWED_TABLES as readonly string[]).includes(table)) return true;
  console.error(`${action}: Invalid table "${table}" - not in whitelist`);
  return false;
}

async function softDelete(table: string, id: string): Promise<boolean> {
  try {
    if (!assertAllowedTable(table, "softDelete")) return false;
    await pool.query(`UPDATE ${table} SET deleted_at = NOW() WHERE id = $1`, [id]);
    return true;
  } catch (error) {
    console.error(`softDelete(${table}) error:`, error);
    return false;
  }
}

async function setPublishStatus(
  table: string,
  id: string,
  publish: boolean,
): Promise<boolean> {
  try {
    if (!assertAllowedTable(table, "setPublishStatus")) return false;
    if (publish) {
      await pool.query(
        `UPDATE ${table} SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
    } else {
      await pool.query(
        `UPDATE ${table} SET status = 'draft', published_at = NULL, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
    }
    return true;
  } catch (error) {
    console.error(`setPublishStatus(${table}) error:`, error);
    return false;
  }
}

function buildPaginatedResult<T>(
  rows: Record<string, unknown>[],
  pageSize: number,
  offset: number,
  mapper: (row: Record<string, unknown>) => T,
): PaginatedResult<T> {
  return {
    data: rows.slice(0, pageSize).map(mapper),
    hasMore: rows.length > pageSize,
    nextOffset: offset + pageSize,
  };
}

// ── Mapper (SRP: sadece satır → tip dönusumu) ────────────────────────────────

function rowToBlogPost(row: Record<string, unknown>): BlogPost {
  const rawContent = row.content;
  let content: BlogPost["content"] = rawContent as BlogPost["content"];

  if (typeof rawContent === "string") {
    try {
      content = JSON.parse(rawContent) as BlogPost["content"];
    } catch {
      content = rawContent as unknown as BlogPost["content"];
    }
  }

  // content obje ise ama Lexical formatında (root özelligi yok) degilse null yap
  if (typeof content === "object" && content !== null && !("root" in content)) {
    content = null as unknown as BlogPost["content"];
  }

  return {
    id: String(row.id),
    title: row.title as string,
    description: (row.description as string) ?? "",
    content,
    authorId: String(row.author_id),
    authorName: (row.author_name as string) === "XipBOT" ? "XipBot" : ((row.author_name as string) ?? "XipBot"),
    authorAvatar: (row.author_avatar as string) ?? null,
    authorNick: (row.author_nick as string) ?? (row.nick as string) ?? null,
    status: row.status as BlogPost["status"],
    tags: (row.tags as string[]) ?? [],
    coverImageURL: (row.cover_image_url as string) ?? null,
    coverImageUrls: (row.cover_image_urls as any) ?? null,
    coverImageAlt: (row.cover_image_alt as string) ?? null,
    citations: (row.citations as BlogPost["citations"]) ?? null,
    slug: row.slug as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    publishedAt: row.published_at ? new Date(row.published_at as string) : null,
  };
}

// ── Ortak sorgu parçası ───────────────────────────────────────────────────────

const SELECT_Blog =
  `SELECT bp.*, u.display_name AS author_name, u.photo_url AS author_avatar
   FROM Blog_posts bp
   LEFT JOIN users u ON u.id = bp.author_id`;

interface AdjacentBlogPost {
  slug: string;
  title: string;
}

interface AdjacentBlogPosts {
  prev: AdjacentBlogPost | null;
  next: AdjacentBlogPost | null;
}

const getCachedAdjacentBlogPosts = unstable_cache(
  async (slug: string): Promise<AdjacentBlogPosts> => {
    const { rows } = await pool.query<{
      slug: string;
      title: string;
      dir: string;
    }>(
      `WITH current AS (
         SELECT COALESCE(published_at, created_at) AS ts
         FROM Blog_posts
         WHERE (slug = $1 OR slug LIKE $1 || '-%')
           AND status = 'published' AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1
       )
       (
         SELECT slug, title, 'prev' AS dir
         FROM Blog_posts, current
         WHERE status = 'published' AND deleted_at IS NULL
           AND COALESCE(published_at, created_at) < current.ts
         ORDER BY COALESCE(published_at, created_at) DESC
         LIMIT 1
       )
       UNION ALL
       (
         SELECT slug, title, 'next' AS dir
         FROM Blog_posts, current
         WHERE status = 'published' AND deleted_at IS NULL
           AND COALESCE(published_at, created_at) > current.ts
         ORDER BY COALESCE(published_at, created_at) ASC
         LIMIT 1
       )`,
      [slug]
    );
    const prev = rows.find((row) => row.dir === "prev") ?? null;
    const next = rows.find((row) => row.dir === "next") ?? null;

    return {
      prev: prev ? { slug: prev.slug, title: prev.title } : null,
      next: next ? { slug: next.slug, title: next.title } : null,
    };
  },
  ["blog-adjacent-posts"],
  { revalidate: 300, tags: ["blog-content"] }
);

// ── Actions ──────────────────────────────────────────────────────────────────

export async function getPublishedBlogPostsAction(
  pageSize = 6,
  offset = 0,
  category?: string,
  search?: string
): Promise<PaginatedResult<BlogPost> & { error?: boolean }> {
  // Kategori (etiket) ve arama terimi cache anahtarına dahil edilir ki farklı
  // sorgular birbirinin önbelleğini kirletmesin.
  const searchTerm = search?.trim() || null;
  const cacheKey = `${pageSize}-${offset}-${category?.trim() || "all"}-${searchTerm ?? "none"}`;

  // 1. Önce Redis'e bak
  const cached = await getBlogListCache(cacheKey);
  if (cached) {
    return {
      data: cached.items as unknown as BlogPost[],
      hasMore: cached.hasMore,
      nextOffset: cached.nextOffset,
    };
  }

  // 2. Redis'te yoksa NeonDB'den sadece liste alanlarını çek
  try {
    const { rows } = await pool.query(
      `SELECT bp.id, bp.title, bp.description, bp.slug,
              bp.published_at, bp.created_at, bp.tags, bp.cover_image_url,
              bp.cover_image_alt,
              u.display_name AS author_name, u.photo_url AS author_avatar
       FROM Blog_posts bp
       LEFT JOIN users u ON u.id = bp.author_id
       WHERE bp.status = 'published' AND bp.deleted_at IS NULL
         AND ($3::text IS NULL OR EXISTS (
              SELECT 1 FROM unnest(bp.tags) AS category_tag
              WHERE lower(category_tag) = lower($3)
            ))
         AND ($4::text IS NULL
              OR bp.title ILIKE '%' || $4 || '%'
              OR bp.description ILIKE '%' || $4 || '%'
              OR EXISTS (
                   SELECT 1 FROM unnest(bp.tags) AS t
                   WHERE t ILIKE '%' || $4 || '%'
                 ))
       ORDER BY bp.published_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize + 1, offset, category?.trim() || null, searchTerm]
    );

    const hasMore = rows.length > pageSize;
    const sliced  = rows.slice(0, pageSize);
    const nextOffset = offset + pageSize;

    // Hafif liste ögelerine map et (content dahil etme)
    const items = sliced.map((r) => ({
      id:           String(r.id),
      title:        r.title as string,
      description:  (r.description as string) ?? "",
      slug:         r.slug as string,
      publishedAt:  r.published_at ? new Date(r.published_at as string).toISOString() : null,
      createdAt:    new Date(r.created_at as string).toISOString(),
      authorName:   (r.author_name as string) ?? null,
      authorAvatar: (r.author_avatar as string) ?? null,
      tags:         (r.tags as string[]) ?? [],
      coverImageURL:(r.cover_image_url as string) ?? null,
      coverImageAlt:(r.cover_image_alt as string) ?? null,
    }));

    // 3. Redis'e kaydet
    await setBlogListCache(cacheKey, { items, hasMore, nextOffset });

    // BlogPost tipine uyumlu şekilde döndür
    return {
      data: items.map((item) => ({
        ...item,
        content:      null as unknown as BlogPost["content"],
        authorId:     "",
        status:       "published" as BlogPost["status"],
        publishedAt:  item.publishedAt ? new Date(item.publishedAt) : null,
        createdAt:    new Date(item.createdAt),
        updatedAt:    new Date(item.createdAt),
        coverImageUrls: null,
      })),
      hasMore,
      nextOffset,
    };
  } catch (err) {
    console.error("getPublishedBlogPostsAction error:", err);
    return { data: [], hasMore: false, nextOffset: 0, error: true };
  }
}

// ── Kategoriler (etiketlerden türetilir) ──────────────────────────────────────

export interface BlogCategoryCount {
  /** Kategori adı — `blog_posts.tags` etiketi */
  name: string;
  /** Bu kategoriye sahip yayınlanmış yazı sayısı */
  count: number;
}

/**
 * Yayınlanmış yazıların etiketlerini kategori olarak gruplar (adet ile).
 *
 * Blog veri modelinde ayrı bir kategori tablosu yoktur; `tags` dizisi
 * kategorik taksonomi olarak kullanılır. Sonuç `blog-content` etiketiyle
 * önbelleklenir → publish/update sonrası `invalidateBlogCaches()` temizler.
 */
/**
 * Sidebar'da gösterilecek maksimum kategori sayısı.
 *
 * DB'de 1.500+ yazı ve ~1.400 farklı etiket var; sınırsız liste sidebar'ı
 * ~60.000px yüksekliğe çıkarıyordu. Sayfa 10 yazı/sayfa yüklediği için
 * yüzlerce kategoriyi listelemek kullanıcıya da hiçbir şey kazandırmıyor.
 */
const MAX_BLOG_CATEGORIES = 24;

const getCachedBlogCategories = unstable_cache(
  async (): Promise<BlogCategoryCount[]> => {
    const { rows } = await pool.query<{ name: string; count: number }>(
      `SELECT tag AS name, COUNT(*)::int AS count
       FROM Blog_posts bp
       CROSS JOIN LATERAL unnest(bp.tags) AS tag
       WHERE bp.status = 'published' AND bp.deleted_at IS NULL
         AND tag IS NOT NULL AND btrim(tag) <> ''
       GROUP BY tag
       ORDER BY count DESC, tag ASC
       LIMIT $1`,
      [MAX_BLOG_CATEGORIES]
    );
    return rows.map((row) => ({ name: row.name, count: Number(row.count) }));
  },
  ["blog-categories"],
  { revalidate: 300, tags: ["blog-content"] }
);

/**
 * Yayınlanmış toplam yazı sayısı — sidebar'daki "Tümü" rozetinde kullanılır.
 * `blogs.length` (o an yüklenen sayfa) kullanılırsa "Tümü 10" yazarken
 * tek bir kategoride 127 görünür; tutarsız bir UI üretiyordu.
 */
const getCachedBlogTotalCount = unstable_cache(
  async (): Promise<number> => {
    const { rows } = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM Blog_posts
       WHERE status = 'published' AND deleted_at IS NULL`
    );
    return Number(rows[0]?.total ?? 0);
  },
  ["blog-total-count"],
  { revalidate: 300, tags: ["blog-content"] }
);

export async function getBlogTotalCountAction(): Promise<number> {
  try {
    return await getCachedBlogTotalCount();
  } catch (err) {
    console.error("getBlogTotalCountAction error:", err);
    return 0;
  }
}

export async function getBlogCategoriesAction(): Promise<BlogCategoryCount[]> {
  try {
    return await getCachedBlogCategories();
  } catch (err) {
    console.error("getBlogCategoriesAction error:", err);
    return [];
  }
}

export async function getBlogPostAction(id: string): Promise<BlogPost | null> {
  const ctx = await getServerActionContext();
  if (!ctx.isAuthenticated || !ctx.userId) return null;

  try {
    const { rows } = await pool.query(
      `${SELECT_Blog}
       WHERE bp.id = $1
         AND bp.deleted_at IS NULL
         AND (bp.author_id = $2 OR $3 = 'admin')`,
      [id, ctx.userId, ctx.userRole]
    );
    return rows[0] ? rowToBlogPost(rows[0]) : null;
  } catch (err) {
    console.error("getBlogPostAction error:", err);
    return null;
  }
}

export async function getBlogPostBySlugAction(slug: string): Promise<BlogPost | null> {
  // 1. Önce Redis'e bak
  const cached = await getBlogPostCache<BlogPost>(slug);
  if (cached) {
    // Date alanlarını deserialize et
    return {
      ...cached,
      createdAt:   new Date((cached as any).createdAt),
      updatedAt:   new Date((cached as any).updatedAt),
      publishedAt: (cached as any).publishedAt ? new Date((cached as any).publishedAt) : null,
    };
  }

  // 2. Redis'te yoksa sadece bu slug'a ait tek satırı çek
  try {
    const { rows } = await pool.query(BLOG_BY_SLUG_SQL, [slug]);
    if (!rows[0]) return null;
    const post = rowToBlogPost(rows[0]);

    // 3. Redis'e kaydet (serileştirilebilir hale getir)
    await setBlogPostCache(slug, {
      ...post,
      createdAt:   post.createdAt.toISOString(),
      updatedAt:   post.updatedAt.toISOString(),
      publishedAt: post.publishedAt?.toISOString() ?? null,
    });

    return post;
  } catch (err) {
    console.error("getBlogPostBySlugAction error:", err);
    return null;
  }
}

export async function getBlogAdjacentPostsAction(slug: string): Promise<{
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}> {
  // ── Redis cache ────────────────────────────────────────────────────────────
  const adjCacheKey = `adjacent:${slug}`;
  const cachedAdj = await getBlogPostCache<{
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
  }>(adjCacheKey);
  if (cachedAdj) return cachedAdj;

  try {
    const result = await getCachedAdjacentBlogPosts(slug);
    await setBlogPostCache(adjCacheKey, result);
    return result;
  } catch (err) {
    console.error("getBlogAdjacentPostsAction error:", err);
    return { prev: null, next: null };
  }
}

export async function getRelatedBlogPostsAction(
  currentSlug: string,
  tags: string[] = []
): Promise<BlogPost[]> {
  // Redis cache key: related:{slug}:{tags_hash}
  const tagsHash = tags.length > 0 ? tags.slice().sort().join(',') : 'none';
  const cacheKey = `related:${currentSlug}:${tagsHash}`;
  
  // 1. Önce Redis'e bak
  const cached = await getBlogPostCache<BlogPost[]>(cacheKey);
  if (cached) {
    // Date alanlarını deserialize et
    return cached.map((post) => ({
      ...post,
      createdAt: new Date((post as any).createdAt),
      updatedAt: new Date((post as any).updatedAt),
      publishedAt: (post as any).publishedAt ? new Date((post as any).publishedAt) : null,
    }));
  }

  try {
    let query: string;
    let params: unknown[];

    if (tags.length > 0) {
      // Tag bazlı: mevcut post hariç, tag'lerinden en az biri eşleşen en fazla 3 post
      query = `${SELECT_Blog}
        WHERE bp.status = 'published' AND bp.deleted_at IS NULL
          AND (bp.slug != $1 OR NOT bp.slug LIKE $1 || '-%')
          AND bp.tags && $2
        ORDER BY COALESCE(bp.published_at, bp.created_at) DESC
        LIMIT 3`;
      params = [currentSlug, tags];
    } else {
      // Tags yoksa en son 3 yayını dön
      query = `${SELECT_Blog}
        WHERE bp.status = 'published' AND bp.deleted_at IS NULL
          AND (bp.slug != $1 OR NOT bp.slug LIKE $1 || '-%')
        ORDER BY COALESCE(bp.published_at, bp.created_at) DESC
        LIMIT 3`;
      params = [currentSlug];
    }

    const { rows } = await pool.query(query, params);
    const posts = rows.map(rowToBlogPost);

    // 3. Redis'e kaydet (serileştirilebilir hale getir) - 10dk TTL
    await setBlogPostCache(cacheKey, posts.map((post) => ({
      ...post,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      publishedAt: post.publishedAt?.toISOString() ?? null,
    })));

    return posts;
  } catch (err) {
    console.error("getRelatedBlogPostsAction error:", err);
    return [];
  }
}

export async function getUserBlogPostsAction(
  pageSize = 6,
  offset = 0
): Promise<PaginatedResult<BlogPost>> {
  const ctx = await getServerActionContext();
  if (!ctx.isAuthenticated || !ctx.userId) {
    return { data: [], hasMore: false, nextOffset: 0 };
  }

  try {
    const { rows } = await pool.query(
      `${SELECT_Blog}
       WHERE bp.author_id = $1 AND bp.deleted_at IS NULL
       ORDER BY bp.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [ctx.userId, pageSize + 1, offset]
    );
    return buildPaginatedResult(rows, pageSize, offset, rowToBlogPost);
  } catch (err) {
    console.error("getUserBlogPostsAction error:", err);
    return { data: [], hasMore: false, nextOffset: 0 };
  }
}

export async function createBlogPostAction(
  input: BlogPostInput,
): Promise<string | null> {
  // author_id her zaman dogrulanmıs session'dan alınır — client parametresine güvenilmez
  const ctx = await getServerActionContext();
  if (!ctx.isAuthenticated || !ctx.userId) return null;

  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 3 || title.length > 120) return null;
  if (description.length > 320) return null;
  if (!Array.isArray(input.tags) || input.tags.length > 12) return null;

  try {
    const slug = await ensureUniqueSlug(generateSlug(title), undefined, "blog_posts");
    const { rows } = await pool.query(
      `INSERT INTO Blog_posts (title, description, content, author_id, status, tags, cover_image_url, cover_image_alt, slug)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8)
       RETURNINg id`,
      [
        title,
        description,
        JSON.stringify(input.content),
        ctx.userId,          // ← session'dan, client'tan degil
        input.tags,
        input.coverImageURL,
        input.coverImageAlt ?? null,
        slug,
      ]
    );
    return String(rows[0].id);
  } catch (err) {
    console.error("createBlogPostAction error:", err);
    return null;
  }
}

export async function updateBlogPostAction(
  id: string,
  input: Partial<BlogPostInput>
): Promise<boolean> {
  const ctx = await getServerActionContext();
  if (!ctx.isAuthenticated || !ctx.userId) return false;

  // Sunucu taraflı validasyon (SEO alanları dahil)
  if (input.title !== undefined) {
    const t = input.title.trim();
    if (t.length < 3 || t.length > 120) return false;
    input = { ...input, title: t };
  }
  if (input.description !== undefined) {
    const d = input.description.trim();
    if (d.length > 320) return false;
    input = { ...input, description: d };
  }
  if (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.length > 12)) return false;

  try {
    const client = await pool.connect();
    let currentSlug = "";
    let updatedSlug = "";
    let newSlug: string | null = null;

    try {
      await client.query("BEGIN");
      const ownerCheck = await client.query<{ author_id: number; slug: string }>(
        "SELECT author_id, slug FROM Blog_posts WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
        [id]
      );
      if (!ownerCheck.rows[0]) {
        await client.query("ROLLBACK");
        return false;
      }
      const isOwner = String(ownerCheck.rows[0].author_id) === ctx.userId;
      if (!isOwner && ctx.userRole !== "admin") {
        await client.query("ROLLBACK");
        return false;
      }
      currentSlug = ownerCheck.rows[0].slug;

      if (input.title !== undefined) {
        newSlug = await ensureUniqueSlug(generateSlug(input.title), Number(id), "blog_posts", client);
      }

      const { rows } = await client.query<{ slug: string }>(
        `UPDATE Blog_posts
         SET title            = COALESCE($1, title),
             description      = COALESCE($2, description),
             content          = COALESCE($3, content),
             tags             = COALESCE($4, tags),
             cover_image_url  = COALESCE($5, cover_image_url),
             cover_image_alt  = COALESCE($6, cover_image_alt),
             slug             = COALESCE($7, slug),
             updated_at       = NOW()
         WHERE id = $8 AND deleted_at IS NULL
         RETURNING slug`,
        [
          input.title ?? null,
          input.description ?? null,
          input.content ? JSON.stringify(input.content) : null,
          input.tags ?? null,
          input.coverImageURL ?? null,
          input.coverImageAlt ?? null,
          newSlug,
          id,
        ]
      );
      updatedSlug = rows[0]?.slug ?? currentSlug;

      if (updatedSlug !== currentSlug) {
        await recordBlogPostSlugChange(client, currentSlug, updatedSlug);
      }
      await client.query("COMMIT");
    } catch (transactionError) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw transactionError;
    } finally {
      client.release();
    }

    await invalidateBlogCaches(currentSlug);
    if (updatedSlug !== currentSlug) {
      await invalidateBlogCaches(updatedSlug);
      invalidateRedirectCache(`/blog/${currentSlug}`);
      invalidateRedirectCache(`/blog/${updatedSlug}`);
    }

    return true;
  } catch (err) {
    console.error("updateBlogPostAction error:", err);
    return false;
  }
}

export async function deleteBlogPostAction(id: string): Promise<boolean> {
  const ctx = await getServerActionContext();
  if (!ctx.isAuthenticated || !ctx.userId) return false;
  // Sahiplik veya admin kontrolü
  const ownerCheck = await pool.query<{ author_id: number; slug: string }>(
    "SELECT author_id, slug FROM Blog_posts WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  if (!ownerCheck.rows[0]) return false;
  const isOwner = String(ownerCheck.rows[0].author_id) === ctx.userId;
  if (!isOwner && ctx.userRole !== "admin") return false;
  const result = await softDelete("blog_posts", id);
  if (result) await invalidateBlogCaches(ownerCheck.rows[0].slug);
  return result;
}

export async function publishBlogPostAction(id: string): Promise<boolean> {
  const ctx = await getServerActionContext();
  if (!ctx.isAuthenticated || !ctx.userId) return false;
  const ownerCheck = await pool.query<{ author_id: number; slug: string }>(
    "SELECT author_id, slug FROM Blog_posts WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  if (!ownerCheck.rows[0]) return false;
  const isOwner = String(ownerCheck.rows[0].author_id) === ctx.userId;
  if (!isOwner && ctx.userRole !== "admin") return false;
  const result = await setPublishStatus("blog_posts", id, true);
  if (result) await invalidateBlogCaches(ownerCheck.rows[0].slug);
  // IndexNow + google ping + Telegram — yeni Blog yazısı yayınlandı
  if (result && ownerCheck.rows[0].slug) {
    const slug = ownerCheck.rows[0].slug;

    // IndexNow ping (fire-and-forget)

    // Telegram paylasımı (fire-and-forget)
    try {
      const BlogRow = await pool.query<{
        title: string;
        description: string | null;
        tags: string[] | null;
        author_name: string | null;
      }>(
        `SELECT bp.title, bp.description, bp.tags, u.display_name AS author_name
         FROM Blog_posts bp
         LEFT JOIN users u ON u.id = bp.author_id
         WHERE bp.id = $1 AND bp.deleted_at IS NULL`,
        [id]
      );
      if (BlogRow.rows[0]) {
        const { shareBlogToTelegramAll } = await import("@/lib/telegram");
        shareBlogToTelegramAll({
          title: BlogRow.rows[0].title,
          description: BlogRow.rows[0].description,
          slug,
          authorName: BlogRow.rows[0].author_name,
          tags: BlogRow.rows[0].tags ?? undefined,
        }).catch(() => {});
      }
    } catch {
      // Telegram hatası Blog yayınını engellemesin
    }
  }
  return result;
}

export async function unpublishBlogPostAction(id: string): Promise<boolean> {
  const ctx = await getServerActionContext();
  if (!ctx.isAuthenticated || !ctx.userId) return false;
  const ownerCheck = await pool.query<{ author_id: number; slug: string }>(
    "SELECT author_id, slug FROM Blog_posts WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  if (!ownerCheck.rows[0]) return false;
  const isOwner = String(ownerCheck.rows[0].author_id) === ctx.userId;
  if (!isOwner && ctx.userRole !== "admin") return false;
  const result = await setPublishStatus("blog_posts", id, false);
  if (result) await invalidateBlogCaches(ownerCheck.rows[0].slug);
  return result;
}
