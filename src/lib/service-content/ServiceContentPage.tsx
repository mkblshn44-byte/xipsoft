/**
 * ServiceContentPage — hizmet/konum zincirinin TEK sunucu tarafı modülü.
 *
 * Bu dosya `/hizmetler/[...slug]` rotasının içindeki çözümleme, metadata,
 * JSON-LD ve render zincirini olduğu gibi taşır. İki çağıranı vardır:
 *
 *   1. `src/app/[locale]/(site)/hizmetler/[...slug]/page.tsx` — hâlâ mevcut
 *      olan özel rota; Next rota önceliği gereği `/hizmetler/...` isteklerini
 *      bu dosya karşılar.
 *   2. Kök catch-all `[...slug]/page.tsx` — `pages.full_path` üzerinden
 *      çözülen `kind='service' | 'location'` düğümlerini buraya delege eder.
 *      Rota silindiğinde (B8) tek satırlık bir sarma dosyası kalkar; davranış
 *      bu modülde durur.
 *
 * ÇAĞIRAN ARASINDAKİ TEK FARK segment köküdür ve `@/lib/service-content/request`
 * içindeki iki üreticiyle (`serviceContentRequestFromRoute` /
 * `serviceContentRequestFromTreePath`) tek noktada kapatılır; modülün geri
 * kalanı her zaman `hizmetler` kökü DAHİL segmentlerle çalışır.
 *
 * `resolvedTree` (yalnızca kök catch-all dolar): ağaç `full_path` üzerinden bir
 * düğüm ÇÖZDÜYSE ama hizmet zinciri (view → `services` → `pages`) o adresi
 * çözemezse, adres boşta kalmaz — çözülmüş düğüm açılır. Böylece DB'de içerik
 * satırı olan bir yol rotasyon sonrası 404'e düşmez.
 *
 * KURAL: Her hizmet, il veya ilçe için ayrı ayrı page.tsx veya sabit bileşen
 * AÇMAK KESİNLİKLE YASAKTIR. Veri kaynakları tamamiyle DB'dir (`services`,
 * `pages`, `locations`); kodda sabit içerik yoktur.
 *
 * İndeksleme kararı `@/config/priority-locations` (isKeepableLocation /
 * isIndexableLocation) ile verilir; ortak canonical/OG/Twitter/robots
 * kuralları `@/lib/seo-helpers`'tan gelir. JSON-LD (Service + Breadcrumb +
 * FAQ) tek kaynak `@/lib/schema/*` ile üretilir.
 *
 * Yönlendirme kuralı: eski/alias slug'lar 308 (kalıcı) ile kanonik URL'e
 * taşınır — 307 DEĞİL; 307'de Google sinyali birleştirmez ve GSC'de
 * "Yönlendirmeli Sayfa" kaydı kalıcı olarak kalır.
 */
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { SITE_URL } from "@/config/brand.config";
import {
  getKeptRedirectTarget,
  isIndexableLocation,
  isKeepableLocation,
} from "@/config/priority-locations";
import type { LocationDecisionInput } from "@/config/priority-locations";
import { getServiceCityData } from "@/lib/db/service-city";
import { resolveServicePage } from "@/lib/db/services";
import { resolveServiceRoute, type ResolvedServiceRoute } from "@/lib/route-resolver";
import pool from "@/lib/db/pool";
import {
  breadcrumbSchema,
  faqSchema
} from "@/lib/schema/site";
import {
  serviceBreadcrumbs,
  serviceSchema
} from "@/lib/schema/service";
import { buildPageMetadata } from "@/lib/seo-helpers";
import {
  serviceLocationPath,
  servicePath,
} from "@/lib/content-path";
import JsonLd from "@/components/seo/JsonLd";
import PageTemplate from "@/components/Common/PageTemplate/PageTemplate";
import ServicePageClient from "@/app/[locale]/(site)/hizmetler/_components/ServicePageClient";
import ServiceGuide from "@/app/[locale]/(site)/hizmetler/_components/ServiceGuide";
import type { CentralLocation, PublishedPage } from "@/lib/pages/types";
import {
  getCentralLocationBySlug,
  getCentralLocationByIds,
} from "@/lib/pages/location";
import {
  getPublishedPageBySlug,
  getPublishedDistrictPageSegment,
  getProvinceSlugForLegacyLocation,
} from "@/lib/pages/published";
import {
  canonicalPathForNode,
  resolveContentPath,
  type ContentTreeResult,
} from "@/lib/content-tree";
import { isPublishedTreePath } from "@/lib/content-tree-policy";
import {
  contentSegmentsOf,
  type ServiceContentRequest,
} from "@/lib/service-content/request";
import {
  buildContentTreeMetadata,
  renderContentTree,
} from "@/components/ContentTree/ContentTreeViews";

