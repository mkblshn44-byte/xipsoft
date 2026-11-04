/**
 * content-path.ts — İçerik ağacı yol/uzantı yardımcıları (SAF modül).
 *
 * Burada HİÇBİR server-only bağımlılık (db, next/cache) bulunmaz; hem server
 * resolver'ı (`content-tree.ts`) hem de admin CLIENT bileşenleri aynı kanonik
 * URL kurallarını paylaşsın diye ayrıldı.
 */
import { slugify } from "@/utils/slugify";

/** Canonical content URLs have no extension; `.html` remains accepted as legacy input. */
export const CONTENT_EXTENSION = "";

/**
 * İçerik ağacı için güvenlik üst sınırı. Ürün kararı: kategori modeli bir
 * derinlik sınırı getirmez; bu değer yalnızca kötü niyetli/hatalı URL'leri
 * (aşırı uzun yollar) erken elemek için bir korumadır.
 */
export const MAX_CONTENT_SEGMENTS = 32;

/**
 * Legacy integrations still import these classifications. Every route now
 * uses an extensionless canonical URL.
 */
export const EXTENSIONLESS_ROUTE_EXACT: ReadonlyArray<string> = [
  "/",
  "/blog",
];

/**
 * Legacy route prefixes retained for compatibility; they no longer determine
 * canonical extension behavior.
 */
export const EXTENSIONLESS_ROUTE_PREFIXES: ReadonlyArray<string> = [
  "/blog",
  "/hizmetler",
  "/urunler",
  "/products",
  "/services",
  "/news",
  "/posts",
  "/article",
  "/forum",
];

/**
 * Legacy callback type retained for redirect callers.
 *
 * Modül SAF kalmak zorunda (admin CLIENT bileşenleri de import ediyor), o
 * yüzden `pages` sorgusu burada yapılmaz; çağıran taraf (middleware / server
 * resolver) DB önbelleğinden bildiği cevabı fonksiyona verir.
 *
 * `isTreeOwned(path)`: `path` uzantısız, baş eğik çizgili yoldur. Yayınlanmış
 * a content tree node. Canonical URL generation no longer depends on it.
 */
export interface ExtensionlessPolicy {
  isTreeOwned?: (path: string) => boolean;
}

/**
 * Pathname'i politika anahtarına indirger: `.html` (ve tekrarları), sondaki
 * slash, boş yol. Karşılaştırmalar bu biçim üzerinden yapılır.
 */
