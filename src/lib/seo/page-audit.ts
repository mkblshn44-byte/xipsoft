/**
 * seo/page-audit.ts — Sayfa SEO denetim hesaplama.
 */

import pool from "@/lib/db/pool";
import { hashPageContent } from "@/lib/pages/hash";

export interface SEOAuditResult {
  contentLength: number;
  headingCount: number;
  internalLinkCount: number;
  keywordCount: number;
  duplicateHash: string;
  thinContent: boolean;
  canonicalValid: boolean;
  metadataValid: boolean;
  schemaValid: boolean;
  score: number;
  issues: string[];
}

export interface PageAuditData {
  id: string;
  title: string;
  markdownContent: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string | null;
  serviceTitle: string;
  locationName: string;
}

export async function performSEOAudit(
  page: PageAuditData,
  options: { duplicates?: DuplicateHashIndex } = {},
): Promise<SEOAuditResult> {
  const issues: string[] = [];
  let score = 100;

  // Content length check
  const contentLength = page.markdownContent.length;
  if (contentLength < 300) {
    issues.push("İçerik çok kısa (en az 300 karakter önerilir)");
    score -= 20;
  }

  // Heading count check
  const headingCount = (page.markdownContent.match(/^#+\s/gm) || []).length;
  if (headingCount < 2) {
    issues.push("Yeterli başlık yok (en az 2 başlık önerilir)");
    score -= 10;
  }

  // Internal link count check
  const internalLinkCount = (page.markdownContent.match(/\[.*?\]\(\/.*?\)/g) || []).length;
  if (internalLinkCount < 1) {
    issues.push("İç link eksik (en az 1 iç link önerilir)");
    score -= 15;
  }

  // Keyword usage check (service title and location name in content)
  const keywords = [page.serviceTitle.toLowerCase(), page.locationName.toLowerCase()];
  const contentLower = page.markdownContent.toLowerCase();
  const keywordCount = keywords.filter(keyword => contentLower.includes(keyword)).length;
  if (keywordCount < keywords.length) {
    issues.push("Hizmet veya konum adı içerikte kullanılmamış");
    score -= 15;
  }

  // Duplicate content check
  const contentHash = hashPageContent(page.markdownContent);
  const duplicateHash = options.duplicates
    ? options.duplicates.findOther(contentHash, page.id)
    : await checkDuplicateHash(contentHash, page.id);
  if (duplicateHash) {
    issues.push("İçerik hash'i başka sayfa ile aynı (duplicate içerik riski)");
    score -= 30;
  }

  // Thin content check
  const thinContent = contentLength < 200 || headingCount < 1 || keywordCount < 1;
  if (thinContent) {
    issues.push("İçerik kalitesi düşük (thin content riski)");
    score -= 25;
  }

  // Metadata validation
  const metaTitleLength = page.metaTitle.length;
  const metaDescriptionLength = page.metaDescription.length;
  
  let metadataValid = true;
  if (metaTitleLength < 30 || metaTitleLength > 60) {
    issues.push(`Meta title uzunluğu uygun değil (${metaTitleLength} karakter, 30-60 arası önerilir)`);
    metadataValid = false;
    score -= 10;
  }
  
  if (metaDescriptionLength < 120 || metaDescriptionLength > 160) {
    issues.push(`Meta description uzunluğu uygun değil (${metaDescriptionLength} karakter, 120-160 arası önerilir)`);
    metadataValid = false;
    score -= 10;
  }

  // Canonical validation
  let canonicalValid = true;
  if (!page.canonicalUrl) {
    issues.push("Canonical URL eksik");
    canonicalValid = false;
    score -= 10;
  }

  // Public local pages emit Service and BreadcrumbList JSON-LD from the route.
  // Validate the data required by that schema instead of treating it as valid by default.
  const schemaValid = Boolean(
    page.title.trim()
      && page.serviceTitle.trim()
      && page.locationName.trim()
      && page.canonicalUrl
      && /^https?:\/\//i.test(page.canonicalUrl),
  );
  if (!schemaValid) {
    issues.push("Schema için başlık, hizmet, konum ve absolute canonical URL tamamlanmalı");
    score -= 10;
  }

  return {
    contentLength,
    headingCount,
    internalLinkCount,
    keywordCount,
    duplicateHash: duplicateHash || "",
    thinContent,
    canonicalValid,
    metadataValid,
    schemaValid,
    score: Math.max(0, score),
    issues,
  };
}

async function checkDuplicateHash(contentHash: string, excludePageId: string): Promise<string | null> {
  try {
    const { rows } = await pool.query(
      `SELECT content_hash FROM pages 
       WHERE content_hash = $1 AND id != $2::uuid AND is_deleted = FALSE
       LIMIT 1`,
      [contentHash, excludePageId],
    );
    return rows[0]?.content_hash || null;
  } catch {
    return null;
  }
}

/** hash → bu hash'e sahip sayfa id'leri. */
export interface DuplicateHashIndex {
  /** Aynı içeriğe sahip başka bir sayfanın hash'ini döner; yoksa `null`. */
  findOther(contentHash: string, excludePageId: string): string | null;
}

/**
 * Toplu denetimde sayfa başına tekil sorgu yerine tüm hash'leri TEK sorguyla
 * çeker (REFACTOR.md §9.1 Adım 4 / P4).
 */
export async function loadDuplicateHashIndex(
  contentHashes: string[],
): Promise<DuplicateHashIndex> {
  const byHash = new Map<string, string[]>();
  const unique = [...new Set(contentHashes.filter(Boolean))];
  if (unique.length === 0) {
    return { findOther: () => null };
  }

  try {
    const { rows } = await pool.query<{ id: string; content_hash: string }>(
      `SELECT id::text AS id, content_hash FROM pages
       WHERE content_hash = ANY($1::text[]) AND is_deleted = FALSE`,
      [unique],
    );
    for (const row of rows) {
      const existing = byHash.get(row.content_hash);
      if (existing) existing.push(row.id);
      else byHash.set(row.content_hash, [row.id]);
    }
  } catch {
    // İndeks kurulamazsa boş harita kalır; denetim tekil sorguya düşmez.
  }

  return {
    findOther(contentHash, excludePageId) {
      const owners = byHash.get(contentHash);
      if (!owners) return null;
      return owners.some((id) => id !== excludePageId) ? contentHash : null;
    },
  };
}
