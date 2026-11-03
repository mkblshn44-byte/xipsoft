/**
 * Blog RSS Feed — /blog/feed.xml
 * Atom + RSS 2.0 uyumlu XML feed.
 * Google News, Feedly ve içerik aggregator'ları için SEO sinyali sağlar.
 */
import { NextResponse } from "next/server";
import { DEFAULT_OG_IMAGE_URL, SITE_URL } from "@/config/brand.config";
import pool from "@/lib/db/pool";

export const revalidate = 3600;

interface FeedPost {
  title: string;
  description: string | null;
  slug: string;
  published_at: string | null;
  updated_at: string;
  author_name: string | null;
  tags: string[] | null;
  cover_image_url: string | null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const BASE = SITE_URL.replace(/\/+$/, "");
  const now = new Date().toUTCString();
  let posts: FeedPost[] = [];

  try {
    if (process.env.DATABASE_URL) {
      const result = await pool.query<FeedPost>(
        `SELECT
           bp.title,
           bp.description,
           bp.slug,
           bp.published_at,
           bp.updated_at,
           bp.tags,
           bp.cover_image_url,
           u.display_name AS author_name
         FROM Blog_posts bp
         LEFT JOIN users u ON u.id = bp.author_id
         WHERE bp.status = 'published'
           AND bp.deleted_at IS NULL
         ORDER BY bp.published_at DESC
         LIMIT 50`
      );
      posts = result.rows;
    }
  } catch {
    // DB bağlantısı yoksa boş feed döndür
  }

  const items = posts
    .map((post) => {
      const url = `${BASE}/blog/${post.slug}`;
      const pubDate = post.published_at
        ? new Date(post.published_at).toUTCString()
        : new Date(post.updated_at).toUTCString();
      const title = escapeXml(post.title);
      const desc = escapeXml(post.description ?? post.title);
      const author = escapeXml(post.author_name ?? "XipSoft");
      const image = post.cover_image_url ?? DEFAULT_OG_IMAGE_URL;
      const categories = Array.isArray(post.tags)
        ? post.tags.map((t) => `    <category>${escapeXml(t)}</category>`).join("\n")
        : "";

      return `  <item>
    <title>${title}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description>${desc}</description>
    <pubDate>${pubDate}</pubDate>
    <author>noreply@xipsoft.net (${author})</author>
    <enclosure url="${image}" type="image/jpeg" length="0" />
${categories}
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>XipSoft Blog</title>
    <link>${BASE}/blog</link>
    <description>Web yazılım, mobil uygulama ve teknoloji dünyasından güncel makaleler.</description>
    <language>tr-TR</language>
    <lastBuildDate>${now}</lastBuildDate>
    <managingEditor>info@xipsoft.net (XipSoft)</managingEditor>
    <webMaster>info@xipsoft.net (XipSoft)</webMaster>
    <image>
      <url>${DEFAULT_OG_IMAGE_URL}</url>
      <title>XipSoft Blog</title>
      <link>${BASE}/blog</link>
    </image>
    <atom:link href="${BASE}/blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
