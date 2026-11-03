import pool from "@/lib/db/pool";

let schemaPromise: Promise<void> | null = null;

export function ensureSiteVisitorAnalyticsSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await pool.query("ALTER TABLE site_visitors ADD COLUMN IF NOT EXISTS visit_token UUID");
      await pool.query("ALTER TABLE site_visitors ADD COLUMN IF NOT EXISTS duration_seconds INTEGER");
      await pool.query("ALTER TABLE site_visitors ADD COLUMN IF NOT EXISTS transfer_bytes BIGINT");
      await pool.query(
        "CREATE UNIQUE INDEX IF NOT EXISTS site_visitors_visit_token_idx ON site_visitors (visit_token) WHERE visit_token IS NOT NULL",
      );
    })().catch((error: unknown) => {
      schemaPromise = null;
      console.error(
        "[site-visitors] analitik şeması hazırlanamadı:",
        error instanceof Error ? error.message : error,
      );
      throw error;
    });
  }

  return schemaPromise;
}
