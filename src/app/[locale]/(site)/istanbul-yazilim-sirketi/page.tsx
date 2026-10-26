import { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";
import { PALETTE } from "@/config/palette";
import { ldJson } from "@/lib/ld-json";
import {
  APP_CONFIG,
  BRAND_COMPANY,
  BRAND_COLORS,
  DEFAULT_OG_IMAGE_URL,
} from "@/config/brand.config";
import { getPageFaqs, getPageMeta, type PageMeta } from "@/lib/page-content";
import TitleText from "@/components/Common/TitleText/TitleText";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("istanbul-yazilim-sirketi");
  const title = meta?.title || APP_CONFIG.title;
  const description = meta?.description || APP_CONFIG.description;

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: meta?.keywords?.length ? meta.keywords : undefined,
    alternates: { canonical: `${SITE_URL}/istanbul-yazilim-sirketi` },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/istanbul-yazilim-sirketi`,
      title: meta?.ogTitle || APP_CONFIG.title,
      description: meta?.ogDescription || APP_CONFIG.description,
      locale: "tr_TR",
      siteName: "XipSoft Yazılım ve Teknoloji Sistemleri",
      images: [{ url: DEFAULT_OG_IMAGE_URL, width: 1200, height: 630, alt: "XipSoft - İstanbul Yazılım Şirketi" }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta?.ogTitle || APP_CONFIG.title,
      description: meta?.ogDescription || APP_CONFIG.description,
      images: [DEFAULT_OG_IMAGE_URL],
    },
  };
}

function buildJsonLd(meta: PageMeta | null) {
  return [
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    // Kök layout'taki `local-business.ts` şeması `${SITE_URL}/#localbusiness`
    // @id'sini zaten yayınlıyor; aynı @id üzerinde farklı @type vermek Google
    // tarafında çakışma üretiyor. Bu sayfa kendi düğümünü kullanır.
    "@id": `${SITE_URL}/istanbul-yazilim-sirketi#localbusiness`,
    name: "XipSoft Yazılım ve Teknoloji Sistemleri",
    url: SITE_URL,
    telephone: BRAND_COMPANY.phone,
    email: BRAND_COMPANY.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Nurol Tower, İzzet Paşa, Yeni Yol Cd. No:3 Kat:22",
      addressLocality: "Şişli",
      addressRegion: "İstanbul",
      postalCode: "34381",
      addressCountry: "TR",
    },
    geo: { "@type": "GeoCoordinates", latitude: 41.0682, longitude: 28.9862 },
    openingHours: "Mo-Fr 09:00-18:00",
    description: meta?.jsonLd?.businessDescription || APP_CONFIG.description,
    sameAs: [
      "https://www.linkedin.com/company/xipsoft",
      "https://twitter.com/xipsoft",
      "https://github.com/xipsoft",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "İstanbul Yazılım Şirketi", item: `${SITE_URL}/istanbul-yazilim-sirketi` },
    ],
  },
  ];
}

const STACK_ITEMS = [
  { title: "Next.js 16+", color: BRAND_COLORS.secondary, desc: "SSR, ISR ve Edge Runtime ile yuksek performansli web uygulamalari. Core Web Vitals odakli gelistirme ile LCP suresini 2.5 saniyenin altina indiriyoruz." },
  { title: "PostgreSQL & NeonDB", color: BRAND_COLORS.primary, desc: "Serverless veritabani optimizasyonu. EXPLAIN ANALYZE ile sorgu plani analizi, index stratejisi ve %40'a varan hiz kazanimlari." },
  { title: "Tailwind CSS", color: BRAND_COLORS.accent, desc: "Responsive ve ozellestirilebilir arayuzler. Mobil oncelikli tasarim, dark/light mode destegi ve erisilebilirlik standartlari." },
  { title: "React Native / Swift / Kotlin", color: BRAND_COLORS.accentDeep, desc: "iOS ve Android icin native performansli mobil uygulamalar. App Store ve google Play yayin surecleri dahil." },
  { title: "Siber guvenlik", color: PALETTE.neon[300], desc: "Penetrasyon testi, guvenlik denetimi, OWASP Top 10 uyumlulugu ve guvenli kod gelistirme danismanligi." },
  { title: "SEO & Dijital Pazarlama", color: PALETTE.neon[400], desc: "Teknik SEO, icerik stratejisi, google Search Console optimizasyonu ve Core Web Vitals iyilestirme." },
];

