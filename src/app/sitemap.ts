/**
 * Dynamic Sitemap — /sitemap.xml
 *
 * Next.js App Router MetadataRoute.Sitemap ile otomatik XML üretimi.
 * Google'a gönderilecek tüm URL'leri, lastModified ve changeFrequency
 * bilgileriyle birlikte döndürür.
 *
 * Kapsam (DB'den türeyen TEK liste):
 *  - `/hizmetler` hub'ı + aktif ana hizmet detayı (`services.row_type='main'`)
 *  - Yayınlanmış, indekslenebilir il/İstanbul ilçe (hizmet × konum) sayfaları
 *  - Hiyerarşik içerik ağacı (kategori/sayfa, `kind='custom'`) — `.html` kanonik
 *  - `/blog` ve yayınlanmış `/blog/[slug]` yazıları (URL biçimi uzantısız)
 *
 * Kanonik uzantı kararı `@/lib/content-path` fonksiyonlarından gelir; burada
 * `.html` elle yazılmaz (policy ile sitemap arasında sapma oluşmasın).
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
  serviceLocationPath,
  servicePath,
  treeNodeCanonicalPath,
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

// ── Aktif ana hizmet detay sayfaları ────────────────────────────────────────
// `row_type='main'` satırları pillar sayfalar; bunlar sitemap'te eksikti,
// yani hizmetler yalnızca konum varyasyonlarıyla (hizmet × il) listeleniyordu.
async function getActiveServiceEntries(): Promise<Array<{ slug: string; updatedAt: Date }>> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { rows } = await pool.query<{ slug: string; updated_at: Date }>(
      `SELECT slug, updated_at
         FROM services
        WHERE row_type = 'main'
          AND is_active = TRUE
          AND is_deleted = FALSE
        ORDER BY updated_at DESC`,
    );
    return rows.map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
  } catch {
    return [];
  }
}

const getCachedActiveServices = unstable_cache(
  getActiveServiceEntries,
  ["sitemap-active-services-v1"],
  { revalidate: 3600, tags: ["sitemap", "services"] },
);

// `force-dynamic` sitemap her istekte çalıştığı için tablo sorgularını 1 saat
// `unstable_cache` ile sar; böylece Neon'a gereksiz yük binmez.
const getCachedBlogEntries = unstable_cache(
  getBlogEntries,
  ["sitemap-blog-entries"],
  { revalidate: 3600, tags: ["sitemap", "blog"] },
);
// ── Statik sayfa içerik tarihleri ────────────────────────────────────────────
// Statik sayfaların metinleri `xip_dynamic_content` (content_type='page_meta')
// tablosunda tutulur. Sitemap'e HER İSTEKTE `new Date()` yazmak yerine sayfanın
// GERÇEK içerik güncelleme tarihini (`updated_at`) kullanırız. Böylece
// `lastModified` güvenilir bir sinyal olur; sürekli "bugün güncellendi" demek
// arama motoru tarafında güvenilirliği düşürür. Kayıt yoksa `lastModified`
// alanı hiç yazılmaz (uydurma tarih üretilmez).
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

// ── Hiyerarşik içerik ağacı (kategori/sayfa) ─────────────────────────────────
// Yalnızca yayınlanmış, indekslenebilir, kanonik biçimi `.html` olan özel
// ağaç düğümleri listelenir. Eski hizmet×konum satırları (kind='location')
// `/hizmetler/...` akışında ayrıca ele alınır; burada tekrarlanmaz.
async function getContentTreeEntries(): Promise<Array<{ fullPath: string; updatedAt: Date }>> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { rows } = await pool.query<{ full_path: string; updated_at: Date }>(
      `SELECT full_path, updated_at
         FROM pages
        WHERE kind = 'custom'
          AND is_deleted = FALSE
          AND status = 'published'
          AND is_indexable = TRUE
          AND full_path IS NOT NULL
        ORDER BY updated_at DESC
       LIMIT 50000`,
    );
    return rows.map((row) => ({ fullPath: row.full_path, updatedAt: row.updated_at }));
  } catch {
    return [];
  }
}

const getCachedContentTreeEntries = unstable_cache(
  getContentTreeEntries,
  ["sitemap-content-tree-entries-v1"],
  { revalidate: 3600, tags: ["sitemap", "content-tree"] },
);

/**
 * Statik çerçeve rotaları → `xip_dynamic_content.page_meta` kategori eşlemesi.
 * `category`, sayfanın içerik kaydının DB'deki anahtarıdır; lastModified
 * doğrudan o kaydın güncelleme tarihinden gelir.
 */
const STATIC_PAGES: Array<{ path: string; category: string }> = [
  { path: "/", category: "home" },
  { path: "/hizmetler", category: "hizmetler" },
  { path: "/blog", category: "blog" },
  { path: "/hakkimizda", category: "hakkimizda" },
  { path: "/contact-us", category: "contact" },
  { path: "/references", category: "references" },
  { path: "/istanbul-yazilim-sirketi", category: "istanbul-yazilim-sirketi" },
  { path: "/privacy-policy", category: "privacy-policy" },
  { path: "/terms-of-service", category: "terms-of-service" },
  { path: "/cookie-policy", category: "cookie-policy" },
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

  // ── Dinamik: aktif ana hizmetler (pillar detay sayfaları) ─────────────────
  const servicePages: MetadataRoute.Sitemap = (await getCachedActiveServices()).map(
    ({ slug, updatedAt }) => toEntry(`${SITE_URL}${servicePath(slug)}`, updatedAt),
  );

  // ── Dinamik: yayınlanmış ilçe/şehir sayfaları ───────────────────────────
  // Yalnızca manuel olarak yazılmış, yayınlanmış ve indekslenebilir yerel
  // sayfalar sitemap'e girer; template/AI kaynaklı noindex sayfalar dışarıda kalır.
  const locationPages: MetadataRoute.Sitemap = (await getLocalDistrictPageEntries()).map(
    ({ slug, sehir, updatedAt }) =>
      toEntry(`${SITE_URL}${serviceLocationPath(slug, sehir)}`, updatedAt),
  );

  // Dinamik: blog yazıları
  const blogEntries = await getCachedBlogEntries();

  // Dinamik: hiyerarşik içerik ağacı (kategori + sayfa). Kanonik yol tek
  // kaynaktan (`treeNodeCanonicalPath`) türer → ağaçla politika sapamaz.
  const contentTreePages: MetadataRoute.Sitemap = (await getCachedContentTreeEntries()).map(
    ({ fullPath, updatedAt }) =>
      toEntry(`${SITE_URL}${treeNodeCanonicalPath(fullPath)}`, updatedAt),
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
    ...servicePages,
    ...locationPages,
    ...blogPages,
    ...contentTreePages,
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
    pageCacheKey("sitemap", "root"),
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