// ── Kırık Link → Sayfa Aç fallback'i ─────────────────────────────────────────
// Hizmet/konum zinciri (`service_page_index` → `services` → `pages`) bir adresi
// ÇÖZEMEDİĞİNDE, aynı yolda yayınlanmış bir içerik ağacı düğümü (`pages`)
// aranır ve o düğüm açılır. Böylece admin panelden yayınlanan
// `/hizmetler/<eski-kirik-adres>.html` dakikalar içinde canlı, SEO'su tam bir
// sayfa olur; rota tasarımı ve mevcut hizmet/konum davranışı DEĞİŞMEZ (fallback
// her zaman SON ÇAREDİR).
//
// BOT KORUMASI: önce `isPublishedTreePath` kök filtresi çalışır — `hizmetler`
// altında yayınlı bir `custom` kök yoksa (bugünkü durum) DB'ye hiç gidilmez,
// yani binlerce türetilmiş/garbage `/hizmetler/...` isteği havuzu tüketmez.
async function resolveTreeFallback(req: ServiceContentRequest): Promise<ContentTreeResult | null> {
  const asPath = `/${req.pathSegments.join("/")}`;
  if (!(await isPublishedTreePath(asPath))) return null;
  return resolveContentPath([...req.pathSegments]);
}

/**
 * Yalnızca YAYINLI `kind='custom'` düğümünün metadata'sı; yoksa `null`.
 * `req.resolvedTree` BİLİNÇLİ olarak burada kullanılmaz (bkz. keep branch).
 */
async function customTreeMetadata(req: ServiceContentRequest): Promise<Metadata | null> {
  const tree = await resolveTreeFallback(req);
  return tree ? buildContentTreeMetadata(tree.node) : null;
}

/** Fallback sayfasının metadata'si; ağaçta yayınlı düğüm yoksa `null`. */
async function fallbackMetadata(req: ServiceContentRequest): Promise<Metadata | null> {
  if (req.resolvedTree) return buildContentTreeMetadata(req.resolvedTree.node);
  const tree = await resolveTreeFallback(req);
  return tree ? buildContentTreeMetadata(tree.node) : null;
}

/**
 * Hizmet/konum zinciri bu adresi ÇÖZEMEDİ: catch-all'ın çözdüğü düğüm varsa o,
 * yayınlı bir ağaç sayfası varsa o render edilir; yoksa 404.
 */
async function renderFallbackOrNotFound(req: ServiceContentRequest): Promise<ReactElement> {
  if (req.resolvedTree) return renderContentTree(req.resolvedTree);
  const tree = await resolveTreeFallback(req);
  if (tree) return renderContentTree(tree);
  notFound();
}

