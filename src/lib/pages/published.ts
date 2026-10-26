/**
 * pages/published.ts — Yayınlanmış sayfa çözümleme + sitemap segmentleri.
 */

import pool from "@/lib/db/pool";
import { unstable_cache } from "next/cache";
import { pageCacheKey, withPageCache } from "@/lib/redis/page-cache";
import { normalizePublishedPage, normalizeSlug } from "./hash";
import { toSchemaMarkup } from "@/lib/schema-markup";
import type { PublishedPage } from "./types";
import {
  isIndexableLocation,
  isKeepableLocation,
} from "@/config/priority-locations";

async function queryPublishedPageBySlug(
  normalizedPath: string,
): Promise<PublishedPage | null> {
  try {
    const { rows } = await pool.query<PublishedPage>(
      `SELECT
         id::text,
         service_id::text AS "serviceId",
         location_id::text AS "locationId",
         slug,
         title,
         markdown_content AS "markdownContent",
         lokal_aciklama AS "lokalAciklama",
         ozel_meta_desc AS "ozelMetaDesc",
         lokal_sss AS "lokalSss",
         meta_title AS "metaTitle",
         meta_description AS "metaDescription",
         canonical_url AS "canonicalUrl",
         og_image_url AS "ogImageUrl",
         schema_markup AS "schemaMarkup",
         status,
         source_type AS "sourceType",
         content_hash AS "contentHash",
         published_at AS "publishedAt",
         updated_at AS "updatedAt"
       FROM pages
       WHERE slug = $1
         AND status = 'published'
         AND is_deleted = FALSE
       LIMIT 1`,
      [normalizedPath],
    );
    // JSONB ham değeri (çift kodlanmış string olabilir) şema listesine indirgenir.
    const row = rows[0];
    if (!row) return null;
    return normalizePublishedPage({ ...row, schemaMarkup: toSchemaMarkup(row.schemaMarkup) });
  } catch (error) {
    console.warn("[Pages] published full-path lookup unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}

export function getPublishedPageBySlug(fullPath: string): Promise<PublishedPage | null> {
  const normalizedPath = fullPath
    .split("/")
    .map((part) => normalizeSlug(part))
    .filter(Boolean)
    .join("/");
  if (!normalizedPath) return Promise.resolve(null);

  // Redis read-through (24 saat) → Next veri katmanı önbelleği → Neon.
  // Anahtar: page:slug:{sha1(normalizedPath)}.
  return withPageCache(pageCacheKey("slug", normalizedPath), () =>
    unstable_cache(
      () => queryPublishedPageBySlug(normalizedPath),
      ["published-page-v3", normalizedPath],
      { revalidate: 3600, tags: ["local-pages", "sitemap"] },
    )(),
  );
}

/**
 * Kısa ilçe segmentini (ör. "atasehir", "ceyhan") `pages` tablosundaki
 * yayınlanmış kanonik bileşik slug'ın ilçe kısmına (ör. "istanbul-atasehir",
 * "adana-ceyhan") çevirir.
 *
 * `locations` tablosunda bazı ilçeler (ör. Ceyhan) çift kayıtlı olduğundan ve
 * aynı ilçe adı birden fazla ilde geçebildiğinden `getCentralLocationBySlug`
 * (tek kayıt şartı) bu iş için yetersiz. Bu fonksiyon doğrudan sayfaya bakar:
 * o lokasyon slug'ı için TEK yayınlanmış sayfa varsa döndürür, aksi halde
 * belirsiz kabul edip null döner (bu durumda il yönlendirmesi devreye girer).
 */
async function queryPublishedDistrictPageSegment(
  serviceSlug: string,
  districtSlug: string,
): Promise<string | null> {
  try {
    const { rows } = await pool.query<{ slug: string }>(
      `SELECT p.slug
         FROM pages p
         JOIN locations l ON l.id = p.location_id AND l.location_type = 'district'
         JOIN services s ON s.id = p.service_id
        WHERE s.slug = $1 AND s.is_active = TRUE
          AND l.slug = $2
          AND p.status = 'published'
          AND p.is_deleted = FALSE
        ORDER BY p.updated_at DESC
        LIMIT 2`,
      [serviceSlug, districtSlug],
    );
    if (rows.length !== 1) return null;
    const parts = rows[0].slug.split("/");
    return parts[1] ?? null;
  } catch (error) {
    console.warn("[Pages] district page segment lookup unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}

export function getPublishedDistrictPageSegment(
  serviceSlug: string,
  districtSlug: string,
): Promise<string | null> {
  const normalizedService = normalizeSlug(serviceSlug);
  const normalizedDistrict = normalizeSlug(districtSlug);
  if (!normalizedService || !normalizedDistrict) return Promise.resolve(null);
  return unstable_cache(
    () => queryPublishedDistrictPageSegment(normalizedService, normalizedDistrict),
    ["district-page-segment", normalizedService, normalizedDistrict],
    { revalidate: 3600, tags: ["local-pages", "sitemap"] },
  )();
}

type DistrictSlugRow = {
  slug: string;
  updated_at: Date;
  source_type: string | null;
  location_type: string | null;
  location_slug: string | null;
  parent_slug: string | null;
};

/** Ortak satır → sitemap girdisi dönüşümü (index ve legacy sorgular paylaşır). */
function mapDistrictSlugRows(
  rows: DistrictSlugRow[],
): Array<{ slug: string; sehir: string; updatedAt: Date }> {
  return rows.flatMap(({ slug, updated_at, source_type, location_type, location_slug, parent_slug }) => {
    const parts = slug.split("/");
    if (parts.length !== 2) return [];
    const [servicePart, sehirPart] = parts;
    if (!servicePart || !sehirPart) return [];

    const decision = {
      locationType: location_type,
      sourceType: source_type,
      parentLocationSlug: parent_slug,
      locationSlug: location_slug,
    };
    if (!isKeepableLocation(decision) || !isIndexableLocation(decision)) return [];

    return [{ slug: servicePart, sehir: sehirPart, updatedAt: updated_at }];
  });
}

/**
 * Birincil kaynak: konsolidasyon sonrası tek gerçek kaynak olan
 * `service_page_index` view'ı (`services` location satırlarından türer).
 * `2026-10-17-services-consolidate.sql` ile `pages` kaldırıldığında da çalışır.
 */
async function queryDistrictSlugsFromIndex(): Promise<DistrictSlugRow[]> {
  const { rows } = await pool.query<DistrictSlugRow>(
    `SELECT spi.url_slug            AS slug,
            spi.updated_at          AS updated_at,
            spi.source_type         AS source_type,
            spi.location_type       AS location_type,
            spi.location_slug       AS location_slug,
            spi.parent_location_slug AS parent_slug
       FROM service_page_index spi
      WHERE spi.row_type = 'location'
        AND spi.status = 'published'
        AND spi.url_slug LIKE '%/%'
      ORDER BY spi.updated_at DESC
      LIMIT 8000`,
  );
  return rows;
}

/**
 * Yedek kaynak (legacy): view mevcut değilse (konsolidasyon öncesi ortamlar)
 * doğrudan `pages` tablosundan okur. MIMARI.md §7.1 — "view kullanılamazsa
 * mevcut sorgu/fallback akışı sürer".
 */
async function queryDistrictSlugsFromPages(): Promise<DistrictSlugRow[]> {
  const { rows } = await pool.query<DistrictSlugRow>(
    `SELECT p.slug, p.updated_at,
            p.source_type,
            l.location_type,
            l.slug AS location_slug,
            parent.slug AS parent_slug
       FROM pages p
       JOIN locations l ON l.id = p.location_id
       LEFT JOIN locations parent ON parent.id = l.parent_id
       WHERE p.status = 'published'
         AND p.is_deleted = FALSE
         AND p.slug LIKE '%/%'
       ORDER BY p.updated_at DESC
       LIMIT 8000`,
  );
  return rows;
}

/**
 * Sitemap için TUTULAN lokasyon sayfalarının slug'larını döndürür.
 *
 * Tutulan set (bkz. `config/priority-locations.ts`):
 *  - Elle yazılmış (`source_type = 'manual'`) ve yayınlanmış içerik sayfaları.
 *  - `PRIORITY_DISTRICTS` allowlist'inde olan ilçeler.
 *
 * İller ve allowlist dışındaki ilçeler tutulur/yönlendirilir; ancak şablon
 * içerikli sayfalar indekslenmeye hazır sayılmaz ve sitemap'e girmez.
 *
 * Kaynak sırası: `service_page_index` (konsolide, birincil) → `pages` (yedek).
 */
async function queryPublishedDistrictPageSlugs(): Promise<
  Array<{ slug: string; sehir: string; updatedAt: Date }>
> {
  if (!process.env.DATABASE_URL) return [];
  try {
    return mapDistrictSlugRows(await queryDistrictSlugsFromIndex());
  } catch (error) {
    console.warn(
      "[Pages] route index lookup unavailable, falling back to pages:",
      error instanceof Error ? error.message : error,
    );
  }
  try {
    return mapDistrictSlugRows(await queryDistrictSlugsFromPages());
  } catch {
    return [];
  }
}

export function getPublishedDistrictPageSlugs(): Promise<
  Array<{ slug: string; sehir: string; updatedAt: Date }>
> {
  // En ağır sorgulardan biri (5000 satır): sitemap + generateStaticParams
  // her çalıştığında Neon'a düşmemesi için cache'lenir; admin panelinden
  // güncellemede revalidateTag("local-pages"/"sitemap") ile temizlenir.
  // Redis katmanı `sitemap:` alanında tutulur → invalidateSitemapCache() yeter.
  return withPageCache(pageCacheKey("sitemap", "district-slugs"), () =>
    unstable_cache(
      queryPublishedDistrictPageSlugs,
      ["published-district-page-slugs-v2"],
      { revalidate: 3600, tags: ["local-pages", "sitemap"] },
    )(),
  );}

/**
 * İlçe (aynı zamanda bileşik "il-ilce") URL segmentleri için hedef İL slug'ını
 * döndürür. `status = 'paused'` (duraklatılmış) ilçe sayfaları bu URL'lerden
 * 301/308 ile il sayfasına taşınır. Segment zaten bir il ise null döner
 * (kendine yönlenmesin).
 *
 * ÖNEMLİ (17.10.2026): `is_deleted = TRUE` (kalıcı olarak kaldırılmış) sayfalar
 * BURADA eşleşmez → ile yönlendirilmez, 404 döner. Böylece "duraklatıldı"
 * (308 ile ile taşınır) ile "kaldırıldı" (404) davranışları ayrışır.
 */
async function queryProvinceSlugForLegacyLocation(
  serviceSlug: string,
  segment: string,
): Promise<string | null> {
  try {
    const { rows } = await pool.query<{ province_slug: string | null }>(
      `SELECT parent.slug AS province_slug
         FROM pages p
         JOIN locations l ON l.id = p.location_id AND l.location_type = 'district'
         LEFT JOIN locations parent ON parent.id = l.parent_id AND parent.is_active = TRUE
        WHERE p.slug = $1
          AND p.is_deleted = FALSE
        LIMIT 1`,
      [`${serviceSlug}/${segment}`],
    );
    if (rows[0]?.province_slug) return rows[0].province_slug;

    const { rows: loc } = await pool.query<{ province_slug: string | null }>(
      `SELECT parent.slug AS province_slug
         FROM locations l
         JOIN locations parent ON parent.id = l.parent_id AND parent.is_active = TRUE
        WHERE l.slug = $1 AND l.location_type = 'district' AND l.is_active = TRUE
        ORDER BY l.id
        LIMIT 1`,
      [segment],
    );
    return loc[0]?.province_slug ?? null;
  } catch (error) {
    console.warn("[Pages] legacy province lookup unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}

export function getProvinceSlugForLegacyLocation(
  serviceSlug: string,
  segment: string,
): Promise<string | null> {
  const normalizedService = normalizeSlug(serviceSlug);
  const normalizedSegment = normalizeSlug(segment);
  if (!normalizedService || !normalizedSegment) return Promise.resolve(null);
  return unstable_cache(
    () => queryProvinceSlugForLegacyLocation(normalizedService, normalizedSegment),
    ["legacy-province-slug", normalizedService, normalizedSegment],
    { revalidate: 3600, tags: ["local-pages", "locations", "sitemap"] },
  )();
}
