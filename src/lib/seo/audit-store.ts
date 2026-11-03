/**
 * seo/audit-store.ts — SEO denetim sonuçlarını kalıcılaştırma.
 */

import pool from "@/lib/db/pool";
import type { SEOAuditResult } from "./page-audit";

export async function saveSEOAudit(pageId: string, audit: SEOAuditResult): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO seo_page_audits 
       (page_id, content_length, heading_count, internal_link_count, keyword_count, 
        duplicate_hash, thin_content, canonical_valid, metadata_valid, schema_valid, 
        score, issues, checked_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, NOW())`,
      [
        pageId,
        audit.contentLength,
        audit.headingCount,
        audit.internalLinkCount,
        audit.keywordCount,
        audit.duplicateHash,
        audit.thinContent,
        audit.canonicalValid,
        audit.metadataValid,
        audit.schemaValid,
        audit.score,
        JSON.stringify(audit.issues),
      ],
    );
  } catch (error) {
    console.error("[SEOAudit] Failed to save audit:", error);
  }
}