export function toRouteKey(pathname: string): string {
  const path = stripContentExtension(pathname || "/");
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * Extensionless policy is global, so no path needs a data-dependent lookup.
 */
export function isDataDependentExtensionless(_pathname: string): boolean {
  return false;
}

/** All routes use an extensionless canonical URL. */
export function isExtensionlessRoute(
  _pathname: string,
  _policy?: ExtensionlessPolicy,
): boolean {
  return true;
}

export type TreeNodeType = "page" | "category";
export type TreeStatus = "draft" | "review" | "published" | "paused";
export type ContentPageKind = "category" | "topic" | "sayfakonu" | "page";

/** Legacy `custom` rows and unified page kinds share the same canonical policy. */
export const CONTENT_PAGE_KIND_SQL = "'custom', 'category', 'topic', 'sayfakonu', 'page'";

export function isContentPageKind(kind: string): boolean {
  return kind === "custom" || kind === "category" || kind === "topic" ||
    kind === "sayfakonu" || kind === "page";
}

export const TREE_STATUSES: ReadonlyArray<TreeStatus> = ["draft", "review", "published", "paused"];

/** Tek bir yolun/segmentin sonundaki `.html` (ve tekrarlarını) söker. */
export function stripContentExtension(value: string): string {
  return value.replace(/(?:\.html)+$/i, "");
}

/** Tek bir segmenti slug'a çevirir (`.html` önce sökülür). */
export function normalizeContentSlug(value: string): string {
  return slugify(stripContentExtension(String(value ?? "")));
}

/**
 * Hizmet×konum sayfasının ağaçtaki tam yolu.
 *
 * `pages.full_path` üretilen (generated) bir kolon DEĞİL ve default'u NULL —
 * eski satırlar tek seferlik konsolidasyon SQL'i ile dolduruldu. Bu yüzden
 * `pages`'e lokasyon satırı EKLEYEN/GÜNCELLEYEN her yazıcı bu kuralı
 * kendisi uygulamalı; aksi halde satır ağaç çözümleyicisinin
 * (`full_path IS NOT NULL`) dışında kalır ve kök catch-all'a taşındığında
 * 404 olur.
 */
export function locationTreeFullPath(slug: string): string {
  const clean = normalizeContentPath(String(slug ?? "").split("/"));
  return clean ? `hizmetler/${clean}` : "";
}

/** Segment dizisini normalize edilmiş `full_path`'e çevirir; geçersizse null. */
export function normalizeContentPath(slugArray: string[]): string | null {
  if (!Array.isArray(slugArray) || slugArray.length === 0) return null;
  if (slugArray.length > MAX_CONTENT_SEGMENTS) return null;

  const parts: string[] = [];
  for (const raw of slugArray) {
    const normalized = normalizeContentSlug(String(raw ?? ""));
    if (!normalized || normalized.includes("/")) return null;
    parts.push(normalized);
  }
  return parts.join("/");
}

/**
 * `full_path`'ten kanonik (baş eğik çizgili, uzantısız) URL yolu.
 *
 * Politika tek kaynak burasıdır: middleware (`seo-normalize`), kök catch-all,
 * `hizmetler/[...slug]`, sitemap, JSON-LD ve admin ekranları SAME fonksiyonu
 * çağırır. Eski `.html` adresleri middleware tarafından bu yola yönlendirilir.
 */
export function contentCanonicalPath(
  fullPath: string,
  _policy?: ExtensionlessPolicy,
): string {
  const clean = stripContentExtension(fullPath)
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  const asPath = `/${clean}`;
  return asPath;
}

/** A content tree node's extensionless canonical URL. */
export const TREE_NODE_POLICY: ExtensionlessPolicy = { isTreeOwned: () => true };

export function treeNodeCanonicalPath(fullPath: string): string {
  return contentCanonicalPath(fullPath, TREE_NODE_POLICY);
}

/** A `pages` node's canonical URL; the homepage editor slug maps to `/`. */
export function canonicalPathForNode(node: { fullPath: string; kind: string }): string {
  if (node.fullPath === "anasayfa" && node.kind === "page") return "/";
  return treeNodeCanonicalPath(node.fullPath);
}

/** Canonical path for a service page. */
export function servicePath(slug: string): string {
  return contentCanonicalPath(`hizmetler/${slug}`);
}

/** Hizmet × konum (il/ilçe) sayfasının kanonik yolu. */
export function serviceLocationPath(slug: string, locationSlug: string): string {
  return contentCanonicalPath(`hizmetler/${slug}/${locationSlug}`);
}

/** İlçe URL'lerinde bağlı il slug'ını tek biçimde korur. */
export function canonicalLocationSlug(
  locationSlug: string,
  locationType: string | null | undefined,
  parentLocationSlug: string | null | undefined,
): string {
  if (
    locationType !== "district" ||
    !parentLocationSlug ||
    locationSlug.startsWith(`${parentLocationSlug}-`)
  ) {
    return locationSlug;
  }
  return `${parentLocationSlug}-${locationSlug}`;
}

/** İstenen yol, `full_path`'in kanonik biçimiyle birebir mi? */
export function isCanonicalContentRequest(
  pathname: string,
  fullPath: string,
  policy?: ExtensionlessPolicy,
): boolean {
  return normalizeRequestPath(pathname) === contentCanonicalPath(fullPath, policy);
}

/**
 * İstek yolunu karşılaştırmaya hazır biçime indirger: locale öneki ve trailing
 * slash sökülür, kök `/` korunur. (Middleware'in `normalized` değeriyle aynı
 * anlama gelir; route tarafı `pathname`'i ham aldığı için burada temizlenir.)
 */
export function normalizeRequestPath(pathname: string): string {
  const withoutLocale = pathname.replace(/^\/(?:tr|en|de|fr|es|ru)(?=\/|$)/, "") || "/";
  const withoutSlash =
    withoutLocale.length > 1 && withoutLocale.endsWith("/")
      ? withoutLocale.slice(0, -1)
      : withoutLocale;
  return withoutSlash || "/";
}
