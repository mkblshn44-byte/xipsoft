/**
 * content-path.ts — İçerik ağacı yol/uzantı yardımcıları (SAF modül).
 *
 * Burada HİÇBİR server-only bağımlılık (db, next/cache) bulunmaz; hem server
 * resolver'ı (`content-tree.ts`) hem de admin CLIENT bileşenleri aynı kanonik
 * URL kurallarını paylaşsın diye ayrıldı.
 */
import { slugify } from "@/utils/slugify";

/** İçerik sayfalarının kanonik uzantısı. */
export const CONTENT_EXTENSION = ".html";

/**
 * İçerik ağacı için güvenlik üst sınırı. Ürün kararı: kategori modeli bir
 * derinlik sınırı getirmez; bu değer yalnızca kötü niyetli/hatalı URL'leri
 * (aşırı uzun yollar) erken elemek için bir korumadır.
 */
export const MAX_CONTENT_SEGMENTS = 32;

/**
 * Kanonik adresi UZANTISIZ kalan KOD rotaları (tam eşleşme).
 *
 * Ayrım bilinçli: `.html` kanonisi admin'in `pages` ağacına YENİ yazdığı
 * içerik adresleridir (`kind='custom'` düğümleri). Kodda yazılı bir `page.tsx`
 * şablonuyla sunulan çerçeve sayfaları (`/`, `/hakkimizda`, politika sayfaları)
 * uzantısız kalır.
 *
 * `/hizmetler` burada EXACT, altında `EXTENSIONLESS_ROUTE_PREFIXES` içinde
 * durur: hub ve altındaki eski hizmet/konum adresleri canlıda uzantısız
 * kanoniktir; yalnız admin'in o kök altına açtığı `kind='custom'` düğümü
 * `.html` kanonik alır.
 */
export const EXTENSIONLESS_ROUTE_EXACT: ReadonlyArray<string> = [
  "/",
  "/hizmetler",
  "/blog",
  "/hakkimizda",
  "/contact-us",
  "/references",
  "/istanbul-yazilim-sirketi",
  "/privacy-policy",
  "/terms-of-service",
  "/cookie-policy",
];

/**
 * Kökü ve tüm alt yolları uzantısız kanonik olan rotalar.
 *
 * ÖLÇÜLMÜŞ CANLI DURUM (19.10.2026, xipsoft.net): `/hizmetler/<hizmet>/<lokasyon>`
 * adreslerinin kanoniği UZANTISIZDIR; `.html`li istek 301 ile uzantısıza düşer
 * (deploy edilmiş middleware her `.html`i söküyordu — HEAD
 * `middleware-utils/index.ts:78`). Bu liste o tasarımı korur.
 *
 * DÖNGÜ KORUMASI: ağacın `.html` olarak SAHİPLENDİĞİ (`kind='custom'`) alt
 * yollar buraya eklenemez — middleware uzantıyı söker, rota geri ekler. O
 * sahiplenme `EXTENSIONLESS_ROUTE_EXACT` + `isPublishedTreePath` üzerinden
 * verildiği için `/hizmetler` güvenlidir: eski hizmet/konum satırları
 * (`kind='service' | 'location'`) ağaç tarafından sahiplenilmez, admin'in yeni
 * açtığı `kind='custom'` düğümünde ise `isPublishedTreePath` true döner ve
 * `.html` korunur.
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
 * Veriden türeyen ".html kanonik" kararını enjekte etmek için seçenek.
 *
 * Modül SAF kalmak zorunda (admin CLIENT bileşenleri de import ediyor), o
 * yüzden `pages` sorgusu burada yapılmaz; çağıran taraf (middleware / server
 * resolver) DB önbelleğinden bildiği cevabı fonksiyona verir.
 *
 * `isTreeOwned(path)`: `path` uzantısız, baş eğik çizgili yoldur. Yayınlanmış
 * bir içerik ağacı düğümüne karşılık geliyorsa `true` döner — o zaman adres
 * `.html` KANONİKTİR ve `EXTENSIONLESS_ROUTE_PREFIXES` (elle tutulan legacy
 * liste) geçersizdir.
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
 * Bu yol için `.html` kararı VERİDEN değişebilir mi?
 *
 * Yani: EXACT kod rotası değil ama legacy önek listesinde duruyor. Yalnızca
 * bu yollarda ağaç sahipliğini sorgulamak sonucu değiştirir; diğerlerinde
 * sahiplik ya hiç uygulanamaz (EXACT önce kazanır) ya da karar zaten `.html`.
 * Çağıran taraflar (middleware, redirect okuması) gereksiz DB sorgusunu bununla eler.
 */
