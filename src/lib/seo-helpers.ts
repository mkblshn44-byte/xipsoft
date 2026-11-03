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
 *  - DB'de `robots`/`meta_robots` alanı doluysa O değer yukarıdakini EZER
 *    (bkz. `parseRobotsDirective`) — panelden "noindex, noarchive" yazmak yeterli
 *  - OG + Twitter (summary_large_image) her sayfada tutarlı üretilir
 *  - og:site_name tek kaynaktan (BRAND.name) gelir
 */

import type { Metadata } from "next";
import { BRAND, DEFAULT_OG_IMAGE_URL, SITE_URL } from "@/config/brand.config";

/** OG tipini Next'in kendi Metadata tipinden türet (derin import'a gerek yok). */
type OpenGraphInput = Partial<NonNullable<Metadata["openGraph"]>>;

/** `Metadata.robots`un nesne hâli (string ve null dışarıda) — index/follow alanları erişilebilir olsun. */
type RobotsInput = Exclude<NonNullable<Metadata["robots"]>, string>;

/** Tüm sayfalarda kullanılan varsayılan OG görseli (1200×630). */
export const DEFAULT_OG_IMAGE = {
  url: DEFAULT_OG_IMAGE_URL,
  width: 1200,
  height: 630,
  type: "image/png",
} as const;

/** `noindex, nofollow` — admin, arama ve filtreli parametreli sayfaların varsayılanı. */
export const NOINDEX_NOFOLLOW = { index: false, follow: false } satisfies RobotsInput;

/**
 * DB'deki `robots` / `meta_robots` metnini Next `Metadata.robots`una çevirir.
 *
 * Panelden yazılan serbest metin (`"noindex, nofollow"`, `"all"`,
 * `"noindex, noarchive, max-snippet:-1"` …) doğrudan desteklenir. Boş ya da
 * tanınmayan değerlerde `undefined` döner — çağıran kendi varsayılanını uygular.
 */
export function parseRobotsDirective(
  raw?: string | null,
): RobotsInput | undefined {
  if (!raw) return undefined;
  const text = raw.trim().toLowerCase();
  if (!text) return undefined;
  if (text === "all" || text === "index, follow") {
    return { index: true, follow: true };
  }
  if (text === "none") return { index: false, follow: false };

  const tokens = new Set(text.split(/[,\s]+/).filter(Boolean));
  const has = (...names: string[]) => names.some((n) => tokens.has(n));
  const index = has("noindex") ? false : has("index") ? true : undefined;
  const follow = has("nofollow") ? false : has("follow") ? true : undefined;
  const blockAll = index === false && follow === false;
  const unknown = [...tokens].filter(
    (t) => !["index", "noindex", "follow", "nofollow", "none", "all"].includes(t),
  );

  // Yalnızca bilinen ikili direktifler varsa düz nesne; `noarchive`,
  // `max-snippet` gibi ek direktifler varsa googleBot üzerinden iletilir.
  if (unknown.length === 0) {
    return {
      ...(index === undefined ? {} : { index }),
      ...(follow === undefined ? {} : { follow }),
    };
  }
  return {
    ...(index === undefined ? {} : { index }),
    ...(follow === undefined ? {} : { follow }),
    googleBot: {
      index: index ?? !blockAll,
      follow: follow ?? !blockAll,
      noarchive: tokens.has("noarchive"),
      nosnippet: tokens.has("nosnippet"),
      noimageindex: tokens.has("noimageindex"),
      "max-snippet": readNumberDirective(tokens, "max-snippet"),
      "max-image-preview": readEnumDirective(tokens, "max-image-preview"),
      "max-video-preview": readNumberDirective(tokens, "max-video-preview"),
    },
  };
}

/**
 * Başlıktaki duplicate marka suffix'ini temizler.
 *
 * Örnekler:
 * - "Başlık | XipSoft | XipSoft" → "Başlık | XipSoft"
 * - "Başlık | XipSoft Yazılım ve Teknoloji Sistemleri | XipSoft" → "Başlık | XipSoft"
 * - "Başlık | XipSoft" → "Başlık | XipSoft" (değişmez)
 *
 * Bu fonksiyon, DB'den gelen başlıkların zaten marka suffix içerip içermediğini
 * kontrol eder ve duplicate varsa temizler.
 */
export function sanitizeDuplicateBrandSuffix(title: string): string {
  if (!title) return title;

  const brandName = BRAND.name;
  const shortName = BRAND.shortName;

  // Brand adının sonunda tekrar olup olmadığını kontrol et
  // Pattern: "... | XipSoft | XipSoft" veya "... | XipSoft Yazılım ve Teknoloji Sistemleri | XipSoft"
  const patterns = [
    new RegExp(`\\s*\\|\\s*${escapeRegex(brandName)}\\s*\\|\\s*${escapeRegex(shortName)}\\s*$`, 'i'),
    new RegExp(`\\s*\\|\\s*${escapeRegex(shortName)}\\s*\\|\\s*${escapeRegex(shortName)}\\s*$`, 'i'),
    new RegExp(`\\s*\\|\\s*${escapeRegex(brandName)}\\s*\\|\\s*${escapeRegex(brandName)}\\s*$`, 'i'),
  ];

  for (const pattern of patterns) {
    if (pattern.test(title)) {
      // İlk occurrence'ı kaldır, ikincisini bırak
      return title.replace(pattern, ` | ${shortName}`);
    }
  }

  return title;
}

