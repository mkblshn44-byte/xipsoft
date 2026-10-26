Bu mimari inceleme ve refaktör listesi oldukça yerinde; özellikle kod tekrarını azaltmak, modülerliği artırmak (mevcut dosya yapısını koruyarak) ve performans optimizasyonu yapmak açısından mükemmel maddeler içeriyor.

XipSoft ekosistemine uygun olarak, bu maddeleri hayata geçirmek için izlenmesi gereken **adım adım aksiyon planı ve kod yapılandırmaları** şunlardır:

---

## 4.1 `layout.tsx` Refaktörü

### 1. JSON-LD Şemalarının Taşınması ve `@graph` Kullanımı

Şemaları doğrudan `src/lib/schema/site/` altına (örneğin `site.schema.ts` olarak) taşıyalım. Üç ayrı `<script>` etiketi yerine, Google'ın da önerdiği tek bir `@graph` yapısı oluşturalım:

```typescript
// src/lib/schema/site/site.schema.ts
export const SITE_METADATA = {
  name: "XipSoft",
  url: "https://www.xipsoft.net",
  description: "...",
  image: "https://www.xipsoft.net/media/og-image.jpg",
  address: {
    // Ortak adres bilgisi
  },
  geo: {
    // Ortak koordinatlar
  },
  areaServed: ["TR", "AZ", "DE"], // Tutarsızlığı gidermek için tek ortak tanım
};

export function generateSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_METADATA.url}/#website`,
        url: SITE_METADATA.url,
        name: SITE_METADATA.name,
        description: SITE_METADATA.description,
      },
      {
        "@type": "Organization",
        "@id": `${SITE_METADATA.url}/#organization`,
        name: SITE_METADATA.name,
        url: SITE_METADATA.url,
        logo: SITE_METADATA.image,
        areaServed: SITE_METADATA.areaServed,
      },
      {
        "@type": "LocalBusiness",
        "@id": `${SITE_METADATA.url}/#localbusiness`,
        name: SITE_METADATA.name,
        image: SITE_METADATA.image,
        address: SITE_METADATA.address,
        geo: SITE_METADATA.geo,
        areaServed: SITE_METADATA.areaServed,
      },
    ],
  };
}

```

*`layout.tsx` içinde sadece şu kalacak:*

```tsx
import { generateSiteSchema } from "@/lib/schema/site/site.schema";

export default function RootLayout({ children }) {
  const jsonLd = generateSiteSchema();
  return (
    <html>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

```

### 2. Provider Zinciri Optimizasyonu

* **Kök Layout (`app/[locale]/layout.tsx`):** Sadece global state'ler kalmalı (`Language`, `Intl`, `Auth`).
* **Rota Grupları:** `Cart` ve `Auction` provider'larını ilgili route gruplarının kendi layout dosyalarına taşı (Örn: `app/[locale]/(shop)/layout.tsx` ve `app/[locale]/(auction)/layout.tsx`). Böylece her sayfada gereksiz yere yüklenmezler.

### 3. Meta Etiketleri ve İsimlendirme Düzeltmeleri

* **Keywords:** Google artık `keywords` meta etiketini dikkate almıyor, tamamen kaldırılabilir.
* **DNS Prefetch:** Sadece kullanılan dış kaynaklar (örn. CDN veya analytics) kalacak şekilde sadeleştirilmeli.
* **Adlandırma:** `APP_CONFIg` ve `Og_IMAgE` gibi değişkenler standart formata (`APP_CONFIG`, `OG_IMAGE`) çekilmeli.
* **Mükerrer Metadata:** `title` ve `description` değerleri ortak bir config nesnesinden beslenerek OpenGraph ve Twitter objelerinde tekrar yazılmaktan kurtarılmalı.

---

## 4.2 `sitemap.ts` Optimizasyonu

1. **`force-dynamic` ve `unstable_cache` Çelişkisi:**
Eğer veriler `unstable_cache` ile önbelleğe alınıyor ve `revalidate` süresi veriliyorsa, `force-dynamic` kullanmak gereksizdir. Sayfanın statik/ISR çalışmasını sağlayarak build performansını artırabilirsin.
2. **Tekrarlayan `unstable_cache` Sarmalayıcıları:**
Veritabanı veya API çağrıları için tek bir ortak cache sarmalayıcı yardımcı fonksiyon yazarak 3 ayrı sarmalayıcı tekrarından kurtulabilirsin:

```typescript
// src/lib/cache/with-cache.ts
import { unstable_cache } from "next/cache";

export function cachedQuery<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts: string[],
  revalidate = 3600
) {
  return unstable_cache(fn, keyParts, { revalidate });
}

```

---

## 4.3 `robots.ts` İyileştirmesi

Yinelenen `utm_*`, `fbclid`, `gclid` parametrelerini ve bot engellemelerini tek bir dizi + map yapısıyla yönetmek kod kalabalığını ortadan kaldırır:

```typescript
const TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];

const BLOCKED_BOTS = [
  'ClaudeBot',
  'anthropic-ai',
  // Diğer istenmeyen AI/kötü botlar
];

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: TRACKING_PARAMS.map(param => `/*?*${param}=*`),
      },
      {
        userAgent: BLOCKED_BOTS,
        disallow: '/',
      },
    ],
    sitemap: 'https://www.xipsoft.net/sitemap.xml',
  };
}

```

*(Not: `ClaudeBot` ve `anthropic-ai` engellemesi içeriklerin yapay zeka modelleri tarafından kazınmasını istemiyorsanız bilinçli bir karardır; projenizin telif/içerik politikasına göre bu kararı teyit edip bırakabilirsiniz).*