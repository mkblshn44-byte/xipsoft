/**
 * legacy-forum.ts - kaldirilmis WordPress forum URL'lerinin 410 yanitlari + akıllı blog eslesmesi.
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/pool";
import { isPublishedTreePath } from "@/lib/content-tree-policy";
import { buildGoneResponse } from "./seo-normalize";
import { resolveSlugFromSet } from "@/lib/slug-candidates";

const FORUM_NON_CONTENT_SLUGS = new Set([
  "search",
  "viewtopic",
  "viewforum",
  "view",
  "category",
  "categories",
  "tag",
  "tags",
  "author",
  "authors",
  "page",
  "feed",
  "rss",
  "rss2",
  "wp-content",
  "wp-admin",
  "wp-includes",
]);

const BLOG_SLUG_SNAPSHOT_TTL_MS = 60_000;
let blogSlugSnapshot: Set<string> | null = null;
let blogSlugSnapshotExpiresAt = 0;
let blogSlugSnapshotRequest: Promise<Set<string>> | null = null;

async function loadPublishedBlogSlugs(): Promise<Set<string>> {
  if (!process.env.DATABASE_URL) return new Set();
  try {
    const { rows } = await pool.query<{ slug: string }>(
      `SELECT slug FROM Blog_posts WHERE status = 'published' AND deleted_at IS NULL`,
    );
    return new Set(rows.map((r) => String(r.slug ?? "").trim()).filter(Boolean));
  } catch (error) {
    console.warn("[legacy-forum] Blog slug snapshot failed:", error);
    return blogSlugSnapshot ?? new Set<string>();
  }
}

async function getPublishedBlogSlugs(): Promise<Set<string>> {
  if (blogSlugSnapshot && Date.now() < blogSlugSnapshotExpiresAt) {
    return blogSlugSnapshot;
  }
  if (blogSlugSnapshotRequest) return blogSlugSnapshotRequest;

  blogSlugSnapshotRequest = loadPublishedBlogSlugs()
    .then((set) => {
      blogSlugSnapshot = set;
      blogSlugSnapshotExpiresAt = Date.now() + BLOG_SLUG_SNAPSHOT_TTL_MS;
      return set;
    })
    .catch((error) => {
      console.warn("[legacy-forum] Blog slug snapshot failed:", error);
      blogSlugSnapshotExpiresAt = Date.now() + BLOG_SLUG_SNAPSHOT_TTL_MS;
      return blogSlugSnapshot ?? new Set<string>();
    })
    .finally(() => {
      blogSlugSnapshotRequest = null;
    });

  return blogSlugSnapshotRequest;
}

export async function handleLegacyForum(
  req: NextRequest,
  pathname: string
): Promise<NextResponse | null> {
  if (pathname !== "/forum" && !pathname.startsWith("/forum/")) return null;

  let clean = pathname.replace(/(?:\.html)+$/i, "");
  if (clean.length > 1) clean = clean.replace(/\/+$/, "");

  const segments = clean.split("/").filter(Boolean);

  // Forum kökü veya çok segmentli/liste/arama yolları -> 410.
  if (segments.length <= 1 || segments.length > 2) {
    return buildGoneResponse(clean) as unknown as NextResponse;
  }

  const slug = segments[1].toLowerCase();
  if (FORUM_NON_CONTENT_SLUGS.has(slug)) {
    return buildGoneResponse(clean) as unknown as NextResponse;
  }

  // Yayınlanmış blog yazısı olarak yaşıyorsa 301 (akıllı eşleşme).
  const slugs = await getPublishedBlogSlugs();
  const resolved = resolveSlugFromSet(slugs, slug);
  if (resolved) {
    const target = new URL(`/blog/${encodeURIComponent(resolved)}`, req.url);
    return NextResponse.redirect(target, 301);
  }

  return buildGoneResponse(clean) as unknown as NextResponse;
}

/**
 * Eski WordPress taksonomi / sayfalama / feed URL'leri -> 301 /blog
 */
const LEGACY_ARCHIVE_PREFIXES = new Set(["category", "tag", "author", "page"]);

export async function handleLegacyWpPaths(
  req: NextRequest,
  pathname: string
): Promise<NextResponse | null> {
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
  if (await isPublishedTreePath(clean)) return null;
  return NextResponse.redirect(new URL("/blog", req.url), 301);
}