// ── Alias Tablosu (tek kaynak) ───────────────────────────────────────────────
// Eski/alternatif hizmet slug'larını kanonik slug'a yönlendirir.
// Bu tabloya yalnızca 308 kalıcı yönlendirme gereken slug'lar eklenir.
//
// HEDEF KURAL: her hedef `services` tablosundaki CANLı (`row_type='main'`,
// `is_active=true`) slug olmalıdır. `web-yazilim-tasarim` gibi eski adlar DB'de
// artık yok; onları alias'sız bırakmak 1.607 yayınlanmış blog yazısındaki iç
// bağlantıları noindex iskelet sayfaya (veya 404'e) düşürüyordu.
export const SERVICE_SLUG_ALIASES: Record<string, string> = {
  "yapay-zeka-otomasyon": "yapay-zeka-ml",
  "yapay-zeka": "yapay-zeka-ml",
  "yapay-zeka-ai-entegrasyonu": "yapay-zeka-ml",
  "web-yazilim": "web-yazilim-tasarim1",
  "web-yazılım": "web-yazilim-tasarim1",
  "web-yazilim-tasarim": "web-yazilim-tasarim1",
  "mobil-uygulama-gelistirme": "mobil-uygulama",
  "siber-guvenlik-hizmetleri": "siber-guvenlik",
  "seo-dijital-pazarlama-hizmetleri": "seo-dijital-pazarlama",
  "seo-ve-dijital-pazarlama": "seo-dijital-pazarlama",
  "bulut-bilisim-devops": "bulut-bilisim",
  "e-ticaret-yazilimlari": "e-ticaret-platformlari",
  "blokzincir-web3-gelistirme": "blockchain-web3",
};

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

function locationFromRouteIndex(route: ResolvedServiceRoute | null): CentralLocation | null {
  if (
    !route ||
    route.rowType !== "location" ||
    !route.serviceId ||
    !route.locationId ||
    !route.serviceSlug ||
    !route.serviceTitle ||
    !route.locationSlug ||
    !route.locationName ||
    !route.locationType
  ) {
    return null;
  }

  return {
    serviceId: route.serviceId,
    serviceTitle: route.serviceTitle,
    serviceSlug: route.serviceSlug,
    serviceDescription: route.service?.subtitle ?? "",
    locationId: route.locationId,
    locationName: route.locationName,
    locationSlug: route.locationSlug,
    locationType: route.locationType,
    parentLocationName: route.parentLocationName,
    parentLocationSlug: route.parentLocationSlug,
  };
}

