/**
 * ServiceMaster — /hizmetler/[...slug] (catch-all TEK şablon)
 *
 * URL'deki slug dizisini parse eder:
 *   /hizmetler/[slug]           → 1 segment → hizmet detay sayfası
 *   /hizmetler/[slug]/[sehir]   → 2 segment → il/ilçe (yerel SEO) sayfası
 *   3+ segment                  → 404
 *
 * KURAL: Bu rota tek bir şablon dosyasıdır. Her hizmet, il veya ilçe için
 * ayrı ayrı page.tsx veya sabit bileşen AÇMAK KESİNLİKLE YASAKTIR.
 *
 * Veri kaynakları (tamamı DB — kodda sabit içerik yoktur):
 *   - `services`            → 12 ana hizmet (detay)
 *   - `pages`               → yayınlanmış CMS yerel sayfaları (öncelik 1)
 *   - `service_city_seo`    → özgün şehir SEO satırları (öncelik 2)
 *   - `locations`           → merkezî konum çözümü (il/ilçe ağacı)
 *
 * İndeksleme kararı `@/config/priority-locations` (isKeepableLocation /
 * isIndexableLocation) ile verilir; ortak canonical/OG/Twitter/robots
 * kuralları `@/lib/seo-helpers`'tan gelir. JSON-LD (Service + Breadcrumb +
 * FAQ) tek kaynak `@/lib/schema-helpers` ile üretilir.
 *
 * Yönlendirme kuralı: eski/alias slug'lar 308 (kalıcı) ile kanonik URL'e
 * taşınır — 307 DEĞİL; 307'de Google sinyali birleştirmez ve GSC'de
 * "Yönlendirmeli Sayfa" kaydı kalıcı olarak kalır.
 */
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/config/brand.config";
import {
  getKeptRedirectTarget,
  isIndexableLocation,
  isKeepableLocation,
} from "@/config/priority-locations";
import type { LocationDecisionInput } from "@/config/priority-locations";
import { getServiceCityData, getServiceFromDB, resolveServicePage } from "@/lib/database";
import type { ServicePageData } from "@/lib/database";
import pool from "@/lib/database";
import {
  breadcrumbSchema,
  faqSchema,
  serviceBreadcrumbs,
  serviceSchema,
} from "@/lib/schema-helpers";
import { buildPageMetadata } from "@/lib/seo-helpers";
import JsonLd from "@/components/seo/JsonLd";
import PageTemplate from "@/components/Common/PageTemplate/PageTemplate";
import ServicePageClient from "../_components/ServicePageClient";
import WebDesignGuide from "../_components/WebDesignGuide";
import type { CentralLocation, PublishedPage } from "@/lib/pages";
import {
  getCentralLocationBySlug,
  getCentralLocationByIds,
  getPublishedPageBySlug,
  getPublishedDistrictPageSegment,
  getProvinceSlugForLegacyLocation,
} from "@/lib/pages";

// ── Alias Tablosu (tek kaynak) ───────────────────────────────────────────────
// Eski/alternatif hizmet slug'larını kanonik slug'a yönlendirir.
// Bu tabloya yalnızca 308 kalıcı yönlendirme gereken slug'lar eklenir.
const SERVICE_SLUG_ALIASES: Record<string, string> = {
  "yapay-zeka-otomasyon": "yapay-zeka-ml",
  "yapay-zeka": "yapay-zeka-ml",
  "web-yazilim": "web-yazilim-tasarim",
  "web-yazılım": "web-yazilim-tasarim",
  "mobil-uygulama-gelistirme": "mobil-uygulama",
  "siber-guvenlik-hizmetleri": "siber-guvenlik",
  "seo-dijital-pazarlama-hizmetleri": "seo-dijital-pazarlama",
};

// Vercel 500 hatasını önlemek için generateStaticParams/dynamicParams kaldırıldı.
// Tüm hizmet/konum sayfaları tamamen dinamik (ƒ) render edilir; veri katmanı
// unstable_cache ile önbelleklendiğinden Neon yükü artmaz.
export const revalidate = 3600;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ slug: string[] }>;
}

// ── Ortak konum çözümleyici ───────────────────────────────────────────────────
// Hem generateMetadata hem sayfa bileşeni aynı çözümlemeyi kullanır;
// veri katmanı iki kez çalışsa da unstable_cache sayesinde maliyet sabittir.

