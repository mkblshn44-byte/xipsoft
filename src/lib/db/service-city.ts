/**
 * Service City SEO (formerly db-service-city)
 * Hizmet + Şehir bazlı SEO verisi — /hizmetler/[hizmet]/[sehir]
 *
 * Tek kaynak: `services` (ana hizmet satırı) + şehir adı harmanı. Şehre özel
 * özgün metinler artık buradan değil `pages` (`kind='location'`) satırının
 * `lokal_aciklama` / `lokal_sss` alanlarından gelir.
 */

import { unstable_cache } from "next/cache";
import type { ServicePageData } from "./services";
import { queryServiceFromDB } from "./services";
import { serviceLocationPath } from "@/lib/content-path";

export interface ServiceCitySeoLocalFaq {
  question: string;
  answer: string;
}

/**
 * Bir /hizmetler/[hizmet-adi]/[sehir-adi] URL'i için DB'deki ana hizmet verisi
 * ile şehir adı/slug'ı harmanlanarak üretilen sayfa verisi.
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

  /**
   * Şehre özel DB satırından mı geldi (true) yoksa harmanlandı mı (false).
   * `service_city_seo` okuma yolu kaldırıldığı için daima `false`.
   */
  isCustom: boolean;
  /** Sayfa index'lenebilir mi (false → noindex) */
  isIndexed: boolean;
  canonicalUrl: string | null;

  /** Ana hizmet verisi (ServicePageClient için gerekli alanlar: features, packages, vb.) */
  service: ServicePageData;
}

/**
 * DB'den gelen ana hizmet verisi ile şehir adını harmanlayarak dinamik
 * `ServiceCityData` üretir.
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
  const canonical = siteUrl ? `${siteUrl}${serviceLocationPath(service.slug, citySlug)}` : null;

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
 * Hizmet + şehir çifti için merkezi veri sağlayıcı.
 *
 * Tek kaynak: DB'deki ana hizmet satırı (`services`) + şehir adı harmanı.
 * Eskiden burada `service_city_seo` tablosuna bakılıyordu; tablo ölçülen 0
 * satır içeriyordu ve görünür içeriği hiç etkilemiyordu (şablon metni
 * `PageTemplate`e `pages.lokal_aciklama`/`lokal_sss` üzerinden gelir), bu
 * yüzden okuma yolu kaldırıldı.
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

  return buildFallbackCityData(service, citySlug, cityName, locationType, siteUrl);
}

/**
 * `unstable_cache` sarmalıyla önbelleklenmiş versiyon.
 * Sayfa route handler'larından çağrılır; 1 saatte bir yenilenir.
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
    ["service-city-data-v2", serviceSlug, citySlug],
    {
      revalidate: 3600,
      tags: ["service-city-seo", "services", `service:${serviceSlug}`, `city:${citySlug}`],
    },
  )();
}

