"use server";

import { SITE_URL } from "@/lib/site-url";
import pool from "@/lib/database";
import fs from "fs";
import path from "path";
import { getServerActionContext } from "@/lib/api-guard";

export async function getSEODashboardData() {
  const ctx = await getServerActionContext();
  if (!ctx.isAuthenticated || ctx.userRole !== "admin") {
    return { error: "Yetkisiz erisim" };
  }

  const BASE = SITE_URL.replace(/\/+$/, "");
  const checks: Record<string, any> = {};

  // 1. Sitemap kontrol
  try {
    const res = await fetch(`${BASE}/sitemap.xml`, { method: "gET", signal: AbortSignal.timeout(5000) });
    const text = await res.text();
    const urlCount = (text.match(/<loc>/g) || []).length;
    checks.sitemap = { status: res.ok ? "ok" : "error", urlCount };
  } catch {
    checks.sitemap = { status: "error", error: "Erisilemiyor" };
  }

  // 2. Blog sitemap kontrol
  try {
    const res = await fetch(`${BASE}/sitemap/1.xml`, { method: "gET", signal: AbortSignal.timeout(5000) });
    const text = await res.text();
    const urlCount = (text.match(/<loc>/g) || []).length;
    checks.sitemapBlog = { status: res.ok ? "ok" : "error", urlCount };
  } catch {
    checks.sitemapBlog = { status: "error", error: "Erisilemiyor" };
  }

  // 3. Robots.txt kontrol
  try {
    const res = await fetch(`${BASE}/robots.txt`, { method: "gET", signal: AbortSignal.timeout(5000) });
    const text = await res.text();
    const hasSitemap = text.includes("Sitemap:");
    const hasDisallow = text.includes("Disallow:");
    checks.robotsTxt = { status: res.ok ? "ok" : "error", hasSitemap, hasDisallow };
  } catch {
    checks.robotsTxt = { status: "error" };
  }

  // 4. Og image kontrol
  const ogPath = path.join(process.cwd(), "public", "images", "xipsoft-seo.png");
  checks.ogImage = { exists: fs.existsSync(ogPath) };

  // 5. Blog meta analiz
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE description IS NULL OR description = '') as missing_desc,
              COUNT(*) FILTER (WHERE slug IS NULL OR slug = '') as missing_slug
       FROM Blog_posts
       WHERE deleted_at IS NULL`
    );
    checks.BlogMeta = result.rows[0];
  } catch {
    checks.BlogMeta = null;
  }

  // 6. Blog sayısı
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as total FROM Blog_posts WHERE status = 'published' AND deleted_at IS NULL`
    );
    checks.publishedPosts = parseInt(result.rows[0]?.total || "0", 10);
  } catch {
    checks.publishedPosts = 0;
  }

  // 7. Sayfa sayısı
  checks.pagesInSitemap = checks.sitemap?.urlCount || 0;

  return checks;
}
