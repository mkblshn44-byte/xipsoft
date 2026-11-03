/**
 * service-fallback.ts — Hizmet detay sayfaları için YAPILANDIRMA fallback'i.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Mimari: MIMARI.md §3 (Şablon–İçerik Ayrımı) ve §6 (Fallback Katmanları)
 * SEO:    SEO.md B12 (doğru HTTP durumu) + B4 (ince/shablon sayfa riski)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Katman sırası:  DB (varsa)  →  Config (bu dosya)  →  i18n
 *
 * Bu dosya ÖZGÜN İÇERİK ÜRETMEZ. Yalnızca DB erişilemediğinde (veya kayıt
 * geçici olarak yokken) sayfa iskeletinin boş kalmaması için; başlık ve kısa
 * açıklama sağlar. SSS metni ÜRETİLMEZ — SSS yalnızca DB'deki `faq_items`
 * dolu olduğunda gösterilir. Fallback ile üretilen sayfalar `noindex, follow`
 * işaretlenir (ince içerik indekslenmez, ancak iç bağlantılar takip edilir).
 *
 * Burada tanımlı slug listesi aynı zamanda "gerçekten var olan hizmetler"
 * allowlist'idir: config'de VE DB'de olmayan bir slug 404 döner (MIMARI.md §6).
 */

import type { ServicePageData } from "@/lib/db/services";

export interface ServiceFallbackEntry {
  /** Görünen hizmet adı (hero başlığı). */
  title: string;
  /** Kısa açıklama (hero alt metni). */
  subtitle: string;
  /** SEO anahtar kelimeleri. */
  keywords: string[];
}

/** 11 ana hizmet — kanonik slug → fallback içeriği. */
export const SERVICE_FALLBACKS: Record<string, ServiceFallbackEntry> = {
  // Slug DB'deki kanonik karşılığıyla birebir aynı olmalı: `services.slug`
  // zamanında "web-yazilim-tasarim1" olarak taşındı, bu anahtar eski adıyla
  // kalırsa DB erişilemediğinde iskelet bile üretilemiyor (404).
  "web-yazilim-tasarim1": {
    title: "Web Yazılım & Tasarım",
    subtitle:
      "Kurumsal web siteleri ve ölçeklenebilir web uygulamaları; modern tasarım, yüksek performans ve SEO uyumu ile.",
    keywords: ["web yazılım", "web tasarım", "kurumsal web sitesi", "web uygulaması"],
  },
  "mobil-uygulama": {
    title: "Mobil Uygulama Geliştirme",
    subtitle:
      "iOS ve Android için yerel ve çapraz platform mobil uygulamalar; kullanıcı odaklı deneyim ve güvenli altyapı.",
    keywords: ["mobil uygulama", "iOS", "Android", "React Native", "Flutter"],
  },
  "yapay-zeka-ml": {
    title: "Yapay Zeka & Makine Öğrenmesi",
    subtitle:
      "İş süreçlerinize yapay zeka entegrasyonu, veri odaklı modeller ve otomasyon çözümleri.",
    keywords: ["yapay zeka", "makine öğrenmesi", "AI entegrasyonu", "veri modelleme"],
  },
  "siber-guvenlik": {
    title: "Siber Güvenlik",
    subtitle:
      "Uygulama ve altyapı güvenliği, sızma testleri, güvenlik denetimi ve sürekli izleme.",
    keywords: ["siber güvenlik", "sızma testi", "güvenlik denetimi", "uygulama güvenliği"],
  },
  "masaustu-yazilim": {
    title: "Masaüstü Yazılım",
    subtitle:
      "Windows, macOS ve Linux için performanslı masaüstü uygulamaları; kurumsal süreçlere özel çözümler.",
    keywords: ["masaüstü yazılım", "Windows uygulaması", "kurumsal yazılım", "desktop app"],
  },
  "seo-dijital-pazarlama": {
    title: "SEO & Dijital Pazarlama",
    subtitle:
      "Teknik SEO, içerik stratejisi ve dijital pazarlama ile organik görünürlüğünüzü büyütün.",
    keywords: ["SEO", "dijital pazarlama", "organik trafik", "içerik stratejisi"],
  },
  "bulut-bilisim": {
    title: "Bulut Bilişim",
    subtitle:
      "Bulut mimarisi, sunucusuz çözümler ve ölçeklenebilir altyapı; düşük maliyet, yüksek erişilebilirlik.",
    keywords: ["bulut bilişim", "cloud", "sunucusuz", "ölçeklenebilir altyapı"],
  },
  "e-ticaret-platformlari": {
    title: "E-Ticaret Platformları",
    subtitle:
      "Hızlı, güvenli ve dönüşüm odaklı e-ticaret altyapıları; entegrasyonlar ve pazaryeri çözümleri.",
    keywords: ["e-ticaret", "online satış", "pazaryeri entegrasyonu", "e-ticaret yazılımı"],
  },
  "devops-sre": {
    title: "DevOps & SRE",
    subtitle:
      "CI/CD otomasyonu, altyapı yönetimi ve güvenilirlik mühendisliği ile kesintisiz teslim.",
    keywords: ["DevOps", "SRE", "CI/CD", "altyapı otomasyonu"],
  },
  "veri-analizi-bi": {
    title: "Veri Analizi & İş Zekası",
    subtitle:
      "Veri ambarı, raporlama ve iş zekası panelleri ile kararlarınızı veriye dayandırın.",
    keywords: ["veri analizi", "iş zekası", "BI", "raporlama", "veri ambarı"],
  },
  "blockchain-web3": {
    title: "Blockchain & Web3",
    subtitle:
      "Akıllı sözleşmeler, merkeziyetsiz uygulamalar ve tokenizasyon çözümleri.",
    keywords: ["blockchain", "web3", "akıllı sözleşme", "dApp", "tokenizasyon"],
  },
};

/**
 * Verilen hizmet slug'ı için yapılandırma fallback'ini `ServicePageData`
 * şekline dönüştürür. Slug allowlist'te yoksa `null` döner (→ 404).
 *
 * İçerik dizileri (features, packages, microServices, faqItems …) boş bırakılır;
 * şablon boş bölümleri render etmez. Böylece iskelet (hero + CTA) korunur.
 */
export function getServiceFallback(slug: string): ServicePageData | null {
  const entry = SERVICE_FALLBACKS[slug];
  if (!entry) return null;

  return {
    slug,
    badge: "Hizmet",
    badgeIcon: "Globe",
    badgegradient: "",
    badgeColor: "text-violet-400",
    title: entry.title,
    titlegradient: "",
    subtitle: entry.subtitle,
    heroCta: "Teklif Al",
    stats: [],
    features: [],
    techStack: [],
    servicesTag: [],
    processSteps: [],
    packages: [],
    ctaTitle: "Projenizi Birlikte Hayata Geçirelim",
    ctaDesc:
      "İhtiyacınızı anlatın; ekibimiz size en uygun çözümü ve yol haritasını sunsun.",
    ctaBtn: "Teklif Al",
    microServices: [],
    faqTitle: "Sıkça Sorulan Sorular",
    // SSS bilinçli olarak boş: jenerik liste yerine yalnızca DB'de gerçek
    // `faq_items` verisi olduğunda SSS gösterilir (bkz. FaqSection).
    faqItems: [],
    metadata: {
      title: `${entry.title} | XipSoft`,
      description: entry.subtitle,
      keywords: entry.keywords,
    },
  };
}

/** Fallback allowlist'inde tanımlı kanonik hizmet slug'ları. */
export const SERVICE_FALLBACK_SLUGS = Object.keys(SERVICE_FALLBACKS);
