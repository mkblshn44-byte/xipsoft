/**
 * Hizmetler Hub — Veri Erişim Katmanı (NeonDB)
 *
 * Mimari kural: Frontend yalnızca şablondur; hizmet listesi, başlıklar,
 * açıklamalar, özellikler ve SSS içerikleri `services` tablosundan gelir.
 * Statik/gömülü içerik TUTULMAZ; DB erişilemezse boş liste döner.
 */
import pool from "@/lib/db/pool";
import { unstable_cache } from "next/cache";
import type { ServiceHubCategory, ServiceHubItem } from "@/types/common";
import { normalizeBrandColor } from "@/lib/brand-color";
import { queryDynamicContentFaq } from "@/lib/page-content";

export interface HubFaqItem {
  question: string;
  answer: string;
}

export interface ServicesHubData {
  services: ServiceHubItem[];
  faq: HubFaqItem[];
}

/** Hizmet kategorileri — sunum (UI) taksonomisi. İçerik değildir. */
const CATEGORY_LABELS: Record<ServiceHubCategory, string> = {
  all: "Tüm Hizmetler",
  software: "Yazılım & Web",
  automation: "Otomasyon & AI",
  mobile: "Mobil Çözümler",
  "cloud-security": "Bulut & Güvenlik",
};

interface HubMeta {
  category?: ServiceHubCategory;
  categoryLabel?: string;
  shortDesc?: string;
  features?: string[];
  popular?: boolean;
  color?: string;
}

interface ServiceRow {
  slug: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  badge_icon: string | null;
  features: Array<{ title?: string; color?: string }> | null;
  faq_items: Array<{ question?: string; answer?: string }> | null;
  metadata: { hub?: HubMeta } | null;
}

function isHubCategory(value: unknown): value is ServiceHubCategory {
  return (
    value === "all" ||
    value === "software" ||
    value === "automation" ||
    value === "mobile" ||
    value === "cloud-security"
  );
}

/** DB satırını hub kartına çevirir. Tüm içerik DB'den gelir. */
function mapServiceRow(row: ServiceRow): ServiceHubItem {
  const hub: HubMeta = row.metadata?.hub ?? {};

  const dbFeatures = (row.features ?? [])
    .map((f) => f?.title)
    .filter((t): t is string => Boolean(t));

  const features =
    (hub.features && hub.features.length > 0 ? hub.features : undefined) ??
    (dbFeatures.length > 0 ? dbFeatures : undefined) ??
    [];

  const category = isHubCategory(hub.category) ? hub.category : "all";

  return {
    slug: row.slug,
    title: row.title,
    category,
    categoryLabel: hub.categoryLabel ?? CATEGORY_LABELS[category],
    badge: row.badge ?? "",
    icon: row.badge_icon ?? "Globe",
    color: normalizeBrandColor(hub.color ?? row.features?.[0]?.color ?? "#ddd6fe"),
    shortDesc: hub.shortDesc ?? row.subtitle ?? "",
    features,
    popular: hub.popular ?? false,
  };
}

/** Aktif hizmetlerin SSS'lerinden tekilleştirilmiş ortak liste üretir. */
function collectFaq(rows: ServiceRow[]): HubFaqItem[] {
  const seen = new Set<string>();
  const faq: HubFaqItem[] = [];

  for (const row of rows) {
    for (const item of row.faq_items ?? []) {
      const question = item?.question?.trim();
      const answer = item?.answer?.trim();
      if (!question || !answer || seen.has(question)) continue;
      seen.add(question);
      faq.push({ question, answer });
      if (faq.length >= 8) return faq;
    }
  }

  return faq;
}

/** DB'deki genel site SSS'leri (xip_dynamic_content, content_type='faq'). */
async function querySiteFaq(): Promise<HubFaqItem[]> {
  return queryDynamicContentFaq("faq");
}

async function queryServicesHubData(): Promise<ServicesHubData> {
  if (!process.env.DATABASE_URL) return { services: [], faq: [] };

  try {
    const { rows } = await pool.query<ServiceRow>(
      `SELECT slug, title, subtitle, badge, badge_icon,
              features, faq_items, metadata
       FROM services
       WHERE is_active = true
         AND row_type = 'main'
       ORDER BY sort_order ASC, id ASC`,
    );

    // Öncelik: hizmet SSS'leri (DB) -> genel site SSS'leri (DB)
    const serviceFaq = collectFaq(rows);
    const faq = serviceFaq.length > 0 ? serviceFaq : await querySiteFaq();

    return {
      services: rows.map(mapServiceRow),
      faq,
    };
  } catch (error) {
    console.warn(
      "[ServicesHub] DB lookup unavailable, returning empty:",
      error instanceof Error ? error.message : error,
    );
    return { services: [], faq: [] };
  }
}

export function getServicesHubData(): Promise<ServicesHubData> {
  // Admin panelinden hizmet güncellendiğinde revalidateTag("services") ile
  // önbellek anında tazelenir. Anahtar sürümü (v2) DB şeması/içeriği
  // değiştiğinde eski Data Cache kopyasının sızmasını engeller.
  return unstable_cache(queryServicesHubData, ["services-hub-v3"], {
    revalidate: 3600,
    tags: ["services", "sitemap"],
  })();
}
