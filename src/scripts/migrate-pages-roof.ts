/**
 * Tek çatı `pages` — şema göçü + kapsama raporu.
 *
 * Bu repo'da migration klasörü yok; şemanın gerçeği Neon'da yaşıyor ve DDL
 * bugüne kadar kodun içinde self-heal ediliyordu (`content-tree-policy`).
 * Script iki iş yapar:
 *
 *  1. RAPOR (varsayılan, salt-okunur): çatı mimarinin gerçekten tamam olup
 *     olmadığını ölçer — `hizmetler/[...slug]` route'unun silinebilmesi için
 *     gereken kapı budur. Route silinmeden önce gap=0 olmalı, aksi halde
 *     `pages` satırı olmayan bir hizmet catch-all'da 404/Gone olur.
 *
 *  2. UYGULAMA (--apply): plandaki alan adlarını ekler (idempotent):
 *     - `pages.is_published` — `status = 'published'` üzerinden GENERATED
 *       kolon. `status` tek doğruluk kaynağı kalır (draft/review/paused
 *       anlamlarını taşır); Boolean yalnızca planın sözleşmesini verir.
 *     - sitemap'in tek sorgusu için partial index.
 *     - `seo_redirects`: 410 (Gone) yazılabilir hale gelir — hedef NULL
 *       olabilir ve status_code CHECK'i 410'u içine alır.
 *
 * Kullanım:
 *   npm run db:pages-roof            (yalnız rapor)
 *   npm run db:pages-roof -- --apply (rapor + şema değişiklikleri)
 */
import pool from "@/lib/db/pool";
import type { QueryResultRow } from "pg";

const applyChanges = process.argv.includes("--apply");

const TABLES = ["pages", "services", "Blog_posts", "seo_redirects", "xip_dynamic_content"];

async function scalar<T extends QueryResultRow>(sql: string, params?: any[]): Promise<T[]> {
  const { rows } = await pool.query<T>(sql, params);
  return rows;
}

// ── Rapor ────────────────────────────────────────────────────────────────────

async function report(): Promise<{ serviceGap: number; duplicatePaths: number }> {
  const tables = await scalar<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [TABLES],
  );
  console.log(`Tablolar: ${tables.map((t) => t.table_name).join(", ") || "YOK"}`);

  console.log("\n[1] pages — kind dağılımı (canlı satırlar)");
  for (const row of await scalar<{ kind: string; n: number }>(
    `SELECT kind, count(*)::int AS n FROM pages
      WHERE is_deleted = FALSE GROUP BY kind ORDER BY kind`,
  )) {
    console.log(`    ${String(row.kind).padEnd(12)} ${row.n}`);
  }

  // Kapı: bu sayı > 0 ise hizmet rotası catch-all'a taşınamaz.
  const serviceGap = await scalar<{ slug: string }>(
    `SELECT s.slug
       FROM services s
      WHERE s.row_type = 'main'
        AND s.is_active = TRUE
        AND COALESCE(s.is_deleted, FALSE) = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM pages p
           WHERE p.kind = 'service'
             AND p.is_deleted = FALSE
             AND p.status = 'published'
             AND p.full_path = 'hizmetler/' || s.slug)
      ORDER BY s.slug
      LIMIT 50`,
  );
  console.log(
    `\n[2] Sunulabilir pages satırı OLMAYAN aktif hizmet: ${serviceGap.length}` +
      (serviceGap.length === 0
        ? " → hizmetler/[...slug] route'u silinebilir"
        : ` → ROUTE SİLİNEMEZ: ${serviceGap.map((r) => r.slug).join(", ")}`),
  );

  const duplicatePaths = await scalar<{ full_path: string; n: number }>(
    `SELECT full_path, count(*)::int AS n FROM pages
      WHERE is_deleted = FALSE AND full_path IS NOT NULL AND full_path <> ''
      GROUP BY full_path HAVING count(*) > 1 LIMIT 20`,
  );
  console.log(`[3] Aynı full_path'i paylaşan canlı satır: ${duplicatePaths.length}`);
  for (const row of duplicatePaths) console.log(`    ${row.full_path} (${row.n})`);

  console.log("\n[4] seo_redirects — durum kodları");
  for (const row of await scalar<{ status_code: number; n: number }>(
    `SELECT status_code, count(*)::int AS n FROM seo_redirects
      GROUP BY status_code ORDER BY status_code`,
  )) {
    console.log(`    ${row.status_code}: ${row.n}`);
  }

  console.log("\n[5] Statik çerçeve rotaları (`xip_dynamic_content`)");
  const staticCopy = await scalar<{ n: number }>(
    `SELECT count(*)::int AS n FROM xip_dynamic_content
      WHERE content_type = 'page_meta' AND is_active = TRUE AND deleted_at IS NULL`,
  );
  console.log(
    `    ${staticCopy[0]?.n ?? 0} legacy sayfa metası. Policy sayfaları ` +
      "`db:seed-static-pages` ile, özel şablonlu kökler ayrı sayfa göçüyle pages'e aktarılır.",
  );

  return { serviceGap: serviceGap.length, duplicatePaths: duplicatePaths.length };
}

