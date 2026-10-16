/**
 * Dynamic Sitemap — /sitemap.xml
 *
 * Next.js App Router MetadataRoute.Sitemap ile otomatik XML üretimi.
 * Google'a gönderilecek tüm URL'leri, lastModified ve changeFrequency
 * bilgileriyle birlikte döndürür.
 *
 * Kapsam:
 *  - Statik sayfalar (ana sayfa, hizmetler, hakkımızda, iletişim, vb.)
 *  - Dinamik: /blog/[slug]   → Blog_posts tablosundan
 *  - Dinamik: /hizmetler/[slug] → services tablosu (is_active = true)
 *  - Dinamik: /hizmetler/[slug]/[sehir] → pages tablosu (status=published, tüm source_type) + service_city_seo
 *
 * Mimari kural (MIMARI.md §8): Sitemap'e YALNIZCA NeonDB'deki aktif
 * kayıtlardan türeyen URL'ler girer. Statik slug listesi / fallback kullanılmaz;
 * böylece DB'den silinen veya pasifleştirilen içerik, sitemap (ISR) yeniden
 * oluştuğunda otomatik olarak düşer.
 */

import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import pool from "@/lib/database";
import { getPublishedDistrictPageSlugs } from "@/lib/pages";
import { getAllPublishedServiceCities } from "@/lib/database";
import { SITE_URL } from "@/lib/site-url";


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

// ── Hizmet slug + updated_at ──────────────────────────────────────────────

async function getServiceEntries(): Promise<Array<{ slug: string; updatedAt: Date }>> {
  // Mimari kural (MIMARI.md §8): sitemap'e yalnızca NeonDB'deki aktif
  // hizmetler girer. Statik `FALLBACK_SERVICE_SLUGS` listesine DÜŞÜLMEZ;
  // aksi halde DB'den silinen/pasifleştirilen bir hizmet sitemap'te kalır ve
  // GSC'de "Bulunamadı (404)" üretir.
  if (!process.env.DATABASE_URL) return [];

  try {
    const { rows } = await pool.query<{ slug: string; updated_at: Date | null }>(
      `SELECT slug, updated_at
       FROM services
       WHERE is_active = true
       ORDER BY sort_order ASC`,
    );

    return rows.map((row) => ({
      slug: row.slug,
      updatedAt: row.updated_at ?? new Date(),
    }));
  } catch (error) {
    console.warn(
      "[sitemap] service lookup unavailable, emitting no service URLs:",
      error instanceof Error ? error.message : error,
    );
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
const getCachedServiceEntries = unstable_cache(
  getServiceEntries,
  ["sitemap-service-entries"],
  { revalidate: 3600, tags: ["sitemap", "services"] },
);
const getCachedBlogEntries = unstable_cache(
  getBlogEntries,
  ["sitemap-blog-entries"],
  { revalidate: 3600, tags: ["sitemap", "blog"] },
);
// Hizmet × şehir (service_city_seo) yayınlanmış şehir sayfaları.
const getCachedServiceCityEntries = unstable_cache(
  getAllPublishedServiceCities,
  ["sitemap-service-city-entries"],
  { revalidate: 3600, tags: ["sitemap", "service-city-seo"] },
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
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Statik sayfaların GERÇEK güncelleme tarihleri (DB page_meta kayıtlarından).
  const staticPageDates = await getCachedStaticPageDates();

  const staticPages: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, category }) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    lastModified: staticPageDates[category],
  }));

  // Dinamik: hizmet sayfaları
  const serviceEntries = await getCachedServiceEntries();
  const servicePages: MetadataRoute.Sitemap = serviceEntries.map(({ slug, updatedAt }) =>
    toEntry(`${SITE_URL}/hizmetler/${slug}`, updatedAt),
  );

  // ── Dinamik: yayınlanmış ilçe/şehir sayfaları ───────────────────────────
  // Yalnızca manuel olarak yazılmış, yayınlanmış ve indekslenebilir yerel
  // sayfalar sitemap'e girer; template/AI kaynaklı noindex sayfalar dışarıda kalır.
  const districtPages: MetadataRoute.Sitemap = (await getLocalDistrictPageEntries()).map(
    ({ slug, sehir, updatedAt }) =>
      toEntry(`${SITE_URL}/hizmetler/${slug}/${sehir}`, updatedAt),
  );

  const serviceCityPages: MetadataRoute.Sitemap = (await getCachedServiceCityEntries()).map(
    ({ serviceSlug, citySlug, updatedAt }) =>
      toEntry(`${SITE_URL}/hizmetler/${serviceSlug}/${citySlug}`, updatedAt),
  );

  // Dinamik: blog yazıları
  const blogEntries = await getCachedBlogEntries();

  // Yayınlanmış TÜM blog yazıları listelenir (ince içerik de indexlenir; bkz.
  // blog/[slug]/page.tsx indeksleme politikası). Sitemap ile robots direktifleri
  // senkron kalır: noindex URL sitemap'e yazılmaz, sitemap URL'i noindex olmaz.
  const blogPages: MetadataRoute.Sitemap = blogEntries.map(({ slug, updatedAt }) =>
    toEntry(`${SITE_URL}/blog/${slug}`, updatedAt),
  );

  // NOT: /forum bölümü tamamen kaldırıldı; sitemap'e forum URL'i girmez. Eski
  // forum linkleri middleware'de 301 ile /blog/<slug> adresine bağlanır.

  return dedupeSitemap([
    ...staticPages,
    ...servicePages,
    ...districtPages,
    ...serviceCityPages,
    ...blogPages,
  ]);
}

type SitemapEntry = MetadataRoute.Sitemap[number];

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
