/**
 * pages/types.ts — Sayfa & yerel SEO domain tipleri.
 */

export type LocationType = "province" | "district" | "neighborhood";

export interface LocalSeoContext {
  economicProfile?: string;
  industries?: string[];
  regionalFeatures?: string[];
}

export interface CentralLocation {
  serviceId: string; // UUID
  serviceTitle: string;
  serviceSlug: string;
  serviceDescription: string;
  locationId: string; // UUID
  locationName: string;
  locationSlug: string;
  locationType: LocationType;
  parentLocationName: string | null;
  parentLocationSlug?: string | null;
  localAreaNames?: string[];
  localSeoContext?: LocalSeoContext | null;
}

export interface LocalFaqItem {
  question: string;
  answer: string;
}

export interface PublishedPage {
  id: string;
  serviceId: string;
  locationId: string;
  slug: string;
  title: string;
  markdownContent: string;
  metaTitle: string;
  metaDescription: string;
  /** Şehre/ilçeye özel özgün giriş paragrafı (migration 005). */
  lokalAciklama: string | null;
  /** Şehre/ilçeye özel optimize edilmiş meta açıklama (migration 005). */
  ozelMetaDesc: string | null;
  /** Şehre/ilçeye özel SSS dizisi (migration 005). */
  lokalSss: LocalFaqItem[] | null;
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  status: "draft" | "review" | "published" | "paused";
  /**
   * Sayfanın üretim kaynağı. `manual` = elle yazılmış özgün içerik (indexlenir);
   * `template`/`ai` = şablon üretimi (kopya riski → noindex). İndeksleme kararı
   * bu alana dayanır (bkz. [sehir]/page.tsx).
   */
  sourceType: string;
  contentHash: string;
  publishedAt: Date | null;
  updatedAt: Date;
}
