/**
 * pages/hash.ts — Sayfa içerik hash'i ve normalizasyon yardımcıları.
 */

import crypto from "node:crypto";
import { slugify } from "@/utils/slugify";
import { SITE_URL } from "@/lib/site-url";
import type { PublishedPage } from "./types";

export function normalizeSlug(value: string): string {
  return slugify(value.trim());
}

export function normalizePublishedPage(page: PublishedPage | undefined): PublishedPage | null {
  if (!page) return null;

  const canonicalUrl = page.canonicalUrl?.trim();
  if (!canonicalUrl) return page;

  try {
    const canonical = new URL(canonicalUrl, SITE_URL);
    const hostname = canonical.hostname.toLowerCase();
    const isLocalCanonical = hostname === "localhost"
      || hostname.endsWith(".localhost")
      || hostname === "0.0.0.0"
      || /^127(?:\.\d{1,3}){3}$/.test(hostname)
      || hostname === "[::1]";

    return {
      ...page,
      canonicalUrl: isLocalCanonical
        ? `${SITE_URL}/hizmetler/${page.slug}`
        : canonical.toString(),
    };
  } catch {
    return { ...page, canonicalUrl: null };
  }
}

export function hashPageContent(markdownContent: string): string {
  return crypto.createHash("sha256").update(markdownContent, "utf8").digest("hex");
}
