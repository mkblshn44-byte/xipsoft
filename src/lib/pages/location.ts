/**
 * pages/location.ts — Merkezi konum (hizmet × il/ilçe) çözümü.
 */

import pool from "@/lib/db/pool";
import { unstable_cache } from "next/cache";
import { CENTRAL_LOCATION_COLUMNS } from "./sql";
import { normalizeSlug } from "./hash";
import type { CentralLocation } from "./types";

async function queryCentralLocationBySlug(
  normalizedService: string,
  normalizedLocation: string,
): Promise<CentralLocation | null> {
  try {
    const { rows } = await pool.query<CentralLocation>(
      `SELECT
         ${CENTRAL_LOCATION_COLUMNS}
       FROM services s
       JOIN locations l ON l.is_active = TRUE
       LEFT JOIN locations parent ON parent.id = l.parent_id AND parent.is_active = TRUE
       WHERE s.slug = $1 AND s.row_type = 'main' AND s.is_active = TRUE
         AND (
           l.slug = $2
           OR (
             l.location_type = 'district'
             AND parent.slug || '-' || l.slug = $2
           )
         )
       ORDER BY l.slug, parent.slug NULLS FIRST, l.id`,
      [normalizedService, normalizedLocation],
    );
    // İl satırları (ve bazı ilçeler) veritabanında çift kayıtlı olabiliyor.
    // Aynı (slug + tip) kombinasyonu tek kabul edilir. İlçelerde farklı illerde
    // tekrarlayan adlar (ör. "merkez") için üst bölge de eşleşmeli; il (province)
    // satırlarında parent_id farkı önemsizdir.
    const distinctKeys = new Set(
      rows.map((r) =>
        r.locationType === "district"
          ? `${r.locationType}|${r.locationSlug}|${r.parentLocationSlug ?? ""}`
          : `${r.locationType}|${r.locationSlug}`,
      ),
    );
    return distinctKeys.size === 1 ? rows[0] ?? null : null;
  } catch (error) {
    console.warn("[Pages] central location lookup unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}

export function getCentralLocationBySlug(
  serviceSlug: string,
  locationSlug: string,
): Promise<CentralLocation | null> {
  const normalizedService = normalizeSlug(serviceSlug);
  const normalizedLocation = normalizeSlug(locationSlug);
  if (!normalizedService || !normalizedLocation) return Promise.resolve(null);

  return unstable_cache(
    () => queryCentralLocationBySlug(normalizedService, normalizedLocation),
    ["central-location-v3", normalizedService, normalizedLocation],
    { revalidate: 3600, tags: ["local-pages", "services", "sitemap"] },
  )();
}

/**
 * Yayınlanmış bir ilçe sayfasının `service_id` + `location_id` ikilisinden
 * `CentralLocation` bilgisini çözer.
 *
 * Neden gerekli: URL'deki ilçe kısmı parent il slug'ını da içerir
 * (ör. `/hizmetler/web-yazilim-tasarim1/elazig-palu.html` → locations.slug = "palu").
 * `getCentralLocationBySlug` bu durumda eşleşmez; sayfanın `location_id`'si
 * doğru satıra işaret ettiği için ID tabanlı çözüm her durumda çalışır.
 */
async function queryCentralLocationByIds(
  serviceId: string,
  locationId: string,
): Promise<CentralLocation | null> {
  try {
    const { rows } = await pool.query<CentralLocation>(
      `SELECT
         ${CENTRAL_LOCATION_COLUMNS}
       FROM services s
       JOIN locations l ON l.id = $2::uuid AND l.is_active = TRUE
       LEFT JOIN locations parent ON parent.id = l.parent_id AND parent.is_active = TRUE
       WHERE s.id = $1::int AND s.row_type = 'main' AND s.is_active = TRUE
       ORDER BY l.slug, l.id
       LIMIT 1`,
      [serviceId, locationId],
    );
    return rows[0] ?? null;
  } catch (error) {
    console.warn("[Pages] central location (by ids) lookup unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}

export function getCentralLocationByIds(
  serviceId: string,
  locationId: string,
): Promise<CentralLocation | null> {
  if (!serviceId || !locationId) return Promise.resolve(null);
  return unstable_cache(
    () => queryCentralLocationByIds(serviceId, locationId),
    ["central-location-by-ids", serviceId, locationId],
    { revalidate: 3600, tags: ["local-pages", "services", "sitemap"] },
  )();
}