export function isDataDependentExtensionless(pathname: string): boolean {
  const normalized = toRouteKey(pathname);
  if (EXTENSIONLESS_ROUTE_EXACT.includes(normalized)) return false;
  return EXTENSIONLESS_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

/**
 * Verilen (uzantısı sökülmüş) yol uzantısız kanoniğe sahip bir kod/legacy
 * rotasına mı ait? Öyleyse bu rotalarda `.html` sökülür, ağaç düğümlerinde
 * korunur.
 *
 * Sıra bilinçli: EXACT (kod rotaları) her zaman kazanır → `/hizmetler` hub'ı,
 * `/blog` listesi ağaç tarafından alınamaz. Sonra VERİ (yayınlanmış düğüm)
 * gelir; legacy liste yalnızca ikisi de "hayır" derken son çare olarak
 * kullanılır.
 */
export function isExtensionlessRoute(
  pathname: string,
  policy?: ExtensionlessPolicy,
): boolean {
  const normalized = toRouteKey(pathname);
  if (EXTENSIONLESS_ROUTE_EXACT.includes(normalized)) return true;
  if (policy?.isTreeOwned?.(normalized)) return false;
  return EXTENSIONLESS_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export type TreeNodeType = "page" | "category";
export type TreeStatus = "draft" | "review" | "published" | "paused";

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
 * `full_path`'ten kanonik (baş eğik çizgili) URL yolu.
 *
 *   "haberler/gundem"                → "/haberler/gundem.html"
 *   "hizmetler/mobil-uygulama"       → "/hizmetler/mobil-uygulama.html"
 *   "hizmetler" (kök kategori hub'ı) → "/hizmetler"  (kod rotası, uzantısız)
 *
 * Politika tek kaynak burasıdır: middleware (`seo-normalize`), kök catch-all,
 * `hizmetler/[...slug]`, sitemap, JSON-LD ve admin ekranları SAME fonksiyonu
 * çağırır. Böylece bir tarafın `.html` ekleyip diğer tarafın sökmesi
 * (yönlendirme döngüsü) yapısal olarak imkânsızlaşır.
 */
export function contentCanonicalPath(
  fullPath: string,
  policy?: ExtensionlessPolicy,
): string {
  const clean = stripContentExtension(fullPath)
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  const asPath = `/${clean}`;
  return isExtensionlessRoute(asPath, policy) ? asPath : `${asPath}${CONTENT_EXTENSION}`;
}

/**
 * Bir içerik ağacı DÜĞÜMÜNÜN kanonik adresi.
 *
 * Düğüm verinin kendisidir: `pages` içinde yayınlanmış bir satır bulunduktan
 * sonra onun adresi `.html` ile biter — elle tutulan legacy liste
 * (`EXTENSIONLESS_ROUTE_PREFIXES`) bu kararı ezemez. Aynı kural middleware'i
 * `content-tree-policy.ts` üzerinden de sahipler (o yol için `.html`i sökmez
 * ve legacy 301'i atlar), yani rota ↔ middleware ↔ sitemap ↔ admin linkleri
 * yapısal olarak aynı adresi üretir.
 *
 * Kanonik adresi uzantısız KOD rotaları (`EXTENSIONLESS_ROUTE_EXACT`) önce
 * geldiği için bu helper onlarda `.html` eklemez; admin doğrulaması
 * (`content-tree-admin.validateFullPath`) o yollarda zaten düğüm yaratmaya
 * izin vermez.
 */
export const TREE_NODE_POLICY: ExtensionlessPolicy = { isTreeOwned: () => true };

export function treeNodeCanonicalPath(fullPath: string): string {
  return contentCanonicalPath(fullPath, TREE_NODE_POLICY);
}

/**
 * Bir `pages` düğümünün kanonik URL yolu — `kind`'e göre ikiye ayrılır.
 *
 * `kind='custom'` (admin'in ağaçtan yarattığı içerik): `.html` kanonik.
 * Middleware aynı düğümü sahiplenme filtresiyle gördüğü için uzantıyı sökmez
 * → iki taraf anlaşır.
 *
 * `kind='service' | 'location'` (konsolide edilmiş eski hizmet/konum
 * satırları): canlıda ölçülmüş kanonik UZANTISIZ. Bu satırlar sahiplenme
 * filtresinde DURMAZ, dolayısıyla middleware `.html`i söker; rota da aranan
 * yolu `EXTENSIONLESS_ROUTE_PREFIXES` kararıyla uzantısız üretir. Tersine
 * `.html` üretseydi middleware sökerdi → yönlendirme döngüsü.
 *
 * Bu helper `content-path` içinde durur (DB bağımlılığı yok): yazar (admin
 * aksiyonları), okuyucu (rotalar), sitemap ve admin linkleri aynı kararı aynı
 * kaynaktan üretir.
 */
export function canonicalPathForNode(node: { fullPath: string; kind: string }): string {
  return node.kind === "custom"
    ? treeNodeCanonicalPath(node.fullPath)
    : contentCanonicalPath(node.fullPath);
}

/**
 * Hizmet/konum içerik adreslerinin kanonik yolu.
 *
 * Kodda sabit uzantı yazılmasın diye TEK kaynak: `contentCanonicalPath`
 * karar verir, `/hizmetler` ise `EXTENSIONLESS_ROUTE_PREFIXES` içinde
 * durduğu için bu iki helper UZANTISIZ üretir (canlı tasarım). Admin'in aynı
 * kök altına açtığı `kind='custom'` düğümünün kanoniği ağaç üzerinden
 * (`treeNodeCanonicalPath`) hesaplanır ve `.html` kalır.
 */
export function servicePath(slug: string): string {
  return contentCanonicalPath(`hizmetler/${slug}`);
}

/** Hizmet × konum (il/ilçe) sayfasının kanonik yolu. */
export function serviceLocationPath(slug: string, locationSlug: string): string {
  return contentCanonicalPath(`hizmetler/${slug}/${locationSlug}`);
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