const DISTRICTS = [
  "Sisli", "Besiktas", "Kadikoy", "Levent", "Maslak",
  "Atasehir", "Umraniye", "Maltepe", "Bakirkoy", "Sariyer",
];

const DISTRICT_COLORS = [
  BRAND_COLORS.secondary, BRAND_COLORS.primary, BRAND_COLORS.accent,
  BRAND_COLORS.accentDeep, PALETTE.neon[300], PALETTE.neon[400],
];

export default async function IstanbulYazilimSirketiPage() {
  const meta = await getPageMeta("istanbul-yazilim-sirketi");
  const faqItems = await getPageFaqs("istanbul");
  const jsonLd = buildJsonLd(meta);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faqJsonLd) }} />

      <div className="min-h-screen relative">
        {/* Ambient arka plan */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 70% 50% at 50% 0%, rgba(167, 139, 250,0.08) 0%, transparent 60%),
              radial-gradient(ellipse 50% 40% at 0% 100%, rgba(167, 139, 250,0.08) 0%, transparent 55%)
            `,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.028]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(167, 139, 250,0.12) 1px, transparent 1px),
              linear-gradient(90deg, rgba(167, 139, 250,0.12) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-10 text-sm text-zinc-600">
            <ol className="flex items-center gap-2">
              <li><Link href="/" className="hover:text-zinc-300 transition-colors">Ana Sayfa</Link></li>
              <li className="text-zinc-700">/</li>
              <li className="text-zinc-400">Istanbul Yazilim Sirketi</li>
            </ol>
          </nav>

          {/* Hero */}
          <div className="mb-16">
            <TitleText tag="h1" variant="hero" className="mb-6 !text-[clamp(2.2rem,6vw,4.5rem)] !leading-tight">
              Istanbul&apos;un<br />Yazilim Sirketi
            </TitleText>
            <p className="text-zinc-400 max-w-2xl leading-relaxed text-lg">
              Xipsoft olarak Istanbul genelinde{" "}
              <strong className="text-zinc-200">Next.js, PostgreSQL ve Tailwind CSS</strong>{" "}
              teknolojileri ile kurumsal web ve mobil uygulamalar gelistiriyoruz.
              Sisli merkezli ofisimizden Istanbul&apos;un tum ilcelerine hizmet veriyoruz.
            </p>
          </div>

          {/* Teknoloji Stack */}
          <section aria-labelledby="stack-heading" className="mb-20">
            <TitleText tag="h2" variant="brand" className="mb-8">
              Istanbul Firmalarina Ozel<br />Teknoloji Stack&apos;imiz
            </TitleText>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {STACK_ITEMS.map((item) => (
                <div
                  key={item.title}
                  className="group relative p-6 rounded-2xl overflow-hidden transition-all duration-500 bg-white/[0.02] backdrop-blur-md border border-white/[0.06] shadow-[0_4px_24px_rgba(5, 8, 17,0.12)] hover:-translate-y-1.5 hover:border-white/[0.11]"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl"
                    style={{ background: `linear-gradient(90deg, transparent, ${item.color}80, transparent)` }}
                  />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse 80% 55% at 50% 0%, ${item.color}12, transparent 68%)` }}
                  />
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider mb-3 relative z-10"
                    style={{ background: `${item.color}12`, color: item.color, border: `1px solid ${item.color}20` }}
                  >
                    {item.title}
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed relative z-10 group-hover:text-zinc-400 transition-colors duration-300">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Neden Xipsoft */}
          <section aria-labelledby="why-heading" className="mb-20">
            <TitleText tag="h2" variant="brand" className="mb-6">
              Neden Isletmeler<br />Xipsoft&apos;u Tercih Ediyor?
            </TitleText>

            <div className="group relative p-7 rounded-2xl overflow-hidden transition-all duration-500 bg-white/[0.02] backdrop-blur-md border border-white/[0.06] shadow-[0_4px_24px_rgba(5, 8, 17,0.12)] hover:border-white/[0.11]">
              <div
                className="absolute top-0 left-0 right-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl"
                style={{ background: `linear-gradient(90deg, transparent, ${BRAND_COLORS.secondary}70, transparent)` }}
              />
              <p className="text-zinc-400 mb-4 leading-relaxed relative z-10">
                google Core Web Vitals odakli gelistirme ile web sitenizin{" "}
                <strong className="text-zinc-200">LCP suresini 2.5 saniyenin altina</strong>{" "}
                indiriyoruz. PostgreSQL sorgu optimizasyonu ile veri yogun projelerde{" "}
                <strong className="text-zinc-200">%40&apos;a varan hiz kazanimi</strong> sagliyoruz.
              </p>
              <p className="text-zinc-400 leading-relaxed relative z-10">
                15 yillik deneyimimizle Istanbul&apos;daki ofisinizden veya remote calisarak
                projeleri <strong className="text-zinc-200">zamaninda ve eksiksiz</strong> teslim
                ediyoruz. Her projede teknik dokumantasyon, test coveragi ve deployment
                destegi standart olarak sunulmaktadir.
              </p>
            </div>
          </section>

          {/* Hizmet Verilen Ilceler */}
          <section aria-labelledby="districts-heading" className="mb-20">
            <TitleText tag="h2" variant="brand" className="mb-6">
              Hizmet Verdigimiz Ilceler
            </TitleText>
            <ul className="flex flex-wrap gap-2.5" role="list">
              {DISTRICTS.map((district, i) => {
                const color = DISTRICT_COLORS[i % DISTRICT_COLORS.length]!;
                return (
                  <li
                    key={district}
                    className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5"
                    style={{ background: `${color}0c`, border: `1px solid ${color}30`, color }}
                  >
                    {district}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* CTA */}
          <section
            aria-labelledby="cta-heading"
            className="relative rounded-3xl p-10 md:p-14 overflow-hidden"
            style={{
              background: "linear-gradient(160deg, rgba(167, 139, 250,0.06), rgba(18, 20, 28,0.06), rgba(255,255,255,0.02))",
              border: "1px solid rgba(203, 213, 225, 0.08)",
            }}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(167, 139, 250,0.06) 0%, transparent 70%)" }} />

            <TitleText tag="h2" variant="brand" className="relative z-10 mb-3 !text-[clamp(1.5rem,3vw,2.25rem)]">
              Istanbul&apos;da Yazilim<br />Ihtiyaciniz mi Var?
            </TitleText>
            <p className="relative z-10 text-zinc-400 mb-7 leading-relaxed max-w-xl">
              Projenizi gormek ve ucretsiz teklif almak icin iletisime gecin.
              Next.js, React Native veya PostgreSQL tabanli projelerinizde yaninizdayiz.
            </p>
            <div className="relative z-10 flex flex-wrap gap-3">
              <Link
                href="/contact-us"
                className="site-cta-primary inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold shadow-[0_6px_20px_rgba(167, 139, 250,0.14)] transition-all duration-200 hover:-translate-y-0.5"
              >
                Ucretsiz Teklif Al
              </Link>
              <Link
                href="/hizmetler/web-yazilim-tasarim1.html"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(203, 213, 225, 0.10)", color: "rgba(255,255,255,0.75)" }}
              >
                Hizmetlerimizi Incele
              </Link>
            </div>
          </section>

        </main>
      </div>
    </>
  );
}
