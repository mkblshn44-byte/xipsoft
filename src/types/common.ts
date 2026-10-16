// Ortak tipler — ISP: her modul sadece ihtiyacı olanı import eder

export type PostStatus = "draft" | "published";

export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  nextOffset: number;
}

export interface HomeHeroCopy {
  titleLine1: string;
  titleLine2: string;
  titleLine3: string;
  subtitle: string;
  subtitleHighlight: string;
  subtitleEnd: string;
  ctaPrimary: string;
  ctaSecondary: string;
  statYears: string;
  statProjects: string;
  statClients: string;
  statServices: string;
}

/** /hizmetler/[slug]/[sehir] şablonunun ihtiyaç duyduğu minimal konum tipi. */
export interface ServiceDistrict {
  slug: string;
  name: string;
  description: string;
}

/** Hizmetler hub kartı kategorileri (UI taksonomisi). */
export type ServiceHubCategory =
  | "all"
  | "software"
  | "automation"
  | "mobile"
  | "cloud-security";

/**
 * Hizmetler hub kartı verisi. Tamamı DB `services` tablosundan
 * (+ `metadata.hub`) türetilir (bkz. lib/services-hub.ts).
 */
export interface ServiceHubItem {
  slug: string;
  title: string;
  category: ServiceHubCategory;
  categoryLabel: string;
  badge: string;
  icon: string;
  color: string;
  shortDesc: string;
  features: string[];
  popular?: boolean;
}