interface ResolvedLocationPage {
  customPage: PublishedPage | null;
  centralLocation: CentralLocation | null;
  cityData: Awaited<ReturnType<typeof getServiceCityData>>;
  cityName: string;
  locationDecision: LocationDecisionInput;
}

async function resolveServiceLocation(
  serviceSlug: string,
  locationSlug: string,
  /** metadata akışında gerekmez; sayfa akışında önceden çekilmiş sayfa geçirilir. */
  knownCustomPage?: PublishedPage | null,
): Promise<ResolvedLocationPage> {
  // 1) Yayınlanmış CMS sayfasını ara
  const customPage = knownCustomPage ?? (await getPublishedPageBySlug(`${serviceSlug}/${locationSlug}`));

  // 2) Konumu çöz
  const centralLocation = customPage
    ? await getCentralLocationByIds(customPage.serviceId, customPage.locationId)
    : await getCentralLocationBySlug(serviceSlug, locationSlug);

  const locationType = centralLocation?.locationType ?? "province";
  const cityName = centralLocation?.locationName ?? locationSlug.replace(/-/g, " ");
  const cityData = await getServiceCityData(
    serviceSlug,
    locationSlug,
    cityName,
    locationType,
    SITE_URL,
  );

  const locationDecision: LocationDecisionInput = {
    locationType: centralLocation?.locationType ?? cityData?.locationType ?? locationType,
    sourceType: customPage?.sourceType,
    isCustom: cityData?.isCustom,
    isIndexed: cityData?.isIndexed,
    localIntroLength: cityData?.lokalGiris?.trim().length,
    parentLocationSlug: centralLocation?.parentLocationSlug,
    locationSlug: centralLocation?.locationSlug,
  };

  return { customPage, centralLocation, cityData, cityName, locationDecision };
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: segments } = await params;

  // ── 1 segment → hizmet detay metadata'sı ──────────────────────────────────
  if (segments.length === 1) {
    const slug = segments[0];
    const canonicalSlug = SERVICE_SLUG_ALIASES[slug] ?? slug;
    const resolved = await resolveServicePage(canonicalSlug);
    if (!resolved) return { robots: { index: false, follow: false } };
    const { service, source } = resolved;

    // title.absolute: başlık zaten "| XipSoft" suffix'i içerir;
    // kök şablonun çift suffix eklemesini önler.
    // Fallback iskeleti (DB yok) ince içerik olduğundan noindex, follow alır
    // (SEO.md §5.3); DB içeriği dönünce otomatik olarak index'e geçer.
    return buildPageMetadata({
      title: service.metadata.title,
      titleAbsolute: true,
      description: service.metadata.description,
      keywords: service.metadata.keywords,
      canonicalPath: `/hizmetler/${canonicalSlug}`,
      indexable: source === "db",
    });
  }

  // ── 2 segment → il/ilçe metadata'sı ───────────────────────────────────────
  if (segments.length === 2) {
    const [slug, sehir] = segments;
    // Alias slug gelirse kanonik slug'ı kullan; sayfa bileşeni permanentRedirect
    // ile yönlendireceğinden metadata da kanonik URL'e işaret etmeli.
    const canonicalSlug = SERVICE_SLUG_ALIASES[slug] ?? slug;

    const service = await getServiceFromDB(canonicalSlug);
    // Hizmet yoksa noindex
    if (!service) return { robots: { index: false, follow: false } };

    const { customPage, centralLocation, cityData, locationDecision } =
      await resolveServiceLocation(canonicalSlug, sehir);

    // Yalnızca DB'de bulunan konumlar veya yayınlanmış şehir SEO kayıtları geçerlidir.
    if (!customPage && !centralLocation && !cityData?.isCustom) {
      return { robots: { index: false, follow: false } };
    }
    if (!isKeepableLocation(locationDecision)) {
      return { robots: { index: false, follow: false } };
    }

    // 4) Yayınlanmış CMS sayfası. Yalnızca ELLE yazılmış (source_type='manual')
    // sayfalar indexlenir; şablon üretimi (`template`) sayfalar noindex alır.
    if (customPage) {
      const indexable = isIndexableLocation(locationDecision);
      const description = customPage.ozelMetaDesc || customPage.metaDescription;
      return buildPageMetadata({
        title: customPage.metaTitle,
        description,
        canonicalPath: `/hizmetler/${canonicalSlug}/${sehir}`,
        indexable,
        image: customPage.ogImageUrl ?? undefined,
        imageAlt: customPage.metaTitle,
      });
    }

    // 5) service_city_seo tablosunda özgün şehir satırı varsa DB değerlerini kullan.
    // İndeksleme yalnızca satır `is_indexed` VE özgün giriş metni yeterince
    // uzunsa açılır. Her geçerli şehir sayfası kendi URL'ini canonical gösterir.
    if (cityData?.isCustom) {
      const substantive = (cityData.lokalGiris?.trim().length ?? 0) >= 200;
      const indexable = substantive && isIndexableLocation(locationDecision);
      const description = cityData.ozelMetaDesc ?? cityData.metaDescription;
      return buildPageMetadata({
        title: cityData.metaTitle,
        description,
        canonicalPath: `/hizmetler/${canonicalSlug}/${sehir}`,
        indexable,
        imageAlt: cityData.metaTitle,
      });
    }

    // DB'de gerçek içerik yoksa noindex.
    return { robots: { index: false, follow: false } };
  }

  // 3+ segment: geçersiz URL biçimi.
  return { robots: { index: false, follow: false } };
}

