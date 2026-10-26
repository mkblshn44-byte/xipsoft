/**
 * inspect-about-meta — SALT OKUNUR: `xip_dynamic_content` içindeki
 * `hakkimizda` page_meta kaydını olduğu gibi yazdırır.
 *
 *   node .\node_modules\.bin\tsx.cmd --env-file=.env.local src/scripts/inspect-about-meta.ts
 */
import pool from "@/lib/db/pool";

async function main() {
  const { rows } = await pool.query(
    `SELECT id::text, content_type, category, title, slug, order_index, is_active,
            (deleted_at IS NULL) AS not_deleted, metadata, updated_at
       FROM xip_dynamic_content
      WHERE content_type = 'page_meta' AND category = 'hakkimizda'
      ORDER BY id`,
  );
  console.log("row_count:", rows.length);
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}

main().catch((e) => {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
