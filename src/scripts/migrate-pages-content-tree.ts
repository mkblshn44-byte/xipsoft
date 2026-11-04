/**
 * Idempotently aligns the existing pages table with the content-tree model.
 *
 * Dry-run by default:
 *   npm run db:migrate-pages-tree
 * Apply after reviewing the printed mapping:
 *   npm run db:migrate-pages-tree -- --apply
 *
 * Blog_posts is intentionally untouched. Main services become `service` root
 * pages; existing service/location pages keep their slugs and public URLs.
 */
import { Pool, type PoolClient } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(2);
}

const apply = process.argv.includes("--apply");
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
  statement_timeout: 30_000,
});

async function findPathConflicts(client: PoolClient) {
  return client.query<{ full_path: string; conflict_count: number }>(
    `WITH wanted AS (
       SELECT 'service'::text AS kind, s.id AS service_id, NULL::uuid AS page_id,
              'hizmetler/' || s.slug AS full_path
         FROM services s
        WHERE s.row_type = 'main'
          AND s.is_active = TRUE
          AND s.deleted_at IS NULL
       UNION ALL
       SELECT 'location', p.service_id, p.id,
              'hizmetler/' || s.slug || '/' || l.slug
         FROM pages p
         JOIN services s ON s.id = p.service_id
         JOIN locations l ON l.id = p.location_id
        WHERE p.is_deleted = FALSE
          AND p.full_path IS NULL
     ),
     duplicate_wanted AS (
       SELECT full_path, count(*)::int AS conflict_count
         FROM wanted
        GROUP BY full_path
       HAVING count(*) > 1
     ),
     occupied_paths AS (
       SELECT DISTINCT w.full_path, 1::int AS conflict_count
         FROM wanted w
         JOIN pages existing ON existing.full_path = w.full_path
                            AND existing.is_deleted = FALSE
        WHERE NOT (
          (w.kind = 'location' AND existing.id = w.page_id)
          OR
          (w.kind = 'service' AND existing.kind = 'service'
                              AND existing.service_id = w.service_id)
        )
     ),
     duplicate_service_roots AS (
       SELECT 'service_id:' || service_id::text AS full_path,
              count(*)::int AS conflict_count
         FROM pages
        WHERE kind = 'service' AND service_id IS NOT NULL
        GROUP BY service_id
       HAVING count(*) > 1
     )
     SELECT full_path, conflict_count FROM duplicate_wanted
     UNION ALL
     SELECT full_path, conflict_count FROM occupied_paths
     UNION ALL
     SELECT full_path, conflict_count FROM duplicate_service_roots
     ORDER BY full_path
     LIMIT 20`,
  );
}

