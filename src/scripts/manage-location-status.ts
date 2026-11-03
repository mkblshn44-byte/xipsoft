/**
 * ─────────────────────────────────────────────────────────────────────────────
 * KONUM (İL / İLÇE) SAYFALARI SEO STATUS YÖNETİMİ
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * AMAÇ
 * Google Search Console'daki kopya içerik (duplicate content) uyarılarını
 * ortadan kaldırmak: öncelikli konum sayfalarını yayında tutmak, jenerik/şablon
 * küçük ilçe sayfalarını `status = 'paused'` yapmak. Böylece bu sayfalar ne
 * sitemap'e girer ne de arama motorları tarafından taranıp kopya cezasına yol
 * açar (rota, korunmayan ilçeyi il sayfasına 308 ile yönlendirir).
 *
 * ÖNCELİK KURALI (tek kaynak: src/config/priority-locations.ts)
 *  - Tüm İL sayfaları (`location_type = 'province'`) korunur.
 *  - `TOP_PRIORITY_PROVINCES` (en büyük 10 il) TÜM ilçeleri korunur.
 *  - Diğer illerde yalnızca `MAJOR_DISTRICTS` (ticari/merkez ilçeler) korunur.
 *  - Kalan ilçeler → `status = 'paused'`.
 *
 * DAVRANIŞ
 *  - Öncelikli sayfalar `status = 'published'` yapılır. `source_type`
 *    DEĞİŞTİRİLMEZ: içerik özgünleştirildikçe `manual`'a çevrilecek; böylece
 *    jenerik içerik yanlışlıkla indexlenmez (kopya içerik riski artmaz).
 *  - Öncelikli OLMAYAN sayfalar `status = 'paused'` yapılır.
 *  - Güvenlik: öncelikli olmasa bile `source_type = 'manual'` (zenginleştirilmiş)
 *    sayfalar ASLA pasife alınmaz; korunur ve raporlanır.
 *
 * KULLANIM
 *   npm run seo:location-status              → önizleme (dry-run, yazmaz)
 *   npm run seo:location-status -- --apply   → değişiklikleri uygula
 */
import pool from "@/lib/db/pool";
import { isPriorityDistrict } from "@/config/priority-locations";

const applyChanges = process.argv.includes("--apply");

interface PageRow {
  id: string;
  slug: string;
  status: string;
  source_type: string | null;
  location_type: string | null;
  location_slug: string | null;
  parent_slug: string | null;
}

/** id listesini 500'lük parçalara bölerek güvenli toplu UPDATE yapar. */
async function bulkUpdateStatus(ids: string[], status: string): Promise<number> {
  const CHUNK = 500;
  let affected = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const res = await pool.query(
      `UPDATE pages
          SET status = $1, updated_at = NOW()
        WHERE id = ANY($2::uuid[])`,
      [status, chunk],
    );
    affected += res.rowCount ?? 0;
  }
  return affected;
}

async function main() {
  const { rows } = await pool.query<PageRow>(
    `SELECT p.id::text AS id,
            p.slug,
            p.status,
            p.source_type,
            l.location_type,
            l.slug AS location_slug,
            parent.slug AS parent_slug
       FROM pages p
       JOIN locations l ON l.id = p.location_id
       LEFT JOIN locations parent ON parent.id = l.parent_id
      WHERE p.is_deleted = FALSE`,
  );

  const toPublish: PageRow[] = [];
  const toPause: PageRow[] = [];
  const protectedEnriched: PageRow[] = [];

  for (const row of rows) {
    const isPriority =
      row.location_type === "province" ||
      (row.location_type === "district" &&
        isPriorityDistrict(row.parent_slug, row.location_slug));

    if (isPriority) {
      if (row.status !== "published") toPublish.push(row);
      continue;
    }

    // Öncelikli değil — zenginleştirilmiş (manual) sayfa asla pasife alınmaz.
    if (row.source_type === "manual") {
      protectedEnriched.push(row);
      if (row.status !== "published") toPublish.push(row);
      continue;
    }

    if (row.status !== "paused") toPause.push(row);
  }

  const publishIds = toPublish.map((r) => r.id);
  const pauseIds = toPause.map((r) => r.id);

  console.log("──────────────────────────────────────────────");
  console.log("Konum sayfaları SEO status planı");
  console.log("────────────────────────────────────────────────");
  console.log(`Toplam konum sayfası          : ${rows.length}`);
  console.log(`Yayına alınacak (published)   : ${toPublish.length}`);
  console.log(`Pasife alınacak (paused)      : ${toPause.length}`);
  console.log(`Korunan zenginleştirilmiş     : ${protectedEnriched.length}`);
  if (protectedEnriched.length) {
    for (const r of protectedEnriched.slice(0, 20)) {
      console.log(`  ⚠️  korundu: ${r.slug} (${r.status})`);
    }
  }
  if (toPause.length) {
    const sample = toPause.slice(0, 10).map((r) => r.slug);
    console.log(`Pasife alınacak örnekler: ${sample.join(", ")}${toPause.length > 10 ? ", …" : ""}`);
  }
  if (toPublish.length) {
    const sample = toPublish.slice(0, 10).map((r) => r.slug);
    console.log(`Yayına alınacak örnekler: ${sample.join(", ")}${toPublish.length > 10 ? ", …" : ""}`);
  }

  if (!applyChanges) {
    console.log("\n[dry-run] Önizleme tamamlandı; hiçbir kayıt değiştirilmedi.");
    console.log("Uygulamak için: npm run seo:location-status -- --apply");
    return;
  }

  if (toPublish.length) {
    const n = await bulkUpdateStatus(
      toPublish.map((r) => r.id),
      "published",
    );
    console.log(`\npublished yapıldı: ${n}`);
  }
  if (toPause.length) {
    const n = await bulkUpdateStatus(
      toPause.map((r) => r.id),
      "paused",
    );
    console.log(`paused yapıldı: ${n}`);
  }

  // ── Nihai özet rapor ───────────────────────────────────────────────────────
  const final = await pool.query<{
    published_manual: number;
    published_total: number;
    paused_total: number;
    total: number;
  }>(
    `SELECT
        COUNT(*) FILTER (WHERE status = 'published' AND source_type = 'manual')::int AS published_manual,
        COUNT(*) FILTER (WHERE status = 'published')::int AS published_total,
        COUNT(*) FILTER (WHERE status = 'paused')::int AS paused_total,
        COUNT(*)::int AS total
       FROM pages
      WHERE is_deleted = FALSE`,
  );
  const f = final.rows[0]!;
  console.log("\n════════════════════ FİNAL RAPOR ════════════════════");
  console.log(`Toplam sayfa ................... ${f.total}`);
  console.log(`published + manual ............. ${f.published_manual}`);
  console.log(`published (tümü) ............... ${f.published_total}`);
  console.log(`paused ......................... ${f.paused_total}`);
}

void main()
  .catch((error) => {
    console.error("Konum status güncellemesi başarısız:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
