/**
 * Dynamic Sitemap — /sitemap.xml
 *
 * Next.js App Router MetadataRoute.Sitemap ile otomatik XML üretimi.
 * Google'a gönderilecek tüm URL'leri, lastModified ve changeFrequency
 * bilgileriyle birlikte döndürür.
 *
 * Kapsam:
 *  - Yayınlanmış `pages` kayıtları — kategori/konu/sayfa/hizmet (URL,
 *    `canonicalPathForNode` ile üretilir)
 *  - İndekslenebilir konum rotaları ve ayrı `blogs` tablosundaki blog yazıları
 *  - Blog listesi (`/blog`) ayrı route olarak kalır.
 *
 * Canonical paths come from `@/lib/content-path`; legacy `.html` database
 * values are normalized before they are emitted.
 *
 * Mimari kural (MIMARI.md §8): Sitemap'e YALNIZCA NeonDB'deki aktif
 * kayıtlardan türeyen URL'ler girer. Statik slug listesi / fallback kullanılmaz;
 * böylece DB'den silinen veya pasifleştirilen içerik, sitemap (ISR) yeniden
 * oluştuğunda otomatik olarak düşer.
 */

import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import pool from "@/lib/db/pool";
import { getPublishedDistrictPageSlugs } from "@/lib/pages/published";
import { SITE_URL } from "@/lib/site-url";
import {
  CONTENT_PAGE_KIND_SQL,
  canonicalPathForNode,
  serviceLocationPath,
} from "@/lib/content-path";
import { pageCacheKey, withPageCache } from "@/lib/redis/page-cache";


// Build aşamasında database.ts mock DB kullandığı için sitemap'i build sırasında
// ÜRETME (aksi halde sadece statik çerçeve URL'leri kalır ve DB tablolarından
// türeyen hizmet/blog/ürün/ilçe sayfaları sitemap'e hiç girmez). `force-dynamic`
// ile sitemap her istekte runtime'da gerçek Neon tablolarından üretilir; ağır
// sorgular `unstable_cache` (1 saat) ile önbelleklendiğinden DB yükü artmaz.
export const dynamic = "force-dynamic";

// ── Blog slug + updated_at ─────────────────────────────────────────────────
async function getBlogEntries(): Promise<Array<{ slug: string; updatedAt: Date }>> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { rows } = await pool.query<{ slug: string; updated_at: Date }>(
      `SELECT slug, updated_at
       FROM Blog_posts
       WHERE status = 'published'
         AND deleted_at IS NULL
       ORDER BY updated_at DESC
      LIMIT 50000`,
    );
    return rows.map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
  } catch {
    return [];
  }
}

async function getLocalDistrictPageEntries(): Promise<Array<{ slug: string; sehir: string; updatedAt: Date }>> {
  try {
    return await getPublishedDistrictPageSlugs();
  } catch {
    return [];
  }
}

// `force-dynamic` sitemap her istekte çalıştığı için tablo sorgularını 1 saat
// `unstable_cache` ile sar; böylece Neon'a gereksiz yük binmez.
const getCachedBlogEntries = unstable_cache(
  getBlogEntries,
  ["sitemap-blog-entries"],
  { revalidate: 3600, tags: ["sitemap", "blog"] },
);
// Blog listing date remains in its separate page_meta record. Content pages
// use `pages.updated_at` through the unified query below.
async function getStaticPageDates(): Promise<Record<string, Date>> {
  if (!process.env.DATABASE_URL) return {};
  try {
    const { rows } = await pool.query<{ category: string; updated_at: Date }>(
      `SELECT category, MAX(updated_at) AS updated_at
         FROM xip_dynamic_content
        WHERE content_type = 'page_meta'
          AND is_active = TRUE
          AND deleted_at IS NULL
        GROUP BY category`,
    );
    return Object.fromEntries(rows.map((row) => [row.category, row.updated_at]));
  } catch {
    return {};
  }
}

const getCachedStaticPageDates = unstable_cache(
  getStaticPageDates,
  ["sitemap-static-page-dates"],
  { revalidate: 3600, tags: ["sitemap", "page-content"] },
);

// ── Tek çatı: yayınlanmış ağaç (kategori/konu/sayfa) + hizmet satırları ───────
// Planlanan hedef: içerik türü NE OLURSA OLSUN sitemap satırı `pages`'ten türer ve
// URL'i rota/middleware ile AYNI fonksiyondan (`canonicalPathForNode`) doğar.
//
// `location` BİLREK DIŞARIDA: il/ilçe indeksleme listesi küratelidir (elle yazılmış
// içerik + `PRIORITY_DISTRICTS`; bkz. `getPublishedDistrictPageSlugs` ve aşağıdaki
// `locationPages`). Çatı sorgusu `pages`'teki 2009 konum satırının tamamını veriyor,
// rota ise bir kısmını 308 ile merkez ilçeye taşıyor (ör.
// `/hizmetler/devops-sre/mersin` → `mersin-akdeniz`). Sitemap redirect URL'i yayınlamaz,
// bu yüzden konum adresleri route index'inden (`url_slug` = final adres) türer.
//
// `canonical_url` (CMS'te yazılan tam adres) doluysa O kullanılır: admin kanonik
// değiştirdiğinde sitemap de değişir. Harici host'lu değer yok sayılır.
async function getUnifiedPageEntries(): Promise<Array<{ path: string; kind: string; updatedAt: Date }>> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { rows } = await pool.query<{
      full_path: string;
      kind: string;
      updated_at: Date;
      canonical_url: string | null;
    }>(
      `SELECT full_path, kind, updated_at, canonical_url
         FROM pages
        WHERE kind IN (${CONTENT_PAGE_KIND_SQL}, 'service')
          AND is_deleted = FALSE
          AND status = 'published'
          AND is_indexable = TRUE
          AND full_path IS NOT NULL
        ORDER BY updated_at DESC
       LIMIT 50000`,
    );
    return rows.map((row) => ({
      path:
        sitePathFromCanonicalUrl(row.canonical_url) ??
        canonicalPathForNode({ fullPath: row.full_path, kind: row.kind }),
      kind: row.kind,
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
}

/**
 * `pages.canonical_url` → site-yöreli yol. Yalnızca kendi sitemize işaret eden
 * mutlak adresler kabul edilir; harici/bozuk değer `undefined` döner ve çağıran
 * türetilmiş kanonike düşer (sitemap asla başka domain'e URL yazmaz).
 */
function sitePathFromCanonicalUrl(raw: string | null): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value, SITE_URL);
    if (url.origin !== new URL(SITE_URL).origin) return undefined;
    const path = url.pathname.replace(/\/+$/, "").replace(/(?:\.html)+$/i, "");
    return path || "/";
  } catch {
    return undefined;
  }
}