async function main() {
  const client = await pool.connect();
  try {
    const counts = await client.query<{
      service_count: number;
      active_service_count: number;
      location_page_count: number;
      missing_path_count: number;
      page_id_count: number;
      distinct_page_id_count: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM services WHERE row_type = 'main') AS service_count,
         (SELECT count(*)::int FROM services
           WHERE row_type = 'main' AND is_active = TRUE AND deleted_at IS NULL) AS active_service_count,
         (SELECT count(*)::int FROM pages
           WHERE service_id IS NOT NULL AND location_id IS NOT NULL AND is_deleted = FALSE) AS location_page_count,
         (SELECT count(*)::int FROM pages
           WHERE service_id IS NOT NULL AND location_id IS NOT NULL
             AND is_deleted = FALSE AND full_path IS NULL) AS missing_path_count,
         (SELECT count(id)::int FROM pages) AS page_id_count,
         (SELECT count(DISTINCT id)::int FROM pages) AS distinct_page_id_count`,
    );
    const summary = counts.rows[0];
    const conflicts = await findPathConflicts(client);

    console.log("Pages content-tree migration");
    console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
    console.log(`Main services to map: ${summary.service_count} (${summary.active_service_count} active)`);
    console.log(`Existing location pages: ${summary.location_page_count}`);
    console.log(`Location pages needing full_path: ${summary.missing_path_count}`);
    console.log(`Unique page IDs: ${summary.distinct_page_id_count}/${summary.page_id_count}`);
    console.log(`URL path conflicts: ${conflicts.rowCount ?? 0}`);
    for (const conflict of conflicts.rows) {
      console.log(`  conflict: ${conflict.full_path}`);
    }

    if (conflicts.rowCount) {
      throw new Error("Resolve the reported URL collisions before applying this migration.");
    }
    if (summary.page_id_count !== summary.distinct_page_id_count) {
      throw new Error("pages.id contains null or duplicate values; primary key migration is unsafe.");
    }
    if (!apply) {
      console.log("No changes made. Re-run with -- --apply to apply the migration.");
      return;
    }

    await client.query("BEGIN");
    try {
      await client.query(`
        ALTER TABLE pages
          ADD COLUMN IF NOT EXISTS parent_id UUID,
          ADD COLUMN IF NOT EXISTS node_type TEXT NOT NULL DEFAULT 'page',
          ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS schema_markup JSONB
      `);
      await client.query(`
        ALTER TABLE pages
          ALTER COLUMN service_id DROP NOT NULL,
          ALTER COLUMN location_id DROP NOT NULL,
          ALTER COLUMN markdown_content DROP NOT NULL,
          ALTER COLUMN meta_title DROP NOT NULL,
          ALTER COLUMN meta_description DROP NOT NULL,
          ALTER COLUMN content_hash DROP NOT NULL
      `);
      await client.query(`
        ALTER TABLE services
          ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS h1_title TEXT,
          ADD COLUMN IF NOT EXISTS meta_title TEXT,
          ADD COLUMN IF NOT EXISTS meta_description TEXT,
          ADD COLUMN IF NOT EXISTS features_title TEXT,
          ADD COLUMN IF NOT EXISTS features_desc TEXT,
          ADD COLUMN IF NOT EXISTS tech_title TEXT,
          ADD COLUMN IF NOT EXISTS packages_title TEXT,
          ADD COLUMN IF NOT EXISTS packages_desc TEXT,
          ADD COLUMN IF NOT EXISTS micro_title TEXT,
          ADD COLUMN IF NOT EXISTS micro_desc TEXT
      `);
      await client.query(`
        UPDATE services
           SET is_deleted = (deleted_at IS NOT NULL)
         WHERE is_deleted IS DISTINCT FROM (deleted_at IS NOT NULL)
      `);
      await client.query(`
        UPDATE pages
           SET node_type = CASE WHEN page_type = 'category' THEN 'category' ELSE 'page' END
         WHERE node_type IS NULL OR node_type NOT IN ('page', 'category')
      `);

      await client.query(`
        DO $migration$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
              FROM pg_constraint
             WHERE contype = 'p'
               AND conrelid = 'public.pages'::regclass
          ) THEN
            ALTER TABLE pages ADD CONSTRAINT pages_pkey PRIMARY KEY (id);
          END IF;
        END;
        $migration$;
      `);
      await client.query(`
        DO $migration$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
              FROM pg_constraint
             WHERE conname = 'pages_parent_id_fkey'
               AND conrelid = 'public.pages'::regclass
          ) THEN
            ALTER TABLE pages
              ADD CONSTRAINT pages_parent_id_fkey
              FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE SET NULL;
          END IF;
        END
        ;
        $migration$;
      `);

      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS pages_full_path_uq
          ON pages (full_path)
          WHERE full_path IS NOT NULL AND is_deleted = FALSE
      `);
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS pages_service_root_uq
          ON pages (service_id)
          WHERE kind = 'service' AND service_id IS NOT NULL
      `);

      await client.query(`
        INSERT INTO pages
          (service_id, location_id, slug, full_path, kind, page_type, node_type,
           title, markdown_content, meta_title, meta_description, content_hash,
           source_type, keywords, status, is_deleted, deleted_at, published_at,
           is_indexable, sort_order)
        SELECT s.id, NULL, s.slug, 'hizmetler/' || s.slug,
               'service', 'service', 'page', s.title, '',
               COALESCE(s.meta_title, s.title),
               COALESCE(s.meta_description, s.subtitle, s.title),
               md5(s.slug || ':' || s.title), 'service', ARRAY[]::text[],
               CASE WHEN s.is_active AND NOT s.is_deleted THEN 'published' ELSE 'paused' END,
               (NOT s.is_active OR s.is_deleted),
               CASE WHEN NOT s.is_active OR s.is_deleted
                    THEN COALESCE(s.deleted_at, NOW()) ELSE NULL END,
               CASE WHEN s.is_active AND NOT s.is_deleted THEN COALESCE(s.updated_at, NOW()) ELSE NULL END,
               (s.is_active AND NOT s.is_deleted), s.sort_order
          FROM services s
         WHERE s.row_type = 'main'
        ON CONFLICT (service_id)
          WHERE kind = 'service' AND service_id IS NOT NULL
        DO UPDATE SET
          slug = EXCLUDED.slug,
          full_path = EXCLUDED.full_path,
          title = EXCLUDED.title,
          meta_title = EXCLUDED.meta_title,
          meta_description = EXCLUDED.meta_description,
          status = EXCLUDED.status,
          is_deleted = EXCLUDED.is_deleted,
          deleted_at = EXCLUDED.deleted_at,
          is_indexable = EXCLUDED.is_indexable,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
      `);

      await client.query(`
        UPDATE pages p
           SET full_path = COALESCE(p.full_path, 'hizmetler/' || s.slug || '/' || l.slug),
               kind = 'location',
               page_type = 'location',
               node_type = 'page',
               parent_id = root.id
          FROM services s, locations l, pages root
         WHERE p.service_id = s.id
           AND p.location_id = l.id
           AND root.service_id = s.id
           AND root.kind = 'service'
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS pages_parent_id_idx ON pages (parent_id)
      `);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    console.log("Migration applied successfully.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Migration failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