// ── Uygulama ─────────────────────────────────────────────────────────────────

async function apply(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // `status` authoritative; generated kolon yalnızca plan sözleşmesini verir.
    await client.query(
      `ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_published boolean
         GENERATED ALWAYS AS (status = 'published') STORED`,
    );

    // Statik çerçeve sayfaları `pages`'e taşınırken 6 dilin metni satır başına 6
    // kopya OLMAZ: `{ [locale]: { title, markdownContent, ... } }` haritası bu
    // kolonda durur, temel kolonlar TR'yi taşımaya devam eder (bkz. localizeNode).
    await client.query(
      `ALTER TABLE pages ADD COLUMN IF NOT EXISTS content_i18n jsonb`,
    );

    // Statik çerçeve rotaları `<title>`'ı kök şablonsuz (mutlak) basıyordu. Rota
    // silinince o karar `pages`'e taşınır: kolon TRUE ise `buildContentTreeMetadata`
    // "%s | XipSoft" sonekini EKLEMEZ. (NULL = bugünkü davranış, ağaç satırları etkilenmez.)
    await client.query(
      `ALTER TABLE pages ADD COLUMN IF NOT EXISTS title_absolute boolean`,
    );

    // Sitemap'in tek `pages` sorgusu: partial index yayın+sahiplik süzgecini
    // önceden daraltır (ağaç + hizmet + konum satırları tek geçişte).
    await client.query(
      `CREATE INDEX IF NOT EXISTS pages_unified_sitemap_idx
         ON pages (kind, updated_at DESC)
        WHERE is_deleted = FALSE AND status = 'published' AND is_indexable = TRUE
          AND full_path IS NOT NULL AND full_path <> ''`,
    );

    // 410 (Gone): hedefsiz kayıt. CHECK kuralı varsa tek güvenli yolla bulunur
    // (ad DB'den gelir → format('%I') ile quote edilir, elle yazılmaz).
    const checks = await client.query<{ drop_sql: string }>(
      `SELECT format('ALTER TABLE seo_redirects DROP CONSTRAINT %I', conname) AS drop_sql
         FROM pg_constraint
        WHERE conrelid = 'seo_redirects'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%status_code%'`,
    );
    for (const row of checks.rows) await client.query(row.drop_sql);

    const existing = await client.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM pg_constraint
        WHERE conrelid = 'seo_redirects'::regclass
          AND conname = 'seo_redirects_status_code_check'`,
    );
    if (!existing.rows[0]?.n) {
      await client.query(
        `ALTER TABLE seo_redirects ADD CONSTRAINT seo_redirects_status_code_check
           CHECK (status_code IN (301, 302, 307, 308, 410))`,
      );
    }
    await client.query(`ALTER TABLE seo_redirects ALTER COLUMN target_path DROP NOT NULL`);

    await client.query("COMMIT");
    console.log("\nŞema uygulandı: pages.is_published, pages_unified_sitemap_idx, seo_redirects 410.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL yok — havuz mock'a düşer ve hiçbir şey yazmaz. " +
        "`--env-file=.env.local` (veya Neon bağlantısı) ile çalıştırın.",
    );
    process.exitCode = 1;
    return;
  }

  const { serviceGap, duplicatePaths } = await report();

  if (!applyChanges) {
    console.log("\n[dry-run] Değişiklik uygulanmadı. Uygulamak için: --apply");
    return;
  }

  if (duplicatePaths > 0) {
    console.error(
      "\nAynı full_path'i paylaşan canlı satırlar var — partial unique index " +
        "eksik veya bozulmuş. Önce bunları çöz, sonra tekrar dene.",
    );
    process.exitCode = 1;
    return;
  }

  await apply();

  if (serviceGap > 0) {
    console.log(
      `\nNOT: ${serviceGap} hizmetin ağaç satırı yok; sitemap bunları hâlâ ` +
        "services sorgusundan alıyor (geçiş güvenlik ağı).",
    );
  }
}

void main()
  .catch((error) => {
    console.error("pages çatı göçü başarısız:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