const getCachedUnifiedPages = unstable_cache(
  getUnifiedPageEntries,
  ["sitemap-unified-pages-v5"],
  { revalidate: 3600, tags: ["sitemap", "content-tree", "services", "local-pages"] },
);

/**
 * The blog listing is separate from the pages content tree.
 */
const STATIC_PAGES: Array<{ path: string; category: string }> = [
  { path: "/blog", category: "blog" },
];

// ── Ana sitemap ────────────────────────────────────────────────────────────
async function buildSitemap(): Promise<MetadataRoute.Sitemap> {
  // Statik sayfaların GERÇEK güncelleme tarihleri (DB page_meta kayıtlarından).
  const staticPageDates = await getCachedStaticPageDates();

  // Statik çerçeve sayfaları (kod rotaları, uzantısız kanonik). Eskiden yalnızca
  // `/blog` süzülüyordu → hub ve diğer çerçeveler sitemap'te hiç yoktu.
  const staticFramePages: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, category }) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    lastModified: staticPageDates[category],
  }));

  // ── Dinamik: yayınlanmış ilçe/şehir sayfaları ───────────────────────────
  // Yalnızca manuel olarak yazılmış, yayınlanmış ve indekslenebilir yerel
  // sayfalar sitemap'e girer; template/AI kaynaklı noindex sayfalar dışarıda kalır.
  const locationPages: MetadataRoute.Sitemap = (await getLocalDistrictPageEntries()).map(
    ({ slug, sehir, updatedAt }) =>
      toEntry(`${SITE_URL}${serviceLocationPath(slug, sehir)}`, updatedAt),
  );

  // Dinamik: blog yazıları
  const blogEntries = await getCachedBlogEntries();

  // Dinamik: tek çatı `pages` — kategori/konu/sayfa + hizmet/konum satırları.
  // Kanonik yolu rota ve middleware ile AYNI fonksiyon üretir; tür kararı
  // (`kind`) satırın kendisinden gelir, burada elle sınıflandırılmaz.
  const unifiedPages: MetadataRoute.Sitemap = (await getCachedUnifiedPages()).map(
    ({ path, updatedAt }) => toEntry(`${SITE_URL}${path}`, updatedAt),
  );

  // Yayınlanmış TÜM blog yazıları listelenir (ince içerik de indexlenir; bkz.
  // blog/[slug]/page.tsx indeksleme politikası). Sitemap ile robots direktifleri
  // senkron kalır: noindex URL sitemap'e yazılmaz, sitemap URL'i noindex olmaz.
  const blogPages: MetadataRoute.Sitemap = blogEntries.map(({ slug, updatedAt }) =>
    toEntry(`${SITE_URL}/blog/${slug}`, updatedAt),
  );

  // NOT: /forum bölümü tamamen kaldırıldı; sitemap'e forum URL'i girmez. Eski
  // forum linkleri middleware'de 301 ile /blog/<slug> adresine bağlanır.

  return dedupeSitemap([
    ...staticFramePages,
    ...locationPages,
    ...blogPages,
    ...unifiedPages,
  ]);
}

type SitemapEntry = MetadataRoute.Sitemap[number];

/**
 * Sitemap yanıtı Redis'te 1 saat tutulur (bkz. `page:sitemap:{hash}`).
 *
 * JSON'a yazılırken `lastModified` Date'i ISO metnine döner; okuma tarafında
 * geri çevrilir — aksi halde Next XML üretirken `.toISOString()` çağrısını
 * string üzerinde çalıştırıp patlar.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await withPageCache(
    pageCacheKey("sitemap", "root-v3"),
    async () =>
      (await buildSitemap()).map(({ lastModified, ...rest }) => ({
        ...rest,
        lastModified: lastModified ? new Date(lastModified).toISOString() : null,
      })),
    { ttl: 60 * 60 },
  );
  return entries.map(({ lastModified, ...rest }) => ({
    ...rest,
    lastModified: lastModified ? new Date(lastModified) : undefined,
  })) as MetadataRoute.Sitemap;
}

/** Statik şekilli sitemap girdisi üretir (tüm dinamik kaynaklar için ortak). */
export function toSitemapEntry(url: string, lastModified: Date): SitemapEntry {
  return { url, lastModified };
}

function toEntry(url: string, lastModified: Date): SitemapEntry {
  return toSitemapEntry(url, lastModified);
}

function dedupeSitemap(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());
}
