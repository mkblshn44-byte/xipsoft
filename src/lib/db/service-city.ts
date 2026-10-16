/**
 * Service City SEO (formerly db-service-city)
 * Hizmet + Şehir bazlı özgün SEO içeriği — /hizmetler/[hizmet]/[sehir]
 */

import { unstable_cache } from "next/cache";
import pool from "./pool";
import type { ServicePageData } from "./services";
import { queryServiceFromDB } from "./services";
import { isIndexableLocation, isKeepableLocation } from "@/config/priority-locations";

export interface ServiceCitySeoLocalFaq {
  question: string;
  answer: string;
}

/**
 * Bir /hizmetler/[hizmet-adi]/[sehir-adi] URL'i için veritabanından çekilen
 * veya dinamik olarak üretilen sayfa verisi.
 *
 * DB'de `service_city_seo` tablosunda bu hizmet+şehir çifti için yayınlanmış
 * bir satır varsa doğrudan döndürülür. Yoksa DB'deki ana hizmet verisi şehir
 * adı/slug'ı ile harmanlanarak oluşturulur.
 */
export interface ServiceCityData {
  serviceSlug: string;
  citySlug: string;
  cityName: string;
  locationType: "province" | "district" | "neighborhood";

  /** Şehre özel özgün giriş paragrafı. Yalnızca şehir adı değiştirilerek kopyalanmış olmamalıdır. */
  lokalGiris: string | null;
  /** Şehrin ekonomik yapısı (tekstil, tarım, turizm, teknoloji vb.) */
  ekonomikProfil: string | null;
  /** Bu hizmetin o şehrin öne çıkan sektörüyle bağlantısı */
  sektorelVurgu: string | null;
  /** Bölgesel/coğrafi/altyapısal özellikler */
  bolgeselOzellik: string | null;

  /** Hesaplanan meta title (şehre + hizmete özel) */
  metaTitle: string;
  /** Hesaplanan meta description */
  metaDescription: string;
  /** Alternatif meta açıklama (A/B veya DB'den gelen özel) */
  ozelMetaDesc: string | null;

  /** Şehre özel SSS listesi */
  lokalSss: ServiceCitySeoLocalFaq[];

  /** DB'de yayınlanmış özgün satır var mı (true) yoksa fallback üretildi mi (false) */
  isCustom: boolean;
  /** Sayfa index'lenebilir mi (false → noindex) */
  isIndexed: boolean;
  canonicalUrl: string | null;

  /** Ana hizmet verisi (ServicePageClient için gerekli alanlar: features, packages, vb.) */
  service: ServicePageData;
}

/**
 * DB satırını `ServiceCityData` tipine dönüştürür.
 */
function mapCityRowToData(
  row: Record<string, unknown>,
  service: ServicePageData,
): ServiceCityData {
  const r = row as any;
  return {
    serviceSlug: r.service_slug,
    citySlug: r.city_slug,
    cityName: r.city_name,
    locationType: r.location_type ?? "province",
    lokalGiris: r.lokal_giris ?? null,
    ekonomikProfil: r.ekonomik_profil ?? null,
    sektorelVurgu: r.sektorel_vurgu ?? null,
    bolgeselOzellik: r.bolgesel_ozellik ?? null,
    metaTitle: r.meta_title ?? `${r.city_name} ${service.title} | XipSoft`,
    metaDescription:
      r.meta_description ??
      `${r.city_name} bölgesinde profesyonel ${service.title.toLocaleLowerCase("tr")} hizmetleri. Yerel ihtiyaçlara özel çözümler için XipSoft.`,
    ozelMetaDesc: r.ozel_meta_desc ?? null,
    lokalSss: Array.isArray(r.lokal_sss) ? r.lokal_sss : [],
    isCustom: true,
    isIndexed: r.is_indexed !== false,
    canonicalUrl: r.canonical_url ?? null,
    service,
  };
}

/**
 * DB'den gelen ana hizmet verisi ile şehir adını harmanlayarak dinamik
 * `ServiceCityData` üretir. `service_city_seo`'da o çift için satır yoksa devreye girer.
 */
function buildFallbackCityData(
  service: ServicePageData,
  citySlug: string,
  cityName: string,
  locationType: "province" | "district" | "neighborhood" = "province",
  siteUrl?: string,
): ServiceCityData {
  const areaSuffix = locationType === "province" ? "ilinde" : "ilçesinde";
  const serviceLower = service.title.toLocaleLowerCase("tr");
  const metaTitle = `${cityName} ${service.title} | XipSoft`;
  const metaDescription = `${cityName} ${areaSuffix} profesyonel ${serviceLower} hizmetleri. Yerel ihtiyaçlara özel, hızlı ve güvenli ${serviceLower} çözümleri için XipSoft'tan teklif alın.`;
  const canonical = siteUrl ? `${siteUrl}/hizmetler/${service.slug}/${citySlug}` : null;

  return {
    serviceSlug: service.slug,
    citySlug,
    cityName,
    locationType,
    lokalGiris: null,
    ekonomikProfil: null,
    sektorelVurgu: null,
    bolgeselOzellik: null,
    metaTitle,
    metaDescription,
    ozelMetaDesc: null,
    lokalSss: [
      {
        question: `${cityName} bölgesinde ${service.title.toLocaleLowerCase("tr")} için ne kadar süre gerekir?`,
        answer: `Proje kapsamına göre değişmekle birlikte ${cityName} için standart projeler 2–6 hafta içinde tamamlanır. Ücretsiz analiz sonrası net bir zaman planı sunulur.`,
      },
      {
        question: `${cityName}'de yüz yüze görüşme yapılabilir mi?`,
        answer: `${cityName} ve çevresindeki müşterilerimizle online görüşme yapabiliyoruz. Proje büyüklüğüne göre yerinde ziyaret de planlanabilir.`,
      },
    ],
    isCustom: false,
    // Fallback (şablondan üretilen) sayfa varsayılan olarak indekslenmez;
    // indeksleme kararı [sehir]/page.tsx içinde gerçek yerel veri + içerik
    // eşiği birlikte değerlendirilerek verilir.
    isIndexed: false,
    canonicalUrl: canonical,
    service,
  };
}

