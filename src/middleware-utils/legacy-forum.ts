/**
 * legacy-forum.ts — kaldırılmış WordPress forum URL'lerinin 410 yanıtları.
 *
 * `/forum` bölümü tamamen kaldırıldı. Eski forum URL'leri herhangi bir blog,
 * ana sayfa veya kategoriye yönlendirilmez; kalıcı olarak silinmiş kabul edilir.
 */

import { NextRequest, NextResponse } from "next/server";
import { isPublishedTreePath } from "@/lib/content-tree-policy";
import { buildGoneResponse } from "./seo-normalize";

/** Forum kökü ve bütün alt yolları kalıcı olarak silindi kabul edilir. */
export async function handleLegacyForum(
  _req: NextRequest,
  pathname: string
): Promise<NextResponse | null> {
  if (pathname !== "/forum" && !pathname.startsWith("/forum/")) return null;

  // Forum bölümü tamamen kaldırıldı. Hangi alt yol veya slug olursa olsun
  // blog'a anlamsız yönlendirme yapma; kalıcı olarak silinmiş URL olarak 410 ver.
  let clean = pathname.replace(/(?:\.html)+$/i, "");
  if (clean.length > 1) clean = clean.replace(/\/+$/, "");

  return buildGoneResponse(clean) as unknown as NextResponse;
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
 *
 * YOL İSTİSNASI: admin bu kalıplardan birinin altında bir sayfayı yayına
 * aldıysa (ör. `/page/hakkinda-imiz`) yayın, yönlendirmeden önce gelir;
 * `isPublishedTreePath` `null` döndürür ve isteği rota çözer.
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
