import { unstable_cache } from "next/cache";
import pool from "@/lib/db/pool";
import { mapServiceRowToPageData, type ServicePageData } from "@/lib/db/services";
import { normalizeSlug } from "@/lib/pages/hash";
import type { LocationType } from "@/lib/pages/types";

interface ServicePageIndexRow {
  page_id: string;
  row_type: "service" | "location";
  url_slug: string;
  service_id: string | number | null;
  service_slug: string | null;
  service_title: string | null;
  location_id: string | null;
  location_slug: string | null;
  location_name: string | null;
  location_type: string | null;
  parent_location_slug: string | null;
  parent_location_name: string | null;
  page_slug: string;
  page_title: string;
  h1_title: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: string;
  is_indexable: boolean;
  source_type: string | null;
  service_data: Record<string, unknown> | null;
}

export interface ResolvedServiceRoute {
  pageId: string;
  rowType: ServicePageIndexRow["row_type"];
  urlSlug: string;
  serviceId: string | null;
  serviceSlug: string | null;
  serviceTitle: string | null;
  locationId: string | null;
  locationSlug: string | null;
  locationName: string | null;
  locationType: LocationType | null;
  parentLocationSlug: string | null;
  parentLocationName: string | null;
  slug: string;
  title: string;
  h1Title: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: string;
  isIndexable: boolean;
  sourceType: string | null;
  service: ServicePageData | null;
}

function isLocationType(value: string | null): value is LocationType {
  return value === "province" || value === "district" || value === "neighborhood";
}

async function queryServiceRoute(slugArray: string[]): Promise<ResolvedServiceRoute | null> {
  if (!process.env.DATABASE_URL) return null;

  const normalized = slugArray.map(normalizeSlug).filter(Boolean);
  if (normalized.length !== slugArray.length || normalized.length < 1 || normalized.length > 2) {
    return null;
  }

  const serviceSlug = normalized[0];
  const path = normalized.join("/");
  const locationSlug = normalized[1];

  try {
    // Kolonlar elle listelenir: `spi.*` view'un 32 kolonunu (canonical_url dâhil)
    // taşır ve view yeniden tanımlandığında satır biçimi sessizce değişir.
    // Kanonik yol burada değil `content-path.ts`'te üretilir (MIMARI.md §3.1).
    const { rows } = await pool.query<ServicePageIndexRow>(
      `SELECT spi.page_id,
              spi.row_type,
              spi.url_slug,
              spi.service_id,
              spi.service_slug,
              spi.service_title,
              spi.location_id,
              spi.location_slug,
              spi.location_name,
              spi.location_type,
              spi.parent_location_slug,
              spi.parent_location_name,
              spi.page_slug,
              spi.page_title,
              spi.h1_title,
              spi.meta_title,
              spi.meta_description,
              spi.status,
              spi.is_indexable,
              spi.source_type,
              to_jsonb(s) AS service_data
         FROM service_page_index spi
         LEFT JOIN services s
           ON s.slug = spi.service_slug
          AND s.row_type = 'main'
          AND s.is_active = TRUE
        WHERE spi.status = 'published'
          AND (
            (
              $4::int = 1
              AND spi.row_type = 'service'
              AND spi.service_slug = $1
            )
            OR (
              $4::int = 2
              AND
              spi.row_type = 'location'
              AND spi.service_slug = $1
              AND (
                spi.url_slug = $2
                OR spi.location_slug = $3
                OR spi.parent_location_slug || '-' || spi.location_slug = $3
              )
            )
          )
        ORDER BY CASE WHEN spi.url_slug = $2 THEN 0 ELSE 1 END
        LIMIT 2`,
      [serviceSlug, path, locationSlug ?? "", normalized.length],
    );

    if (rows.length !== 1) return null;

    const row = rows[0];
    return {
      pageId: row.page_id,
      rowType: row.row_type,
      urlSlug: row.url_slug,
      serviceId: row.service_id === null ? null : String(row.service_id),
      serviceSlug: row.service_slug,
      serviceTitle: row.service_title,
      locationId: row.location_id,
      locationSlug: row.location_slug,
      locationName: row.location_name,
      locationType: isLocationType(row.location_type) ? row.location_type : null,
      parentLocationSlug: row.parent_location_slug,
      parentLocationName: row.parent_location_name,
      slug: row.page_slug,
      title: row.page_title,
      h1Title: row.h1_title,
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      status: row.status,
      isIndexable: row.is_indexable,
      sourceType: row.source_type,
      service: row.service_data ? mapServiceRowToPageData(row.service_data) : null,
    };
  } catch (error) {
    console.warn(
      "[ServiceRoutes] route index lookup unavailable:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export function resolveServiceRoute(slugArray: string[]): Promise<ResolvedServiceRoute | null> {
  const normalized = slugArray.map(normalizeSlug).filter(Boolean);
  if (normalized.length !== slugArray.length || normalized.length < 1 || normalized.length > 2) {
    return Promise.resolve(null);
  }

  return unstable_cache(
    () => queryServiceRoute(normalized),
    ["service-route-index-v1", ...normalized],
    { revalidate: 3600, tags: ["services", "local-pages"] },
  )();
}
