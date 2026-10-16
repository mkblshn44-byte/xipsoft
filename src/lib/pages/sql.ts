/**
 * pages/sql.ts — Merkezi konum çözümünde paylaşılan SQL parçaları (DRY).
 */

export const LOCATION_LOCAL_AREA_NAMES_SQL = `CASE
  WHEN l.location_type = 'province' THEN ARRAY(
    SELECT DISTINCT area.name
    FROM locations area
    WHERE area.parent_id = l.id
      AND area.location_type = 'district'
      AND area.is_active = TRUE
    ORDER BY area.name
  )
  ELSE ARRAY(
    SELECT DISTINCT area.name
    FROM locations area
    WHERE area.parent_id = l.parent_id
      AND area.location_type = 'district'
      AND area.is_active = TRUE
      AND area.id <> l.id
    ORDER BY area.name
  )
END`;

/**
 * `CentralLocation` çözümünde kullanılan ortak SELECT kolon bloğu.
 * Sekiz farklı sorguda birebir tekrarlanıyordu (DRY) — tek kaynak burasıdır.
 * `services s`, `locations l` ve `locations parent` alias'larını bekler.
 */
export const CENTRAL_LOCATION_COLUMNS = `s.id::text AS "serviceId",
         s.title AS "serviceTitle",
         s.slug AS "serviceSlug",
         COALESCE(s.subtitle, '') AS "serviceDescription",
         l.id::text AS "locationId",
         l.name AS "locationName",
         l.slug AS "locationSlug",
         l.location_type AS "locationType",
         parent.name AS "parentLocationName",
         parent.slug AS "parentLocationSlug",
         l.local_seo_context AS "localSeoContext",
         ${LOCATION_LOCAL_AREA_NAMES_SQL} AS "localAreaNames"`;