async function resolveServiceLocation(
  serviceSlug: string,
  locationSlug: string,
  /** metadata akışında gerekmez; sayfa akışında önceden çekilmiş sayfa geçirilir. */
  knownCustomPage?: PublishedPage | null,
  knownRoute?: ResolvedServiceRoute | null,
): Promise<ResolvedLocationPage> {
  // 1) Yayınlanmış CMS sayfasını ara
  const customPage = knownCustomPage === undefined
    ? await getPublishedPageBySlug(`${serviceSlug}/${locationSlug}`)
    : knownCustomPage;

  // 2) Konumu çöz
  const route = knownRoute === undefined
    ? await resolveServiceRoute([serviceSlug, locationSlug])
    : knownRoute;
  const centralLocation =
    locationFromRouteIndex(route) ??
    (customPage
      ? await getCentralLocationByIds(customPage.serviceId, customPage.locationId)
      : await getCentralLocationBySlug(serviceSlug, locationSlug));

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

// ── Metadata dispatch ─────────────────────────────────────────────────────────

export async function serviceContentMetadata(
  req: ServiceContentRequest,
): Promise<Metadata> {
  const segments = contentSegmentsOf(req);

  // ── 1 segment → hizmet detay metadata'sı ──────────────────────────────────
  if (segments.length === 1) {
    const slug = segments[0];
    const canonicalSlug = SERVICE_SLUG_ALIASES[slug] ?? slug;
    const route = await resolveServiceRoute([canonicalSlug]);
    const resolved = route?.rowType === "service" && route.service
      ? { service: route.service, source: "db" as const }
      : await resolveServicePage(canonicalSlug);
    // Zincir ÇÖZEMEDİ → son çare yayınlı ağaç sayfası (sayfa bileşeniyle aynı
    // sıra: önce hizmet, boşta kalırsa ağaç). Böylece canlı hizmet sayfasının
    // bir ağaç düğümü tarafından gölgelenmesi mümkün olmaz.
    if (!resolved) {
      const fallback = await fallbackMetadata(req);
      return fallback ?? { robots: { index: false, follow: false } };
    }
    const { service, source } = resolved;

    // title.absolute: başlık zaten "| XipSoft" suffix'i içerir;
    // kök şablonun çift suffix eklemesini önler.
    // Fallback iskeleti (DB yok) ince içerik olduğundan noindex, follow alır
    // (MIMARI.md §3/§6); DB içeriği dönünce otomatik olarak index'e geçer.
    return buildPageMetadata({
      title: service.metadata.title,
      titleAbsolute: true,
      description: service.metadata.description,
      keywords: service.metadata.keywords,
      canonicalPath: servicePath(canonicalSlug),
      indexable: source === "db",
    });
  }

  // ── 2 segment → il/ilçe metadata'sı ───────────────────────────────────────
  if (segments.length === 2) {
    const [slug, sehir] = segments;
    // Alias slug gelirse kanonik slug'ı kullan; sayfa bileşeni permanentRedirect
    // ile yönlendireceğinden metadata da kanonik URL'e işaret etmeli.
    const canonicalSlug = SERVICE_SLUG_ALIASES[slug] ?? slug;

    const route = await resolveServiceRoute([canonicalSlug, sehir]);
    // resolveServicePage = DB → service-fallback config katmanı. getServiceFromDB
    // kullanılırsa DB erişilemezken ilçe sayfaları config'te hizmet tanımlı
    // olsa bile 404'e düşer (tek segmentli yol 263/369'da bu katmanı kullanıyor).
    const service = route?.service ?? (await resolveServicePage(canonicalSlug))?.service;
    // Zincir bu adresi ÇÖZEMEDİ → son çare yayınlı ağaç sayfası (sayfa bileşeni
    // de aynı noktada `renderFallbackOrNotFound` kullanır).
    if (!service) {
      const fallback = await fallbackMetadata(req);
      return fallback ?? { robots: { index: false, follow: false } };
    }

    const { customPage, centralLocation, locationDecision } =
      await resolveServiceLocation(canonicalSlug, sehir, undefined, route);

    // Yalnızca DB'de çözülen konum veya yayınlanmış CMS sayfası geçerlidir.
    // (`service_city_seo` okuma yolu kaldırıldığı için ayrıca bir "özgün şehir
    // kaydı" koşulu kalmadı; bkz. `@/lib/db/service-city`.)
    if (!customPage && !centralLocation) {
      const fallback = await fallbackMetadata(req);
      return fallback ?? { robots: { index: false, follow: false } };
    }
    // Kırık adres admin tarafından açılmışsa yayınlı `custom` sayfa, kod içi
    // "keep" alias kuralından ÖNCE gelir (sayfa bileşeni de aynı kararı veriyor).
    // Çözülmüş hizmet/konum düğümü BURADA açılmaz: ince içerik → il
    // yönlendirmesi SEO politikası korunmalı.
    if (!isKeepableLocation(locationDecision)) {
      const fallback = await customTreeMetadata(req);
      return fallback ?? { robots: { index: false, follow: false } };
    }

    // 4) Yayınlanmış CMS sayfası. Yalnızca ELLE yazılmış (source_type='manual')
    // sayfalar indexlenir; şablon üretimi (`template`) sayfalar noindex alır.
    if (customPage) {
      const indexable = isIndexableLocation(locationDecision);
      const description = customPage.ozelMetaDesc || customPage.metaDescription;
      return buildPageMetadata({
        title: customPage.metaTitle,
        // metaTitle DB'de zaten "| XipSoft" suffix'i içerir; kök şablonun
        // ikinci kez eklemesini önle (çift "| XipSoft | XipSoft" bug'ı).
        titleAbsolute: true,
        description,
        canonicalPath: serviceLocationPath(canonicalSlug, sehir),
        indexable,
        image: customPage.ogImageUrl ?? undefined,
        imageAlt: customPage.metaTitle,
      });
    }

    // DB'de gerçek içerik yoksa son çare ağaç sayfası; o da yoksa noindex
    // (sayfa bileşeni aynı noktada 404 yerine yayınlı sayfayı açabilir).
    const fallback = await fallbackMetadata(req);
    return fallback ?? { robots: { index: false, follow: false } };
  }

  // 0 ve 3+ segment: hizmet zinciri için geçersiz URL biçimi. Derin bir içerik
  // ağacı sayfası (ör. /hizmetler/<hizmet>/<il>/<alt-sayfa>) burada açılabilir.
  const deepFallback = await fallbackMetadata(req);
  return deepFallback ?? { robots: { index: false, follow: false } };
}

// ── Hizmet detay (1 segment) ──────────────────────────────────────────────────

async function ServiceDetailMaster({ req }: { req: ServiceContentRequest }) {
  const segments = contentSegmentsOf(req);
  const slug = segments[0];
  // 308: alias slug VEYA yanlış uzantılı eski URL → tek hop'ta kanonik adres
  const canonicalSlug = SERVICE_SLUG_ALIASES[slug] ?? slug;
  const canonicalPath = servicePath(canonicalSlug);
  if (req.requestPath !== canonicalPath) {
    permanentRedirect(canonicalPath);
  }

  // DB → config fallback (MIMARI.md §3/§6). Config allowlist'inde olmayan ve
  // DB'de de bulunmayan slug 404 alır; bilinen hizmetler DB yokken iskelet döner.
  const route = await resolveServiceRoute([canonicalSlug]);
  const resolved = route?.rowType === "service" && route.service
    ? { service: route.service, source: "db" as const }
    : await resolveServicePage(canonicalSlug);
  if (!resolved) return renderFallbackOrNotFound(req);
  const { service } = resolved;

  const canonical = `${SITE_URL}${canonicalPath}`;

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

  // ── JSON-LD: Service + BreadcrumbList + FAQPage (tek kaynak: @/lib/schema/*) ─
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
    // DB'den yazılan ham şemalar (`services.schema_markup`) kodun ürettiğini tamamlar.
    ...(service.schemaMarkup ?? []),
  ];

  return (
    <>
      <JsonLd schemas={jsonLd} id={`service-${canonicalSlug}`} />
      <ServicePageClient service={service} />
      {service.guide && <ServiceGuide guide={service.guide} />}

      {/* Topical Authority: hizmetle ilgili blog yazıları — iç linkleme sinyali */}
      {relatedPosts.length > 0 && (
        <section
          aria-labelledby="related-posts-heading"
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20"
        >
          <h2
            id="related-posts-heading"
            className="text-lg font-bold text-zinc-300 mb-5 uppercase tracking-wider font-mono brand-gradient-text"
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

// ── İl/İlçe sayfası (2 segment) ───────────────────────────────────────────────

async function ServiceLocationMaster({ req }: { req: ServiceContentRequest }) {
  const segments = contentSegmentsOf(req);
  const slug = segments[0];
  const sehir = segments[1];
  // 308: Alias slug VEYA yanlış uzantılı eski URL tek hop'ta kanonik adrese
  // taşınır (kalıcı taşıma — 307 DEĞIL, bkz. dosya başı notu)
  const canonicalSlug = SERVICE_SLUG_ALIASES[slug] ?? slug;
  const initialCanonical = serviceLocationPath(canonicalSlug, sehir);
  if (req.requestPath !== initialCanonical) {
    permanentRedirect(initialCanonical);
  }

  const route = await resolveServiceRoute([canonicalSlug, sehir]);
  const service = route?.service ?? (await resolveServicePage(canonicalSlug))?.service;
  // Eşdeğer hizmet alias'ı yukarıda yönlendirildi; bilinmeyen hizmet 404'tür.
  if (!service) return renderFallbackOrNotFound(req);

  // 1) Yayınlanmış CMS sayfasını ara
  const customPage = await getPublishedPageBySlug(`${canonicalSlug}/${sehir}`);

  // 308: Kısa ilçe segmentini (ör. /atasehir) → yayınlanmış kanonik bileşik URL'e yönlendir
  if (!customPage) {
    const canonicalSehir = await getPublishedDistrictPageSegment(canonicalSlug, sehir);
    if (canonicalSehir && canonicalSehir !== sehir) {
      permanentRedirect(serviceLocationPath(canonicalSlug, canonicalSehir));
    }
  }

  // Konum çözümü (metadata ile aynı kaynak)
  const { centralLocation, cityData, cityName, locationDecision } = await resolveServiceLocation(
    canonicalSlug,
    sehir,
    customPage,
    route,
  );

  if (!isKeepableLocation(locationDecision)) {
    // Yayınlı bir `custom` ağaç sayfası, kod içi "keep" alias kuralından ÖNCE
    // gelir: admin bu adresi elle açtıysa artık iskelet/il sayfasına
    // yönlendirilmek yerine kendi içeriği sunulur.
    //
    // `req.resolvedTree` burada BİLİNÇLİ olarak kullanılmaz: o düğüm
    // çözümlemekte olduğumuz hizmet/konum satırının kendisidir, onu açmak
    // "ince içerik → ile yönlendir" SEO politikasını iptal ederdi.
    const tree = await resolveTreeFallback(req);
    if (tree) return renderContentTree(tree);
    const target = getKeptRedirectTarget(locationDecision);
    if (target) permanentRedirect(serviceLocationPath(canonicalSlug, target));
    notFound();
  }

  // 308: Eski bölge URL'lerini DB'deki yayınlanmış il sayfasına yönlendir.
  if (!customPage && !centralLocation) {
    const provinceSlug = await getProvinceSlugForLegacyLocation(canonicalSlug, sehir);
    if (provinceSlug && provinceSlug !== sehir) {
      permanentRedirect(serviceLocationPath(canonicalSlug, provinceSlug));
    }
  }

  // Eski konum URL'si için yayınlanmış il eşleşmesi yukarıda yönlendirilir.
  // Gerçek bir konum veya yayınlanmış içerik karşılığı yoksa alakasız bir hizmet
  // sayfasına yönlendirmek yerine son çare ağaç sayfasına, o da yoksa 404'e düş.
  if (!customPage && !centralLocation) {
    return renderFallbackOrNotFound(req);
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
    const canonicalUrl = `${SITE_URL}${serviceLocationPath(canonicalSlug, sehir)}`;
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
      // DB'den yazılan ham şemalar (`pages.schema_markup`) kodun ürettiğini tamamlar.
      ...(customPage.schemaMarkup ?? []),
    ];
    return (
      <>
        <JsonLd schemas={jsonLd} id={`service-city-${canonicalSlug}-${sehir}`} />
        <PageTemplate page={customPage} location={location} />
      </>
    );
  }

  // ── 2) Yayınlanmış CMS satırı YOK ─────────────────────────────────────────
  // Şehre özel içerik üreten `service_city_seo` okuma yolu kaldırıldı (tablo
  // ölçülen 0 satır); yerde konum sayfasının içeriği YALNIZCA `pages` satırından
  // (PageTemplate) gelir. Burada üretilecek içerik olmadığı için son çare ağaç
  // sayfası denenir, o da yoksa 404 — alakasız bir hizmet şablonuna düşülmez.
  return renderFallbackOrNotFound(req);
}

/** 3+ segment: hizmet zinciri değil — derin içerik ağacı sayfası ya da 404. */
async function ServiceDeepTree({ req }: { req: ServiceContentRequest }) {
  const deepTree = req.resolvedTree ?? (await resolveTreeFallback(req));
  if (deepTree) {
    const nodeCanonical = canonicalPathForNode(deepTree.node);
    if (req.requestPath !== nodeCanonical) permanentRedirect(nodeCanonical);
    return renderContentTree(deepTree);
  }
  notFound();
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export async function renderServiceContent(req: ServiceContentRequest): Promise<ReactElement> {
  const segments = contentSegmentsOf(req);

  if (segments.length === 1) return <ServiceDetailMaster req={req} />;
  if (segments.length === 2) return <ServiceLocationMaster req={req} />;

  // 0 ve 3+ segment hizmet/konum zinciri için geçersiz URL biçimidir; adresi
  // sahiplenen derin bir içerik ağacı sayfası varsa O açılır, değilse 404.
  return <ServiceDeepTree req={req} />;
}
