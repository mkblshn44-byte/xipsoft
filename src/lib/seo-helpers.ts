/**
 * seo-helpers.ts — TÜM sayfa şablonları için ORTAK metadata üretim motoru.
 *
 * Master şablon mimarisinde (BlogMaster `blog/[slug]`, ServiceMaster
 * `hizmetler/[...slug]`, Ana Sayfa `page.tsx`) canonical, robots, OpenGraph
 * ve Twitter kuralları TEK burada tanımlanır. Şablon dosyaları yalnızca DB
 * verisini verir; SEO standardı kodda tekrarlanmaz.
 *
 * Kurallar (tüm sayfalarda otomatik uygulanır):
 *  - Canonical HER zaman SITE_URL + kanonik yol (kopya içerik engeli)
 *  - indexable ise googleBot: max-image-preview=large + max-snippet=-1
 *  - indexable değilse noindex, follow (soft-404 koruması)
 *  - OG + Twitter (summary_large_image) her sayfada tutarlı üretilir
 *  - og:site_name tek kaynaktan (BRAND.name) gelir
 */

import type { Metadata } from "next";
import { BRAND, SITE_URL } from "@/config/brand.config";

/** OG tipini Next'in kendi Metadata tipinden türet (derin import'a gerek yok). */
type OpenGraphInput = Partial<NonNullable<Metadata["openGraph"]>>;

/** Tüm sayfalarda kullanılan varsayılan OG görseli (1200×630). */
export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/media/xipsoft-seo.webp`,
  width: 1200,
  height: 630,
  type: "image/png",
} as const;

export interface PageMetadataInput {
  title: string;
  description: string;
  /** Site köküne göre kanonik yol (ör. `/hizmetler/web-yazilim-tasarim`). */
  canonicalPath: string;
  keywords?: string[];
  /**
   * `true` → title'a Next kök şablonu eklenmez. DB başlığı zaten
   * "| XipSoft" gibi tam marka suffix'i içeriyorsa kullanılır.
   */
  titleAbsolute?: boolean;
  ogType?: "website" | "article";
  /** Sayfaya özgü görsel; verilmezse site varsayılan OG görseli. */
  image?: string;
  imageAlt?: string;
  /**
   * `false` → `noindex, follow`. Şablon/kopya riski taşıyan veya konum
   * kararı olumsuz olan sayfalar için (varsayılan: `true`).
   */
  indexable?: boolean;
  /** Sosyal paylaşım (OG + Twitter) başlığı; verilmezse `title` kullanılır. */
  shareTitle?: string;
  /** Sosyal paylaşım (OG + Twitter) açıklaması; verilmezse `description`. */
  shareDescription?: string;
  /** Article OG ek alanları (publishedTime, authors, tags …). */
  ogExtras?: OpenGraphInput;
}

/**
 * Standart sayfa metadata'sı üretir: title/description, canonical, robots,
 * OpenGraph ve Twitter — tek kural setiyle.
 */
export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const canonical = `${SITE_URL}${input.canonicalPath}`;
  const image = input.image ?? DEFAULT_OG_IMAGE.url;
  const imageAlt = input.imageAlt ?? input.title;
  const shareTitle = input.shareTitle ?? input.title;
  const shareDescription = input.shareDescription ?? input.description;
  const indexable = input.indexable ?? true;

  return {
    // absolute: DB başlığı zaten tam ise kök şablonun çift suffix eklemesini önler
    title: input.titleAbsolute ? { absolute: input.title } : input.title,
    description: input.description,
    ...(input.keywords && input.keywords.length > 0 ? { keywords: input.keywords } : {}),
    alternates: { canonical },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : { index: false, follow: true },
    openGraph: {
      type: input.ogType ?? "website",
      locale: "tr_TR",
      url: canonical,
      siteName: BRAND.name,
      title: shareTitle,
      description: shareDescription,
      images: [
        {
          url: image,
          width: DEFAULT_OG_IMAGE.width,
          height: DEFAULT_OG_IMAGE.height,
          alt: imageAlt,
        },
      ],
      ...input.ogExtras,
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: shareDescription,
      images: [image],
    },
  };
}
