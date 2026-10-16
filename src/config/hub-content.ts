/**
 * hub-content.ts — `/hizmetler` hub sayfasının sabit metin içerikleri.
 *
 * Mimari: MIMARI.md §3 — şablon–içerik ayrımı; içerik bileşen içinde gömülü
 * durmaz, config'e taşınır. Hizmet kartları `services` tablosundan (DB'den)
 * gelir; buradaki metinler hub sayfasının site genelindeki pazarlama
 * metinleridir (hero, "Neden biz", SSS başlığı, CTA).
 */

export const HUB_CATEGORIES = [
  { id: "all", label: "Tüm Hizmetler" },
  { id: "software", label: "Yazılım & Web" },
  { id: "automation", label: "Otomasyon & AI" },
  { id: "mobile", label: "Mobil Çözümler" },
  { id: "cloud-security", label: "Bulut & Güvenlik" },
] as const;

export const HUB_CONTENT = {
  badge: "Uçtan Uca Teknoloji Mimarisi",

  hero: {
    titleLead: "Özel Yazılım, Akıllı Otomasyon &",
    titleAccent: "Teknoloji Hizmetleri",
    description:
      "Modern web ve mobil platformlardan Python tabanlı süreç otomasyonlarına, bulut mimarisinden siber güvenlik denetimlerine kadar işletmenizin dijital büyümesini hızlandıran yüksek performanslı mühendislik çözümleri.",
  },

  whyUs: {
    kicker: "Mühendislik Standartlarımız",
    title: "Neden XipSoft ile Çalışmalısınız?",
    description:
      "Hazır kalıplar ve hantal temalar yerine, projenizin ihtiyacına göre sıfırdan mimari tasarlarız. Hız, Güvenlik, SEO ve ölçeklenebilirlik teslim ettiğimiz her satır kodun değişmez temelidir.",
    stats: [
      {
        value: "15+ Yıl",
        label: "Sektör Tecrübesi",
        description:
          "2010 yılından bugüne yüzlerce şirkete güvenilir yazılım altyapısı ve danışmanlık sağladık.",
      },
      {
        value: "200+",
        label: "Tamamlanan Proje",
        description:
          "E-ticaret sistemlerinden finans botlarına, mobil uygulamalardan ERP entegrasyonlarına.",
      },
      {
        value: "< 2.0 sn",
        label: "LCP & Sayfa Hızı",
        description:
          "Core Web Vitals yeşil bant garantisiyle arama motorlarında rakiplerinizden hızlı olun.",
      },
      {
        value: "24 Saat",
        label: "Hızlı Teklif Süresi",
        description:
          "Teknik gereksinimlerinizi dinler, 24 saat içinde net takvim ve bütçe planı sunarız.",
      },
    ],
  },

  faq: {
    kicker: "Merak Edilenler",
    title: "Hizmetlerimiz Hakkında Sıkça Sorulan Sorular",
    description:
      "Yazılım geliştirme, otomasyon botları ve iş birliği süreçlerimize dair en çok sorulan sorular.",
  },

  cta: {
    title: "Yeni Projenizi Hayata Geçirmeye Hazır mısınız?",
    description:
      "Özel yazılım veya süreç otomasyonu fikrinizi uzman mühendislerimizle değerlendirin. İhtiyaçlarınıza özel teknik mimariyi belirleyelim, 24 saat içinde ücretsiz teklifinizi sunalım.",
    primary: "Ücretsiz Teklif Alın",
    secondary: "Bizimle İletişime Geçin",
  },
} as const;

/** "Neden XipSoft" istatistik kartlarının vurgu renkleri (saf styling). */
export const WHY_US_STAT_ACCENTS = [
  "text-violet-400",
  "text-cyan-400",
  "text-emerald-400",
  "text-rose-400",
] as const;