// ── Hizmet detay (1 segment) ──────────────────────────────────────────────────

async function ServiceDetailMaster({ slug }: { slug: string }) {
  const canonicalSlug = SERVICE_SLUG_ALIASES[slug] ?? slug;
  if (canonicalSlug !== slug) {
    permanentRedirect(`/hizmetler/${canonicalSlug}`);
  }

  // DB → config fallback (MIMARI.md §3/§6). Config allowlist'inde olmayan ve
  // DB'de de bulunmayan slug 404 alır; bilinen hizmetler DB yokken iskelet döner.
  const resolved = await resolveServicePage(canonicalSlug);
  if (!resolved) notFound();
  const { service } = resolved;

  const canonical = `${SITE_URL}/hizmetler/${canonicalSlug}`;

  // Topical Authority: hizmetle ilgili blog yazılarını tag eşleşmesiyle çek
  // Hizmet slug'ından anahtar kelimeler türet → blog tag'larıyla eşleştir
  let relatedPosts: Array<{ slug: string; title: string; description: string | null }> = [];
  if (process.env.DATABASE_URL) {
    try {
      const serviceKeywords = canonicalSlug.replace(/-/g, " ").split(" ");
      const { rows } = await pool.query<{ slug: string; title: string; description: string | null }>(
        `SELECT slug, title, description
         FROM Blog_posts
         WHERE status = 'published'
           AND deleted_at IS NULL
           AND (
             tags && $1::text[]
             OR to_tsvector('turkish', title) @@ to_tsquery('turkish', $2)
           )
         ORDER BY published_at DESC
         LIMIT 3`,
        [serviceKeywords, serviceKeywords.join(" | ")],
      );
      relatedPosts = rows;
    } catch {
      // DB bağlantısı yoksa boş bırak — sayfa yine de render edilir
    }
  }

  // ── JSON-LD: Service + BreadcrumbList + FAQPage (tek kaynak: schema-helpers) ─
  const jsonLd = [
    serviceSchema({
      name: service.metadata.title,
      description: service.metadata.description,
      url: canonical,
      serviceType: service.metadata.title,
    }),
    breadcrumbSchema(
      serviceBreadcrumbs({ serviceName: service.metadata.title, serviceSlug: canonicalSlug }),
    ),
    service.faqItems.length > 0 ? faqSchema(service.faqItems) : null,
  ];

  return (
    <>
      <JsonLd schemas={jsonLd} id={`service-${canonicalSlug}`} />
      <ServicePageClient service={service} />
      {canonicalSlug === "web-yazilim-tasarim" && <WebDesignGuide />}

      {/* Topical Authority: hizmetle ilgili blog yazıları — iç linkleme sinyali */}
      {relatedPosts.length > 0 && (
        <section
          aria-labelledby="related-posts-heading"
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20"
        >
          <h2
            id="related-posts-heading"
            className="text-lg font-bold text-zinc-300 mb-5 uppercase tracking-wider font-mono"
          >
            İlgili Blog Yazıları
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="list">
            {relatedPosts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block p-5 rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <p className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors line-clamp-2 leading-snug mb-2">
                    {post.title}
                  </p>
                  {post.description && (
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      {post.description}
                    </p>
                  )}
                  <span className="inline-block mt-3 text-[11px] font-mono uppercase tracking-wider text-purple-400 group-hover:text-purple-300 transition-colors">
                    Yazıyı Oku →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ── İliçe/İl sayfası (2 segment) ──────────────────────────────────────────────

async function ServiceLocationMaster({ slug, sehir }: { slug: string; sehir: string }) {
  // 308: Alias slug yönlendir (kalıcı taşıma — 307 DEĞIL, bkz. dosya başı notu)
  const canonicalSlug = SERVICE_SLUG_ALIASES[slug] ?? slug;
  if (canonicalSlug !== slug) {
    permanentRedirect(`/hizmetler/${canonicalSlug}/${sehir}`);
  }

  const service = await getServiceFromDB(canonicalSlug);
  // Eşdeğer hizmet alias'ı yukarıda yönlendirildi; bilinmeyen hizmet 404'tür.
  if (!service) notFound();

  // 1) Yayınlanmış CMS sayfasını ara
  const customPage = await getPublishedPageBySlug(`${canonicalSlug}/${sehir}`);

  // 308: Kısa ilçe segmentini (ör. /atasehir) → yayınlanmış kanonik bileşik URL'e yönlendir
  if (!customPage) {
    const canonicalSehir = await getPublishedDistrictPageSegment(canonicalSlug, sehir);
    if (canonicalSehir && canonicalSehir !== sehir) {
      permanentRedirect(`/hizmetler/${canonicalSlug}/${canonicalSehir}`);
    }
  }

  // Konum çözümü (metadata ile aynı kaynak)
  const { centralLocation, cityData, cityName, locationDecision } = await resolveServiceLocation(
    canonicalSlug,
    sehir,
    customPage,
  );

  if (!isKeepableLocation(locationDecision)) {
    const target = getKeptRedirectTarget(locationDecision);
    if (target) permanentRedirect(`/hizmetler/${canonicalSlug}/${target}`);
    notFound();
  }

  // 308: Eski bölge URL'lerini DB'deki yayınlanmış il sayfasına yönlendir.
  if (!customPage && !cityData?.isCustom && !centralLocation) {
    const provinceSlug = await getProvinceSlugForLegacyLocation(canonicalSlug, sehir);
    if (provinceSlug && provinceSlug !== sehir) {
      permanentRedirect(`/hizmetler/${canonicalSlug}/${provinceSlug}`);
    }
  }

  // Eski konum URL'si için yayınlanmış il eşleşmesi yukarıda yönlendirilir.
  // Gerçek bir konum veya yayınlanmış içerik karşılığı yoksa alakasız bir hizmet
  // sayfasına yönlendirmek yerine 404 döndür.
  if (!customPage && !centralLocation && !cityData?.isCustom) {
    notFound();
  }

  // PageTemplate/breadcrumb/schema için CentralLocation şekli
  const location: CentralLocation = centralLocation ?? {
    serviceId: "",
    serviceTitle: service.title,
    serviceSlug: canonicalSlug,
    locationId: "",
    locationName: cityData?.cityName ?? cityName,
    locationSlug: sehir,
    locationType: cityData?.locationType ?? "province",
    parentLocationName: null,
    serviceDescription: service.subtitle,
  };

  // ── 1) Yayınlanmış CMS içeriği varsa: PageTemplate ───────────────────────
  if (customPage) {
    const canonicalUrl = `${SITE_URL}/hizmetler/${canonicalSlug}/${sehir}`;
    const jsonLd = [
      serviceSchema({
        name: customPage.title,
        description: customPage.metaDescription,
        url: canonicalUrl,
        serviceType: location.serviceTitle,
        areaServed: {
          type: location.locationType === "province" ? "AdministrativeArea" : "City",
          name: location.locationName,
          parentCountry: "Turkey",
        },
      }),
      breadcrumbSchema(
        serviceBreadcrumbs({
          serviceName: location.serviceTitle,
          serviceSlug: canonicalSlug,
          locationName: location.locationName,
          locationUrl: canonicalUrl,
        }),
      ),
      customPage.lokalSss && customPage.lokalSss.length > 0
        ? faqSchema(customPage.lokalSss.map((i) => ({ question: i.question, answer: i.answer })))
        : null,
    ];
    return (
      <>
        <JsonLd schemas={jsonLd} id={`service-city-${canonicalSlug}-${sehir}`} />
        <PageTemplate page={customPage} location={location} />
      </>
    );
  }

  // ── 2) service_city_seo tablosunda özgün şehir satırı ────────────────────
  // DB'deki şehir SEO satırını veya kayıtlı hizmet/konum için fallback'i kullan.
  // Hizmet veya konum için içerik üretilemiyorsa alakasız bir hedefe yönlendirme.
  if (!cityData?.isCustom) notFound();

  const resolvedCityName = cityData.cityName || location.locationName;
  const isProvince = cityData.locationType === "province";
  const canonical = `${SITE_URL}/hizmetler/${canonicalSlug}/${sehir}`;

  // Sadece service_city_seo'da gerçek (isCustom) içerik varsa gösterilir.
  let localContent = null;
  if (cityData.isCustom) {
    const databaseLocalContext = [
      cityData.lokalGiris,
      cityData.ekonomikProfil ? `${resolvedCityName} ekonomik profili: ${cityData.ekonomikProfil}` : null,
      cityData.sektorelVurgu,
      cityData.bolgeselOzellik,
    ].filter((part): part is string => Boolean(part?.trim()));
    if (databaseLocalContext.length > 0) {
      localContent = {
        lokalAciklama: databaseLocalContext.join(" "),
        ozelMetaDesc: cityData.ozelMetaDesc ?? cityData.metaDescription,
        sss: cityData.lokalSss,
      };
    }
  }

  // ── JSON-LD: Service + BreadcrumbList + FAQPage (tek kaynak) ─────────────
  const faqItems = cityData.lokalSss.length > 0 ? cityData.lokalSss : (localContent?.sss ?? []);

  const jsonLd = [
    serviceSchema({
      name: `${service.title} ${resolvedCityName}`,
      description:
        cityData.lokalGiris ||
        localContent?.ozelMetaDesc ||
        `${resolvedCityName}'de ${service.title.toLocaleLowerCase("tr")} hizmetleri.`,
      url: canonical,
      serviceType: service.title,
      areaServed: {
        type: isProvince ? "AdministrativeArea" : "City",
        name: resolvedCityName,
        parentCountry: "Turkey",
      },
    }),
    breadcrumbSchema(
      serviceBreadcrumbs({
        serviceName: service.title,
        serviceSlug: canonicalSlug,
        locationName: resolvedCityName,
        locationUrl: canonical,
      }),
    ),
    faqItems.length > 0 ? faqSchema(faqItems) : null,
  ];

  // ServicePageClient için uyumlu district nesnesi (district verilince yerel şablon devreye girer)
  const district = {
    slug: sehir,
    name: resolvedCityName,
    description: `${resolvedCityName} ${isProvince ? "ilinde" : "ilçesinde"} ${service.title.toLocaleLowerCase("tr")} hizmetleri.`,
  };

  // localContent yoksa (cityData.isCustom=true) minimal LocalSeoContent oluştur
  const resolvedLocalContent = localContent ?? {
    lokalAciklama: cityData.lokalGiris ?? "",
    ozelMetaDesc: cityData.ozelMetaDesc ?? cityData.metaDescription,
    sss: faqItems,
  };

  return (
    <>
      <JsonLd schemas={jsonLd} id={`service-city-${canonicalSlug}-${sehir}`} />
      <ServicePageClient
        service={service}
        district={district}
        localContent={resolvedLocalContent}
      />
    </>
  );
}

// ── Ana şablon (dispatch) ─────────────────────────────────────────────────────

export default async function ServiceMaster({ params }: Props) {
  const { slug: segments } = await params;

  if (segments.length === 1) {
    return <ServiceDetailMaster slug={segments[0]} />;
  }
  if (segments.length === 2) {
    return <ServiceLocationMaster slug={segments[0]} sehir={segments[1]} />;
  }

  // 3+ segment geçersiz URL biçimidir.
  notFound();
}