/** Regex özel karakterlerini escape eder */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `max-snippet:-1` gibi `anahtar:değer` direktiflerinden sayı okur. */
function readNumberDirective(tokens: Set<string>, name: string): number | undefined {
  for (const token of tokens) {
    if (!token.startsWith(`${name}:`)) continue;
    const value = Number(token.slice(name.length + 1));
    if (!Number.isNaN(value)) return value;
  }
  return undefined;
}

/** `max-image-preview:large` gibi direktiflerden enum okur. */
function readEnumDirective(
  tokens: Set<string>,
  name: string,
): "none" | "standard" | "large" | undefined {
  for (const token of tokens) {
    if (!token.startsWith(`${name}:`)) continue;
    const value = token.slice(name.length + 1);
    if (value === "none" || value === "standard" || value === "large") return value;
  }
  return undefined;
}

export interface PageMetadataInput {
  title: string;
  description: string;
  /** Site köküne göre kanonik yol (ör. `/hizmetler/web-yazilim-tasarim1.html`). */
  canonicalPath: string;
  keywords?: string[];
  /**
   * `true` → title'a Next kök şablonu eklenmez. DB başlığı zaten
   * "| XipSoft" gibi tam marka suffix'i içeriyorsa kullanılır.
   *
   * NOT: Eğer `false` ise başlık zaten marka suffix içeriyorsa, otomatik
   * olarak temizlenir ve kök şablon uygulanır (duplicate prevention).
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
  /**
   * DB'den (`pages.robots` / `meta_robots`) gelen ham direktif metni. Doluysa
   * `indexable` kararını EZER — panelde "noindex, noarchive" yazmak yeterli.
   */
  robotsOverride?: string | null;
  /** Sosyal paylaşım (OG + Twitter) başlığı; verilmezse `title` kullanılır. */
  shareTitle?: string;
  /** Sosyal paylaşım (OG + Twitter) açıklaması; verilmezse `description`. */
  shareDescription?: string;
  /** Article OG ek alanları (publishedTime, authors, tags …). */
  ogExtras?: OpenGraphInput;
}

/**
 * Sayfa türleri için dinamik title oluşturma
 *
 * Bu fonksiyon, her sayfa türü için benzersiz ve SEO uyumlu başlıklar üretir.
 * Duplicate başlık sorunlarını önlemek için her sayfa türü özel bir kalıp kullanır.
 */
export type PageType =
  | "home"
  | "services"
  | "products"
  | "blog-list"
  | "blog-detail"
  | "service-detail"
  | "about"
  | "contact"
  | "generic";

/**
 * Sayfa türüne göre dinamik title oluşturur.
 *
 * Formül: [Sayfaya Özel Anahtar Kelime / Özgün Başlık] + [Ayrıcı Özellik] | [Marka]
 *
 * @param pageType - Sayfa türü
 * @param customTitle - Özelleştirilmiş başlık (opsiyonel)
 * @param extraInfo - Ek bilgi (örn: yıl, şehir, kategori)
 * @returns SEO uyumlu benzersiz başlık
 */
export function generateDynamicTitle(
  pageType: PageType,
  customTitle?: string,
  extraInfo?: string
): string {
  const year = new Date().getFullYear();
  const brandSuffix = ` | ${BRAND.shortName}`;

  // Sayfa türüne göre özel title şablonları
  const titleTemplates: Record<PageType, (extra?: string) => string> = {
    home: () => `Özel Yazılım & Akıllı Otomasyon Çözümleri${brandSuffix}`,
    services: () => `Özel Yazılım & Otomasyon Geliştirme Hizmetleri${brandSuffix}`,
    products: () => `Hazır Yazılım Ürünleri & B2B Otomasyon Çözümleri${brandSuffix}`,
    "blog-list": () => `Yazılım & Teknoloji Blog Yazıları${brandSuffix}`,
    "blog-detail": (extra) => {
      const base = customTitle || "Teknoloji Makalesi";
      return extra ? `${base} (${extra})${brandSuffix}` : `${base}${brandSuffix}`;
    },
    "service-detail": (extra) => {
      const base = customTitle || "Hizmet Detayı";
      return extra ? `${base} | ${extra}${brandSuffix}` : `${base}${brandSuffix}`;
    },
    about: () => `Hakkımızda | XipSoft Yazılım ve Teknoloji Sistemleri${brandSuffix}`,
    contact: () => `İletişim | Ücretsiz Analiz Talebi${brandSuffix}`,
    generic: (extra) => {
      const base = customTitle || "Sayfa";
      return extra ? `${base} | ${extra}${brandSuffix}` : `${base}${brandSuffix}`;
    },
  };

  const titleTemplate = titleTemplates[pageType];
  if (!titleTemplate) {
    return customTitle ? `${customTitle}${brandSuffix}` : `Sayfa${brandSuffix}`;
  }

  return titleTemplate(extraInfo);
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

  // Duplicate marka suffix kontrolü ve temizliği
  let finalTitle = input.title;
  if (!input.titleAbsolute) {
    // Eğer absolute değilse, başlık zaten marka suffix içeriyorsa temizle
    finalTitle = sanitizeDuplicateBrandSuffix(input.title);
  }

  return {
    // absolute: DB başlığı zaten tam ise kök şablonun çift suffix eklemesini önler
    title: input.titleAbsolute ? { absolute: finalTitle } : finalTitle,
    description: input.description,
    ...(input.keywords && input.keywords.length > 0 ? { keywords: input.keywords } : {}),
    alternates: { canonical },
    robots:
      parseRobotsDirective(input.robotsOverride) ??
      (indexable
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
        : { index: false, follow: true }),
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
