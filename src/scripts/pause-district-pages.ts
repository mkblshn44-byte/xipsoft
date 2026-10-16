/**
 * Öncelik DIŞINDAKİ yayınlı ilçe sayfalarını pasife alır.
 *
 * Öncelik kuralı tek kaynaktan (src/config/priority-locations.ts) gelir:
 *  - En büyük 10 ilin TÜM ilçeleri + MAJOR_DISTRICTS listesi korunur.
 *  - Kalan ilçeler `status = 'paused'` yapılır (rota il sayfasına yönlendirir).
 *
 * NOT: İl sayfaları ve zenginleştirilmiş (`source_type = 'manual'`) sayfalar
 * bu script tarafından pasife alınmaz.
 *
 * Kullanım:
 *   npm run seo:pause-districts                (önizleme; varsayılan)
 *   npm run seo:pause-districts -- --apply     (değişiklikleri uygula)
 */
import pool from "@/lib/database";
import { isPriorityDistrict } from "@/config/priority-locations";

const applyChanges = process.argv.includes("--apply");

async function main() {
  const { rows } = await pool.query<{
    id: string;
    slug: string;
    source_type: string | null;
    location_slug: string | null;
    parent_slug: string | null;
  }>(
    `SELECT p.id::text AS id, p.slug, p.source_type,
            l.slug AS location_slug, parent.slug AS parent_slug
       FROM pages p
       JOIN locations l ON l.id = p.location_id AND l.location_type = 'district'
       JOIN locations parent ON parent.id = l.parent_id
      WHERE p.status = 'published'
        AND p.is_deleted = FALSE`,
  );

  const toPause = rows.filter(
    (r) =>
      r.source_type !== "manual" &&
      !isPriorityDistrict(r.parent_slug, r.location_slug),
  );

  console.log(`Pasife alınacak (öncelik dışı) ilçe sayfası: ${toPause.length}`);

  if (!applyChanges) {
    console.log("[dry-run] Önizleme tamamlandı; değişiklik yapılmadı. Uygulamak için --apply kullanın.");
    return;
  }
  if (toPause.length === 0) return;

  const CHUNK = 500;
  let affected = 0;
  for (let i = 0; i < toPause.length; i += CHUNK) {
    const chunk = toPause.slice(i, i + CHUNK).map((r) => r.id);
    const res = await pool.query(
      `UPDATE pages SET status = 'paused', updated_at = NOW() WHERE id = ANY($1::uuid[])`,
      [chunk],
    );
    affected += res.rowCount ?? 0;
  }
  console.log(`Pasife alındı: ${affected}`);
}

void main()
  .catch((error) => {
    console.error("İlçe sayfaları pasife alınamadı:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
