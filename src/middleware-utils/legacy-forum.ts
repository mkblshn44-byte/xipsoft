/**
 * legacy-forum.ts — Eski WordPress forum URL'lerini blog'a (DB) bağlar.
 *
 * DİKKAT: Sitede artık CANLI FORUM YOK. `/forum` bölümü, `threads`/`posts`/
 * `categories` tabanlı sayfalar ve forum şablonu tamamen kaldırıldı. Eski
 * forumdan geriye yalnızca URL'ler kaldı; içerikleri blog'a taşındı ve
 * `blog_posts.slug` eski forum slug'ıyla BİREBİR aynıdır (WordPress'in
 * eklediği `-<sayı>` soneki tolere edilir).
 *
 * Bu yüzden `/forum...` biçimindeki her istek DB'den üretilen blog sayfasına
 * yönlendirilir:
 *   - Son segment yayınlanmış bir blog yazısıyla eşleşiyorsa → 301 `/blog/<slug>`
 *   - Eşleşmiyorsa (kategori/liste sayfası, taşınmamış eski thread) → 301 `/blog`
 *
 * NEDEN 410 DEĞİL? Google Search Console, 410 Gone yanıtlarını da
 * "Bulunamadı (404)" sekmesinde raporlar; bu da hedeflediğimiz "404 = 0"
 * ilkesiyle çelişir. Blog sayfasına 301 yapmak kullanıcıyı ölü sayfaya
 * düşürmez ve GSC'de "Yönlendirmeli sayfa" (kabul edilebilir) olarak görünür.
 *
 * Blog slug listesi 5 dk bellek içi önbellekte tutulur; her istekte DB'ye
 * gidilmez. Middleware Node.js runtime'da çalıştığı için `pool` kullanılabilir.
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";
import { resolveSlugFromSet } from "@/lib/slug-candidates";

const CACHE_TTL_MS = 5 * 60 * 1000;

let slugCache: { slugs: Set<string>; at: number } | null = null;
let slugCacheRequest: Promise<Set<string> | null> | null = null;

async function getPublishedBlogSlugs(): Promise<Set<string> | null> {
  const now = Date.now();
  if (slugCache && now - slugCache.at < CACHE_TTL_MS) return slugCache.slugs;
  if (slugCacheRequest) return slugCacheRequest;

  slugCacheRequest = (async () => {
    try {
      const { rows } = await pool.query<{ slug: string }>(
        `SELECT slug FROM blog_posts
         WHERE status = 'published' AND deleted_at IS NULL AND slug IS NOT NULL`
      );
      const slugs = new Set(rows.map((row) => row.slug));
      slugCache = { slugs, at: Date.now() };
      return slugs;
    } catch (err) {
      console.error("[legacy-forum] blog slug sorgusu başarısız:", err);
      // Use stale mappings if available; otherwise signal temporary DB failure.
      return slugCache?.slugs ?? null;
    } finally {
      slugCacheRequest = null;
    }
  })();

  return slugCacheRequest;
}

/**
 * `/forum...` isteklerini işler:
 *   - taşınmış bir eski thread ise → 301 `/blog/<slug>`
 *   - aksi halde (forum kökü, kategori, eşleşmeyen thread) → 301 `/blog`
 * `/forum` dışındaki yollar için `null` döner (diğer middleware adımları işler).
 */
export async function handleLegacyForum(
  req: NextRequest,
  pathname: string
): Promise<NextResponse | null> {
  if (pathname !== "/forum" && !pathname.startsWith("/forum/")) return null;

  // `.html`, `.html.html` gibi ekleri temizle ve sondaki slash'ı at.
  let clean = pathname.replace(/(?:\.html)+$/i, "");
  if (clean.length > 1) clean = clean.replace(/\/+$/, "");

  const segments = clean.split("/").filter(Boolean); // ["forum", ...]

  // Thread slug'ı her zaman son segmenttir: /forum/<kategori>/<slug>.
  // Yalnızca en fazla 3 segment (kategori + slug) desteklenir; daha derin
  // yollar doğrudan blog listesine gider.
  if (segments.length >= 2 && segments.length <= 3) {
    const lastSegment = segments[segments.length - 1];
    const slugs = await getPublishedBlogSlugs();
    const matchedSlug = slugs ? resolveSlugFromSet(slugs, lastSegment) : null;

    // Eşleşen blog yazısı → DB'den üretilen kanonik blog sayfasına 301.
    if (matchedSlug) {
      return NextResponse.redirect(
        new URL(`/blog/${encodeURIComponent(matchedSlug)}`, req.url),
        301
      );
    }
  }

  // Forum kökü, kategori/liste sayfası ya da taşınmamış eski thread →
  // içeriğin gerçek karşılığı blog listesidir.
  return NextResponse.redirect(new URL("/blog", req.url), 301);
}

/**
 * Eski WordPress taksonomi / sayfalama / feed URL'leri → 301 /blog
 *
 *   /category/..., /tag/..., /author/..., /page/..., /feed, /comments/feed
 *
 * Bu URL'lerin yeni sitedeki karşılığı blog listesidir; 301 ile oraya
 * gönderilir (GSC'de "Yönlendirmeli sayfa"). 410 dönmek bu URL'leri
 * "Bulunamadı (404)" sekmesine yazacağı için tercih edilmez.
 *
 * `.html` ekli varyantlar middleware adım 0'da temizlendiğinden burada
 * ekstra hop oluşmaz.
 */
const LEGACY_ARCHIVE_PREFIXES = new Set(["category", "tag", "author", "page"]);

export function handleLegacyWpPaths(
  req: NextRequest,
  pathname: string
): NextResponse | null {
  const clean = pathname
    .replace(/(?:\.(?:html|xml))+$/i, "")
    .replace(/\/+$/, "");
  const segments = clean.split("/").filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();
  const secondSegment = segments[1]?.toLowerCase();

  const isLegacyArchive = Boolean(firstSegment && LEGACY_ARCHIVE_PREFIXES.has(firstSegment));
  const isLegacyFeed =
    firstSegment === "feed" ||
    (firstSegment === "comments" && secondSegment === "feed");

  if (!isLegacyArchive && !isLegacyFeed) return null;
  return NextResponse.redirect(new URL("/blog", req.url), 301);
}
