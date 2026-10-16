/**
 * Services (formerly db-services) — `services` tablosu.
 */

import { unstable_cache } from "next/cache";
import pool from "./pool";
import { normalizeBrandColor, normalizeBrandColorInString } from "@/lib/brand-color";
import { getServiceFallback } from "@/config/service-fallback";

export interface ServiceStat { value: string; label: string }
export interface ServiceFeature { icon: string; title: string; description: string; color: string }
export interface ServiceTechItem { name: string; color: string }
export interface ServiceProcessStep { step: string; title: string; description: string; color: string }
export interface ServicePackage {
  name: string; price: string; desc: string; color: string;
  popular?: boolean; features: string[];
}
export interface ServiceMicroService {
  title: string; keywords: string[]; color: string;
  icon: string; description: string;
}
export interface ServiceFaqItem { question: string; answer: string }

export interface ServicePageData {
  slug: string;
  badge: string;
  badgeIcon: string;
  badgegradient: string;
  badgeColor: string;
  title: string;
  titlegradient: string;
  subtitle: string;
  heroCta: string;
  stats: ServiceStat[];
  features: ServiceFeature[];
  techStack: ServiceTechItem[];
  servicesTag?: ServiceTechItem[];
  processTitle?: string;
  processDesc?: string;
  processSteps: ServiceProcessStep[];
  packages: ServicePackage[];
  ctaTitle: string;
  ctaDesc: string;
  ctaBtn: string;
  microServices: ServiceMicroService[];
  faqTitle: string;
  faqItems: ServiceFaqItem[];
  metadata: {
    title: string;
    description: string;
    keywords: string[];
  };
}

/** DB'den gelen renk alanlarını marka paletine (mor + cyan) indirger. */
const mapColor = <T extends { color?: string }>(items: unknown): T[] =>
  Array.isArray(items)
    ? (items as T[]).map((it) => ({ ...it, color: normalizeBrandColor(it?.color) }))
    : [];

function mapServiceRowToPageData(row: Record<string, unknown>): ServicePageData {
  const r = row as any;
  return {
    slug: r.slug,
    badge: r.badge,
    badgeIcon: r.badge_icon,
    badgegradient: normalizeBrandColorInString(r.badge_gradient),
    badgeColor: r.badge_color,
    title: r.title,
    titlegradient: normalizeBrandColorInString(r.title_gradient),
    subtitle: r.subtitle,
    heroCta: r.hero_cta,
    stats: r.stats ?? [],
    features: mapColor<ServiceFeature>(r.features),
    techStack: mapColor<ServiceTechItem>(r.tech_stack),
    servicesTag: mapColor<ServiceTechItem>(r.services_tag),
    processTitle: r.process_title,
    processDesc: r.process_desc,
    processSteps: mapColor<ServiceProcessStep>(r.process_steps),
    packages: mapColor<ServicePackage>(r.packages),
    ctaTitle: r.cta_title,
    ctaDesc: r.cta_desc,
    ctaBtn: r.cta_btn,
    microServices: mapColor<ServiceMicroService>(r.micro_services),
    faqTitle: r.faq_title,
    faqItems: r.faq_items ?? [],
    metadata: r.metadata ?? { title: r.title, description: r.subtitle, keywords: [] },
  };
}

/** Önbelleklenmemiş ham hizmet sorgusu (service-city gibi iç tüketiciler için). */
export async function queryServiceFromDB(slug: string): Promise<ServicePageData | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM services WHERE slug = $1 AND is_active = true LIMIT 1`,
      [slug]
    );
    if (rows[0]) return mapServiceRowToPageData(rows[0]);
  } catch (error) {
    console.warn(
      "[Services] DB lookup unavailable:",
      error instanceof Error ? error.message : error,
    );
  }

  return null;
}

export function getServiceFromDB(slug: string): Promise<ServicePageData | null> {
  return unstable_cache(
    () => queryServiceFromDB(slug),
    ["service", slug],
    { revalidate: 3600, tags: ["services", `service:${slug}`] },
  )();
}

/** `resolveServicePage` sonucu: veri + kaynağı. */
export interface ResolvedServicePage {
  service: ServicePageData;
  /** `db` → gerçek içerik; `fallback` → config iskeleti (noindex). */
  source: "db" | "fallback";
}

/**
 * Hizmet detay verisini **DB → config fallback** sırasıyla çözer.
 *
 * - DB'de kayıt varsa zengin `ServicePageData` döner (`source: "db"`).
 * - DB'de yoksa ama config allowlist'inde varsa iskelet döner
 *   (`source: "fallback"` — çağıran taraf `noindex` uygular).
 * - Ne DB'de ne config'de varsa `null` döner (→ 404).
 *
 * Şablon–içerik ayrımı ve fallback katmanları: MIMARI.md §3/§6, SEO.md §5.3.
 */
export async function resolveServicePage(slug: string): Promise<ResolvedServicePage | null> {
  const fromDb = await getServiceFromDB(slug);
  if (fromDb) return { service: fromDb, source: "db" };

  const fallback = getServiceFallback(slug);
  if (fallback) return { service: fallback, source: "fallback" };

  return null;
}

async function queryAllActiveServices(): Promise<ServicePageData[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const { rows } = await pool.query(
      `SELECT * FROM services WHERE is_active = true ORDER BY sort_order ASC, id ASC`
    );
    return rows.map(mapServiceRowToPageData);
  } catch (error) {
    console.warn(
      "[Services] DB lookup unavailable:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

/**
 * Tüm aktif hizmetleri NeonDB'den çeker (blog "İlgili Hizmetler" iç linkleme vb.).
 * Statik fallback yoktur; DB erişilemezse boş liste döner.
 */
export function getAllActiveServices(): Promise<ServicePageData[]> {
  return unstable_cache(queryAllActiveServices, ["all-active-services"], {
    revalidate: 3600,
    tags: ["services", "sitemap"],
  })();
}

async function queryAllServiceSlugs(): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const { rows } = await pool.query(
      `SELECT slug FROM services WHERE is_active = true ORDER BY sort_order ASC`
    );
    return rows.map((r) => r.slug);
  } catch (error) {
    console.warn(
      "[Services] slug lookup unavailable:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

export function getAllServiceSlugs(): Promise<string[]> {
  // unstable_cache: sitemap + generateStaticParams her çalıştığında Neon'a
  // sorgu atmak yerine 1 saat cache'le. Hizmet güncellenince admin API'sindeki
  // revalidateTag("services") ile anında tazelenir.
  return unstable_cache(
    queryAllServiceSlugs,
    ["all-service-slugs"],
    { revalidate: 3600, tags: ["services", "sitemap"] },
  )();
}
