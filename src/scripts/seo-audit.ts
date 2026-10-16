import pool from "@/lib/database";
import { performSEOAudit, saveSEOAudit, type PageAuditData } from "@/lib/seo-audit";

interface PageRow extends PageAuditData {
  id: string;
}

async function main() {
  const result = await pool.query<PageRow>(
    `SELECT p.id::text,
            p.title,
            p.markdown_content AS "markdownContent",
            p.meta_title AS "metaTitle",
            p.meta_description AS "metaDescription",
            p.canonical_url AS "canonicalUrl",
            s.title AS "serviceTitle",
            l.name AS "locationName"
     FROM pages p
     JOIN services s ON s.id = p.service_id
     JOIN locations l ON l.id = p.location_id
     WHERE p.is_deleted = FALSE
       AND p.status IN ('review', 'published')
     ORDER BY p.updated_at DESC`,
  );

  let failed = 0;
  for (const page of result.rows) {
    try {
      const audit = await performSEOAudit(page);
      await saveSEOAudit(page.id, audit);
      console.log(`${page.id}: score=${audit.score}, issues=${audit.issues.length}`);
    } catch (error) {
      failed++;
      console.error(`Audit başarısız (${page.id}):`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`SEO audit tamamlandı: ${result.rows.length - failed}/${result.rows.length} başarılı.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("SEO audit başlatılamadı:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
