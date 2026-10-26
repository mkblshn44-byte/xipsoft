/**
 * blog/detail.ts — Blog detay sayfası için paylaşılan sunucu verisi.
 *
 * Tek şablon ilkesi (MIMARI.md): `/blog/[slug]` rotası DB'den gelen blog
 * yazısını bu ortak veri çözümleme katmanı üzerinden render eder; metadata
 * `blog/[slug]/page.tsx` içinde `seo-helpers.buildPageMetadata()` ile üretilir.
 * Legacy WordPress forum URL'leri middleware'de 301 ile `/blog/<slug>` adresine
 * bağlanır; forum artık canlı bir bölüm değildir.
 *
 * Not: `getDbBlogBySlug`, URL slug'ı ile DB slug'ı birebir eşleşmese bile
 * (`base` ↔ `base-<sayı>` WordPress eki) doğru yazıyı çözer.
 */

import { unstable_cache } from "next/cache";
import pool from "@/lib/db/pool";
import { getBlogPostCache, setBlogPostCache } from "@/lib/redis/blog-cache";
import { blogSlugCandidates } from "@/lib/slug-candidates";
import { normalizeBlogSlug } from "../blog-slug";

// ── Tipler ────────────────────────────────────────────────────────────────────

export interface DbBlogRow {
  id: string;
  title: string;
  description: string | null;
  content: unknown;
  tags: string[] | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  citations: Array<{ url: string; title: string; source?: string }> | null;
  slug: string;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  author_name: string | null;
  author_avatar: string | null;
  author_nick: string | null;
  author_bio: string | null;
  author_linkedin_url: string | null;
  author_github_url: string | null;
  author_twitter_url: string | null;
  author_expertise_area: string | null;
  author_years_experience: number | null;
  author_is_expert: boolean | null;
  author_id?: string;
  status?: string;
}

export type CachedDbBlogRow = Omit<
  DbBlogRow,
  "published_at" | "created_at" | "updated_at"
