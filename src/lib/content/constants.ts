/**
 * İçerik API'sinin paylaşılan sabitleri (pages domain'i).
 */

/** `pages.status` izinli değerleri. */
export const PAGE_STATUSES: ReadonlySet<string> = new Set([
  "draft",
  "review",
  "published",
  "paused",
]);

/** `pages.source_type` izinli değerleri. */
export const PAGE_SOURCE_TYPES: ReadonlySet<string> = new Set(["manual", "template", "ai"]);

/** UUID biçim testi (locations.id gibi). */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