/**
 * Belirli bir hizmet + şehir çifti için `service_city_seo` tablosundan
 * yayınlanmış satırı çeker.
 *
 * DB'de satır yoksa `null` döner (çağıran fallback üretir).
 */
async function queryServiceCityFromDB(
  serviceSlug: string,
  citySlug: string,
): Promise<Record<string, unknown> | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { rows } = await pool.query(
      `SELECT *
         FROM service_city_seo
        WHERE service_slug = $1
          AND city_slug    = $2
          AND status       = 'published'
        LIMIT 1`,
      [serviceSlug, citySlug],
    );
    return rows[0] ?? null;
  } catch (error) {
    // DB hatası sayfayı 500'e düşürmemeli: fallback içeriğe izin ver.
    console.warn(
      "[ServiceCitySEO] City lookup unavailable:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Hizmet + şehir çifti için merkezi veri sağlayıcı.
 *
 * Öncelik sırası:
 *  1. `service_city_seo` tablosunda yayınlanmış özgün satır → döndür
 *  2. Satır yok → DB'deki ana hizmet verisi + şehir adı harmanlama → döndür
 *
 * Sunucu bileşenleri bu fonksiyonu çağırır; şehir bazlı statik page.tsx
 * dosyaları KESINLIKLE oluşturulmaz.
 */
async function queryServiceCityData(
  serviceSlug: string,
  citySlug: string,
  cityName: string,
  locationType: "province" | "district" | "neighborhood",
  siteUrl?: string,
): Promise<ServiceCityData | null> {
  // Ana hizmet verisini çek (DB'den veya fallback)
  const service = await queryServiceFromDB(serviceSlug);
  if (!service) return null;

  // DB'den şehre özel satırı ara
  const row = await queryServiceCityFromDB(serviceSlug, citySlug);
  if (row) return mapCityRowToData(row, service);

  // Fallback: DB ana hizmet verisi + şehir adı harmanı
  return buildFallbackCityData(service, citySlug, cityName, locationType, siteUrl);
}

/**
 * `unstable_cache` sarmalıyla önbelleklenmiş versiyon.
 * Sayfa route handler'larından çağrılır; 1 saatte bir yenilenir,
 * admin panelinden `revalidateTag("service-city-seo")` ile anlık temizlenir.
 */
export function getServiceCityData(
  serviceSlug: string,
  citySlug: string,
  cityName: string,
  locationType: "province" | "district" | "neighborhood" = "province",
  siteUrl?: string,
): Promise<ServiceCityData | null> {
  return unstable_cache(
    () => queryServiceCityData(serviceSlug, citySlug, cityName, locationType, siteUrl),
    ["service-city-data", serviceSlug, citySlug],
    {
      revalidate: 3600,
      tags: ["service-city-seo", "services", `service:${serviceSlug}`, `city:${citySlug}`],
    },
  )();
}

export interface PublishedServiceCity {
  serviceSlug: string;
  citySlug: string;
  updatedAt: Date;
  canonicalUrl: string | null;
}

export async function getAllPublishedServiceCities(): Promise<PublishedServiceCity[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { rows } = await pool.query<{
      service_slug: string;
      city_slug: string;
      updated_at: Date;
      canonical_url: string | null;
      is_indexed: boolean;
      location_type: string;
      location_slug: string | null;
      parent_slug: string | null;
      location_matches: number;
    }>(
      `SELECT sc.service_slug, sc.city_slug, sc.updated_at, sc.canonical_url,
              sc.is_indexed, sc.location_type,
              l.slug AS location_slug,
              parent.slug AS parent_slug,
              COUNT(l.id) OVER (
                PARTITION BY sc.service_slug, sc.city_slug
              )::int AS location_matches
         FROM service_city_seo sc
         LEFT JOIN locations l
           ON l.slug = sc.city_slug
          AND l.location_type = sc.location_type
          AND l.is_active = TRUE
         LEFT JOIN locations parent
           ON parent.id = l.parent_id
          AND parent.is_active = TRUE
        WHERE sc.status = 'published'
          AND sc.is_indexed = TRUE
          AND LENGTH(BTRIM(COALESCE(sc.lokal_giris, ''))) >= 200
        ORDER BY sc.updated_at DESC`,
    );
    return rows
      .filter((row) => {
        if (row.location_matches !== 1 || !row.location_slug) return false;
        const decision = {
          locationType: row.location_type,
          sourceType: "manual",
          isCustom: true,
          isIndexed: row.is_indexed,
          localIntroLength: 200,
          parentLocationSlug: row.parent_slug,
          locationSlug: row.location_slug,
        };
        return isKeepableLocation(decision) && isIndexableLocation(decision);
      })
      .map((row) => ({
        serviceSlug: row.service_slug,
        citySlug: row.city_slug,
        updatedAt: row.updated_at,
        canonicalUrl: row.canonical_url,
      }));
  } catch (error) {
    console.warn(
      "[ServiceCitySEO] Published city lookup unavailable:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