> & {
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export interface SerializedDbBlog {
  id: string;
  title: string;
  description: string | null;
  content: unknown;
  tags: string[] | null;
  coverImageURL: string | null;
  coverImageAlt: string | null;
  citations: Array<{ url: string; title: string; source?: string }> | null;
  slug: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  authorAvatar: string | null;
  authorNick: string | null;
  authorId?: string;
  status?: string;
}

// ── DB erişimi ─────────────────────────────────────────────────────────────────

/**
 * Blog yazısı (bp) kolonları — detay sorgularının ortak parçası (DRY).
 * `DbBlogRow` tipindeki tüm bp alanlarını kapsar (cover_image_alt, citations dahil).
 */
export const BLOG_POST_COLUMNS = `bp.id, bp.title, bp.description, bp.content, bp.tags,
              bp.cover_image_url, bp.cover_image_alt, bp.citations, bp.slug,
              bp.author_id, bp.status, bp.published_at, bp.created_at, bp.updated_at`;

/**
 * Yazar (u) kolonları — `author_*` alias'ları `DbBlogRow`'daki tüm yazar
 * alanlarını sağlar (nick, bio, sosyal linkler, uzmanlık). Bir alan buradan
 * çıkarılırsa blog detayında yazar linki (`/x/<nick>`) ve schema.org
 * `sameAs` / `citation` sinyalleri sessizce kaybolur.
 */
export const BLOG_AUTHOR_COLUMNS = `u.display_name AS author_name,
              u.photo_url AS author_avatar,
              u.nick AS author_nick,
              u.bio AS author_bio,
              u.linkedin_url AS author_linkedin_url,
              u.github_url AS author_github_url,
              u.twitter_url AS author_twitter_url,
              u.expertise_area AS author_expertise_area,
              u.years_experience AS author_years_experience,
              u.is_expert AS author_is_expert`;

/**
 * Slug ile tek yayınlanmış blog yazısı getiren ortak sorgu.
 * Hem `blog/[slug]/page.tsx` (detay sayfası) hem `blog-actions` (server action)
 * bu tek kaynağı kullanır → kolon listeleri bir daha ayrışamaz.
 */
export const BLOG_BY_SLUG_SQL = `SELECT ${BLOG_POST_COLUMNS},
              ${BLOG_AUTHOR_COLUMNS}
       FROM Blog_posts bp
       LEFT JOIN users u ON u.id = bp.author_id
       WHERE (bp.slug = $1 OR bp.slug LIKE $1 || '-%')
         AND bp.status = 'published'
         AND bp.deleted_at IS NULL
       ORDER BY bp.created_at DESC
       LIMIT 1`;

const getCachedDbBlogBySlug = unstable_cache(
  async (slug: string): Promise<CachedDbBlogRow | null> => {
    const { rows } = await pool.query<DbBlogRow>(BLOG_BY_SLUG_SQL, [slug]);
    const row = rows[0];
    if (!row) return null;

    return {
      ...row,
      published_at: row.published_at?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  },
  ["blog-post-by-slug"],
  { revalidate: 300, tags: ["blog-content"] }
);

/**
 * Slug ile tek blog yazısını çözer (önce Redis, sonra `unstable_cache`).
 *
 * **Hata politikası (Ö3 — açık sözleşme):**
 * - Yazı yoksa veya `DATABASE_URL` tanımlı değilse → `null` (fail-soft).
 * - Altyapı hatası (sorgu/cache) → **loglar ve yeniden fırlatır** (fail-fast).
 *
 * Bilinçli olarak `null`'a çevrilmez: geçici bir DB hatasının `null` dönüp
 * ISR ile 404 olarak önbelleğe alınması SEO açısından zararlıdır; hata
 * fırlatmak 500 üretir ve olumsuz durumu önbelleklemez.
 */
export async function getDbBlogBySlug(slug: string): Promise<DbBlogRow | null> {
  // 1. Önce Redis'e bak
  const cached = await getBlogPostCache<CachedDbBlogRow>(`page:${slug}`);
  if (cached) {
    return {
      ...cached,
      published_at: cached.published_at ? new Date(cached.published_at) : null,
      created_at: new Date(cached.created_at),
      updated_at: new Date(cached.updated_at),
    };
  }

  if (!process.env.DATABASE_URL) return null;

  try {
    // Metadata and page rendering share the same persistent data-cache entry.
    const row = await getCachedDbBlogBySlug(slug);
    if (!row) return null;

    // 3. Redis'te Date alanlarını ISO string olarak sakla
    await setBlogPostCache(`page:${slug}`, row);

    return {
      ...row,
      published_at: row.published_at ? new Date(row.published_at) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  } catch (error) {
    console.error(`[blog] Failed to load slug "${slug}":`, error);
    throw error;
  }
}

/**
 * Bir URL slug'ını yayınlanmış blog yazısına çözer. Önce birebir eşleşme,
 * ardından WordPress'in eklediği `-<sayı>` sonek(ler)i kademeli olarak atılarak
 * temel slug denenir. Bulunamazsa `null` döner.
 */
export async function resolvePublishedBlogPost(
  slug: string | null | undefined
): Promise<DbBlogRow | null> {
  const normalized = normalizeBlogSlug(slug ?? null);
  if (!normalized) return null;

  for (const candidate of blogSlugCandidates(normalized)) {
    const row = await getDbBlogBySlug(candidate);
    if (row) return row;
  }

  return null;
}

// ── Serialize: Date → ISO string (server → client transfer için) ────────────────

export function serializeDbBlog(row: DbBlogRow): SerializedDbBlog {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    tags: row.tags,
    coverImageURL: row.cover_image_url,
    coverImageAlt: row.cover_image_alt,
    citations: row.citations,
    slug: row.slug,
    publishedAt: (row.published_at as Date | null)?.toISOString() ?? null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    authorNick: row.author_nick,
    authorId: row.author_id,
    status: row.status,
  };
}
