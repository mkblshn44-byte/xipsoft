/**
 * Services (formerly db-services) — `services` tablosu.
 */

import { unstable_cache } from "next/cache";
import pool from "./pool";
import { normalizeBrandColor, normalizeBrandColorInString } from "@/lib/brand-color";
import { toSchemaMarkup } from "@/lib/schema-markup";
import { pageCacheKey, withPageCache } from "@/lib/redis/page-cache";
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

/** `services.guide` jsonb — opsiyonel uzun rehber bölümü (DB'den yönetilir). */
export interface ServiceGuidePrinciple { title: string; description: string }
export interface ServiceGuideStep { title: string; description: string }
export interface ServiceGuideFaq { question: string; answer: string }
export interface ServiceGuideData {
  eyebrow?: string;
  title?: string;
  intro?: string;
  principles?: ServiceGuidePrinciple[];
  processTitle?: string;
  processIntro?: string[];
  processSteps?: ServiceGuideStep[];
  seoTitle?: string;
  seoText?: string;
  faqTitle?: string;
  faq?: ServiceGuideFaq[];
}

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
  /** Bölüm başlıkları (DB'den; eski sabit metinler). */
  featuresTitle?: string | null;
  featuresDesc?: string | null;
  techStack: ServiceTechItem[];
  techTitle?: string | null;
  servicesTag?: ServiceTechItem[];
  processTitle?: string;
  processDesc?: string;
  processSteps: ServiceProcessStep[];
  packages: ServicePackage[];
  packagesTitle?: string | null;
  packagesDesc?: string | null;
  ctaTitle: string;
  ctaDesc: string;
  ctaBtn: string;
  microServices: ServiceMicroService[];
  microTitle?: string | null;
  microDesc?: string | null;
  faqTitle: string;
  faqItems: ServiceFaqItem[];
  /** Opsiyonel uzun rehber bölümü (yalnızca içerik girilmiş hizmetlerde). */
  guide?: ServiceGuideData | null;
  /** DB'den gelen ham JSON-LD şemaları (`services.schema_markup`); yoksa null. */
  schemaMarkup?: Record<string, unknown>[] | null;
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

export function mapServiceRowToPageData(row: Record<string, unknown>): ServicePageData {
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
    featuresTitle: r.features_title ?? null,
    featuresDesc: r.features_desc ?? null,
    techStack: mapColor<ServiceTechItem>(r.tech_stack),
    techTitle: r.tech_title ?? null,
    servicesTag: mapColor<ServiceTechItem>(r.services_tag),
    processTitle: r.process_title,
    processDesc: r.process_desc,
    processSteps: mapColor<ServiceProcessStep>(r.process_steps),
    packages: mapColor<ServicePackage>(r.packages),
    packagesTitle: r.packages_title ?? null,
    packagesDesc: r.packages_desc ?? null,
    ctaTitle: r.cta_title,
    ctaDesc: r.cta_desc,
    ctaBtn: r.cta_btn,
    microServices: mapColor<ServiceMicroService>(r.micro_services),
    microTitle: r.micro_title ?? null,
    microDesc: r.micro_desc ?? null,
    faqTitle: r.faq_title,
    faqItems: r.faq_items ?? [],
    guide: r.guide ?? null,
    schemaMarkup: toSchemaMarkup(r.schema_markup),
    metadata: r.metadata ?? { title: r.title, description: r.subtitle, keywords: [] },
  };
}

/**
 * Önbelleklenmemiş ham hizmet sorgusu (service-city gibi iç tüketiciler için).
 *
 * `row_type = 'main'` şart: aynı tabloda `row_type='location'` ayna satırları
 * de duruyor; onları adreslemek tek-kaynak ilkesini bozar (MIMARI.md §11.6.3/B6).
 */
export async function queryServiceFromDB(slug: string): Promise<ServicePageData | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM services
        WHERE slug = $1 AND row_type = 'main' AND is_active = true LIMIT 1`,
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
  // Redis read-through (24 saat) → Next veri katmanı (1 saat) → Neon.
  return withPageCache(pageCacheKey("svc", slug), () =>
    unstable_cache(
      () => queryServiceFromDB(slug),
      ["service-v2", slug],
      { revalidate: 3600, tags: ["services", `service:${slug}`] },
    )(),
  );
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
 * Şablon–içerik ayrımı ve fallback katmanları: MIMARI.md §3/§6.
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
      `SELECT * FROM services WHERE is_active = true AND row_type = 'main' ORDER BY sort_order ASC, id ASC`
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
      `SELECT slug FROM services WHERE is_active = true AND row_type = 'main' ORDER BY sort_order ASC`
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
