# XipSoft — Mimari

> **Amaç:** Sistemin hedef mimarisini, katmanlarını, şablon–içerik ayrımını, cache ve
> render stratejisini tek kaynaktan anlatmak.
> **Dil:** Türkçe
> **Bu belge:** Sistemin "olması gereken" (hedef) mimarisidir. Kod ile farklar ilgili
> bölümlerde **[Durum]** etiketiyle belirtilir.
> **İlişkili belgeler:**
> - SEO stratejisi, uyum ve GSC onarım → [`SEO.md`](./SEO.md)
> - Kod refactor geçmişi, modül durumu, kalan işler → [`REFACTOR.md`](./REFACTOR.md)
>
> Kural: Her bilgi **tek bir belgede** yaşar. Diğer belgeler kopyalamaz, referans verir.

**İçindekiler**
1. [Genel Bakış](#1-genel-bakış)
2. [Katmanlı Mimari](#2-katmanlı-mimari)
3. [Şablon–İçerik Ayrımı (SEO)](#3-şabloniçerik-ayrımı-seo)
4. [Cache Stratejisi (Redis + ISR)](#4-cache-stratejisi-redis--isr)
5. [Kademeli Render (Streaming)](#5-kademeli-render-streaming)
6. [Fallback İçerik Katmanları](#6-fallback-içerik-katmanları)
7. [İki Dinamik Master Motor](#7-iki-dinamik-master-motor)
8. [Veri & SEO Mimarisi](#8-veri--seo-mimarisi)
9. [Sabit Kurumsal Sayfalar](#9-sabit-kurumsal-sayfalar)
10. [Forum Kaldırıldı & Legacy URL Kararları](#10-forum-kaldırıldı--legacy-url-kararları)
11. [Sitemap Kuralları](#11-sitemap-kuralları)
12. [Klasör Adı Kanonikleri](#12-klasör-adı-kanonikleri)
13. [Dosya/Klasör Hedefi & Dosya Sayısı](#13-dosyaklasör-hedefi--dosya-sayısı)
14. [Güvenlik Katmanları](#14-güvenlik-katmanları)

---

## 1. Genel Bakış

XipSoft; **Next.js 15 App Router** üzerinde çalışan, içeriğini **NeonDB (PostgreSQL)** ve
arama indeksini **Redis (Upstash)** üzerinden besleyen, çok katmanlı önbellekli bir
kurumsal yazılım/teknoloji sitesidir.

Üç temel ilke:

1. **Şablon ≠ İçerik** — Sayfa iskeleti DB'den bağımsız çalışır; dinamik içerik DB'den gelir.
2. **Cache zorunlu** — Her istek DB'ye gitmez; Redis + ISR devrededir.
3. **Kademeli yükleme** — Kritik içerik önce, ikincil içerik sonra (streaming).

**Teknoloji:** Next.js 15.5 · React 19 · TypeScript 5.8 · TailwindCSS 3 · next-intl ·
NeonDB (`pg`) · Upstash Redis · Lexical (editör) · Vercel (hosting + ISR + Cron).

**Durum göstergeleri (tek kaynak):**

| Soru | Kaynak |
|---|---|
| Güncel / bağlayıcı SEO skoru | [`SEO.md`](./SEO.md) **§4.2 — ~%76** (kanıta dayalı denetim; Bölüm 2'deki planlama skorunu **ezer**) |
| Kod düzeltmeleri, kritik bulgu kayıtları | [`REFACTOR.md`](./REFACTOR.md) (ör. §6 eksik SELECT kolonları) |
| Hedef mimari & rota yapısı | Bu belge |

---

## 2. Katmanlı Mimari

```
İstek
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│ 1. EDGE / CDN                                             │
│    • ISR/statik HTML (revalidate)                         │
│    • Statik varlıklar (immutable)                         │
│    • Güvenlik başlıkları (next.config headers)            │
└──────────────────────────────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│ 2. MIDDLEWARE (src/middleware.ts)                         │
│    • Trailing slash normalizasyonu (301)                  │
│    • www → non-www (301)                                  │
│    • Legacy /forum/* → /blog[/<slug>] (301)               │
│    • robots (noindex) & güvenlik başlıkları               │
└──────────────────────────────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│ 3. APP ROUTER (src/app/**)                                │
│    • Server Component varsayılan                          │
│    • İki dinamik master: ServiceMaster · BlogMaster       │
│    • Sabit sayfalar (hakkımızda, iletişim, gizlilik…)     │
└──────────────────────────────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│ 4. VERİ KATMANI (src/lib/**)                              │
│    • db/*        → sorgular (pool, services, blog, pages) │
│    • redis/*     → cache (blog list/post)                 │
│    • seo/*, schema/* → meta & JSON-LD üretimi             │
└──────────────────────────────────────────────────────────┘
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│ 5. KALICI DEPOLAMA                                        │
│    • NeonDB (PostgreSQL) — içerik                        │
│    • Upstash Redis — önbellek                            │
└──────────────────────────────────────────────────────────┘
```

**Klasör özeti:**

| Katman | Konum |
|---|---|
| Middleware + normalize | `src/middleware.ts`, `src/middleware-utils/*` |
| Rotalar | `src/app/[locale]/(site)/*`, `src/app/(admin)/admin/*` |
| API & Server Actions | `src/app/api/*`, `src/app/_actions/*` |
| Domain / veri erişimi | `src/lib/db/*`, `src/lib/redis/*`, `src/lib/pages/*` |
| SEO motoru | `src/lib/seo-helpers.ts`, `src/lib/schema/*`, `src/lib/seo/*` |
| Ortak bileşenler | `src/components/Common/*`, `src/components/Ui/*` |
| Config | `src/config/*` |

---

## 3. Şablon–İçerik Ayrımı (SEO)

### 3.1 Temel İlke

> "Bot içeriği görmeli, boş sayfa görmemeli." Google botu bir sayfayı ziyaret ettiğinde
> **anlamlı HTML** görmelidir. Sayfa **gerçekten yoksa** 404; aksi halde **200 + anlamlı içerik**.

| Durum | Doğru Davranış |
|---|---|
| DB var, içerik var | ✅ Zengin sayfa |
| DB var, içerik yok | ✅ İskelet + fallback |
| DB yok | ✅ İskelet + config fallback |
| Slug gerçekten yok | ✅ 404 |

> **✅ KARAR (bağlayıcı):** Şablon–içerik ayrımı **kabul edilmiştir.** İskelet (Katman A) her
> durumda render edilir; içerik (Katman B) DB'den gelir, DB yoksa **config → i18n** fallback
> devreye girer. Yalnızca slug gerçekten yoksa 404 verilir.
>
> **[Durum — 15.10.2026]** Karar **hizmet detay için koda yansıdı:** `resolveServicePage()`
> (src/lib/db/services.ts) DB → config (`src/config/service-fallback.ts`) sırasını çözer; ikisinde
> de yoksa 404. Fallback iskelet `noindex, follow` alır. **Lokasyon (il/ilçe) ve blog detay hâlâ
> "DB-only"** — DB kaydı yoksa `notFound()`. Kalan iş: `REFACTOR.md` §9.2.

### 3.2 Katmanlar

**Katman A — İskelet (DB'den bağımsız):**

- Hero başlığı (hizmet/sayfa adı)
- Layout: Navbar, Footer, SiteStarfield
- Bölüm yapısı (hangi section'lar görünecek)
- Genel SSS şablonu, İlgili hizmetler (config), CTA (teklif/iletişim)
- Breadcrumb

**Katman B — Dinamik içerik (DB):**

- Hizmet açıklaması, lokasyon özel içerik
- Blog yazı gövdesi, görseller, yazar bilgisi, ilgili yazılar

**Kural:** Katman A **her zaman** gösterilir; Katman B **DB varsa** dolar.

### 3.3 SEO İçin Kritik Şablon Öğeleri

Bunlar her durumda HTML'de bulunmalıdır:

| Öğe | Kaynak | Zorunlu mu? |
|---|---|---|
| `<title>` | DB → fallback | ✅ |
| `<meta description>` | DB → fallback | ✅ |
| `<link canonical>` | Şablon üretir | ✅ |
| `<h1>` | DB → fallback | ✅ |
| JSON-LD `Service` / `BlogPosting` | Şablon üretir | ✅ |
| JSON-LD `BreadcrumbList` | Şablon üretir | ✅ |
| JSON-LD `FAQPage` | Şablon üretir (fallback SSS) | ⚠️ Önerilen |
| İç bağlantılar (ilgili hizmet/blog) | Config/DB | ⚠️ Önerilen |
| Zengin metin, görseller | DB | ⚠️ Varsa |

---

## 4. Cache Stratejisi (Redis + ISR)

### 4.1 Üç Katmanlı Cache

```
İstek → [1] Edge/CDN (ISR HTML)  ~10–50ms
          ↓ miss
        [2] Redis (Upstash)       ~5–20ms
          ↓ miss
        [3] NeonDB (PostgreSQL)   ~50–200ms
```

**Kural:** İstek mümkün olduğunca [1]'den dönmeli; [2]–[3] yalnızca cache miss'te çalışır.

### 4.2 ISR (Incremental Static Regeneration)

| Sayfa tipi | `revalidate` |
|---|---|
| Ana sayfa | 3600 s |
| Hizmet | 3600 s |
| Hizmet + lokasyon | 3600 s |
| Blog listesi | 3600 s |
| Blog detay | 300–3600 s |
| Statik sayfa | 86400 s |

Admin içerik güncellediğinde `revalidateTag("services")` / `revalidatePath("/blog")` ile
önbellek anında tazelenir.

### 4.3 `unstable_cache` Kullanımı

Veri katmanındaki domain sorguları `unstable_cache` ile sarılır; cache anahtarı
sürümlenir (`services-hub-v2` gibi) ve `tags` ile admin revalidate'e bağlanır
(örn. `["services", "sitemap"]`).

### 4.4 Redis Kullanım Alanları

| Veri | TTL | Not |
|---|---|---|
| Blog listesi | 1 saat | `setBlogListCache` |
| Blog detay | 1 saat | `setBlogPostCache` |
| Hizmet/lokasyon | — | Şu an `unstable_cache`; Redis opsiyonel |

> **[Durum]** Redis; **blog** cache'inde aktiftir. Hizmet/lokasyon içeriği ağırlıklı olarak
> `unstable_cache` + ISR ile önbelleklenir (ek DB yükü oluşturmaz). Redis'e taşıma opsiyonel
> bir iyileştirmedir (bkz. `REFACTOR.md`).

---

## 5. Kademeli Render (Streaming)

Sayfa tek seferde değil, iki aşamada gönderilir:

**Aşama 1 — Kritik (hemen):** Layout (Navbar/Footer), Hero (başlık, kısa açıklama),
Breadcrumb, `<head>` (title, meta, canonical).

**Aşama 2 — İkincil (streaming):** Zengin içerik, SSS, ilgili hizmet/blog, yorumlar.

**Kazanç:** Kullanıcı anında içerik görür (LCP düşer); Google botu tamamını görür (SEO bozulmaz).

**Uygulama araçları:** React Suspense + `loading.tsx`; `next/dynamic` ile ağır client
bileşenlerin lazy yüklenmesi; `DeferredHomeSection` gibi ertelenmiş bölümler.

---

## 6. Fallback İçerik Katmanları

İçerik 3 kaynaktan beslenir; biri yoksa sıradaki devreye girer:

```
1. DB (varsa)              → en zengin
2. Config (src/config/service-fallback.ts) → temel bilgi (başlık, kısa açıklama, anahtar kelimeler)
3. i18n (çeviriler)        → minimum metin (sadece başlık)
```

**Hedef davranış:**

- DB yok → Config devreye girer → sayfa **hâlâ anlamlı** (200).
- Config de yok → i18n → sayfa **hâlâ 200**.
- Slug config ve DB'de yok → **404**.

> **✅ KARAR (bağlayıcı):** Yukarıdaki 3 katmanlı fallback **kabul edilmiştir.** Amaç, DB
> erişilemediğinde dahi sayfanın **200 + anlamlı iskelet** dönmesidir. (Otomatik *içerik üretimi*
> değildir; yalnızca veri yokluğunda iskeleti kurtarır.)
>
> **[Durum — 15.10.2026]** Config fallback dosyası **vardır:** `src/config/service-fallback.ts`
> (11 ana hizmet; aynı zamanda "gerçekten var olan slug" allowlist'i — bkz. SEO.md §5.3). Akış:
> `resolveServicePage()` → DB → config → **404**; fallback sayfalar `noindex, follow` alır.
> **Açık iş (kalan):** lokasyon (il/ilçe) ve blog detay için config fallback henüz yok → bunlar
> hâlâ DB-only. Statik sayfalar `getPageMeta` + i18n fallback'ini kullanır. Sıra: `REFACTOR.md` §9.2.

---

## 7. İki Dinamik Master Motor

> **İsimlendirme notu:** `ServiceMaster` ve `BlogMaster` **kavramsal isimlerdir** — kod tabanında
> bu adlarda dosya **yoktur**. Karşılıkları:
>
> | Kavram | Gerçek dosya |
> |---|---|
> | `ServiceMaster` | `src/app/[locale]/(site)/hizmetler/[...slug]/page.tsx` |
> | `BlogMaster` | `src/app/[locale]/(site)/blog/[slug]/page.tsx` |
>
> "Master motor" terimi, bu iki catch-all rotanın *işlevsel* adıdır; soyut bir sınıf/dosya
> değildir. (`SEO.md` bu isimleri kullanmaz — kullanıyorsa da eşleme budur.)

### 7.1 Hizmetler & Lokasyon Motoru — Tek Catch-All `ServiceMaster`

- **Rota:** `hizmetler/[...slug]` — **tek catch-all**. `[sehir]` / `[ilce]` ayrı klasörleri **YOKTUR**.
- **Dosyalar:**
  - `src/app/[locale]/(site)/hizmetler/[...slug]/page.tsx` — Server: 1/2 segment çözümleme, alias slug → 308, metadata, `Service`/`BreadcrumbList`/`FAQPage` JSON-LD, topik otorite blog çekimi
  - `src/app/[locale]/(site)/hizmetler/[...slug]/error.tsx` — rota hata yakalayıcı
  - `src/app/[locale]/(site)/hizmetler/_components/ServicePageClient.tsx` — ana hizmet + il/ilçe **tek client şablonu** (eski `ServiceDistrictPageClient.tsx` bu dosyaya birleştirildi — 15.10.2026, %90 kod tekrarı kaldırıldı)
  - `src/app/[locale]/(site)/hizmetler/_components/WebDesignGuide.tsx` — rehber bloğu
- **Rota seviyeleri:** 1 segment → ana hizmet; 2 segment → il/ilçe (DB `location_type` ile ayrım).
- **Davranış:** Alias slug → **308**; bilinmeyen → `notFound()` (404, `source_type='manual'`/`template` indeks kararı `src/config/priority-locations.ts` + `src/lib/pages.ts`).
- **Tasarım:** Ana hizmet, il ve ilçe **birebir aynı** 3D cam tasarımı sunar.
- **Topik otorite:** hizmet altında DB'deki ilgili blog rehberleri listelenir.

### 7.2 Blog Motoru — `BlogMaster` (`blog/[slug]`)

- **Dosyalar:**
  - `src/app/[locale]/(site)/blog/[slug]/page.tsx` — Server: DB'den blog + metadata + 404/301 çözümleme
  - `src/app/[locale]/(site)/blog/post/BlogDetailServer.tsx` — Server: JSON-LD + render
  - `src/app/[locale]/(site)/blog/post/BlogPostClient.tsx` — Client: okuma deneyimi
- **Rota ayrımı:** Tek canlı detay rotası **`blog/[slug]/page.tsx`**'tir; ayrı ikinci bir blog
  rotası yoktur. `blog/post/` klasörünün iki farklı işlevi vardır:
  - `blog/post/BlogDetailServer.tsx` + `BlogPostClient.tsx` + `blog/post/components/*` →
    **paylaşılan bileşenlerdir**; `blog/[slug]/page.tsx` bunları `import … from
    "@/app/[locale]/(site)/blog/post/BlogDetailServer"` ile kullanır.
    Klasör adı yanıltıcıdır ama **silinmez**.
  - `blog/post/page.tsx` → **içerik üretmez**; yalnızca eski `?slug=` query'li URL'leri
    `/blog/<slug>`'a **301** yönlendirir (geriye uyumluluk, kasıtlı). İlgili legacy kontrolü
    `src/middleware-utils/index.ts` ve `src/scripts/bulk-create-redirects.ts` içinde de vardır.
    **Karar: korunacak — ölü dosya değildir.**
- **Veri sözleşmesi:** Blog detay sorgusu **`BLOG_BY_SLUG_SQL`** sabitinden tek kaynaktan gelir
  (`BLOG_POST_COLUMNS` + `BLOG_AUTHOR_COLUMNS`; `src/lib/blog/detail.ts`). Yazar kolonları
  (`author_nick`, `author_bio`, `author_linkedin_url`, …) ve schema alanları (`sameAs`,
  `citation`, `coverImageAlt`) **tamlır**. Eksik SELECT bulgusu kapatıldı → [`REFACTOR.md`](./REFACTOR.md) §6.
- **SEO:** `buildBlogPostMetadata()` (implementasyon `src/lib/blog/detail.ts`; `blog-post-page.ts` barrel'inden) → ortak motor `src/lib/seo-helpers.ts` → `buildPageMetadata()` (canonical her zaman `/blog/[slug]`).
- **Tasarım:** Kapak görseli, okuma süresi, yazar kartı, FeaturedSnippet, İçindekiler, Markdown tipografisi, otomatik iç bağlantı, ilgili yazılar, ilgili hizmet teklif kartı.
- **Diğer blog rotaları:** `blog/page.tsx` (liste + `BlogPageClient.tsx`, `blog/layout.tsx`, `blog/error.tsx`,
  `blog/components/*` → BlogCard/EmptyState); yazarlama: `blog/write/`, `blog/edit/`, `blog/my-posts/`
  (üçü de giriş korumalı — `isAuthenticated` yoksa `/login?callbackUrl=…`'e redirect).

---

## 8. Veri & SEO Mimarisi

### 8.1 Tablolar ve Sorumluluklar

| Tablo | Amaç | Kullanan |
|---|---|---|
| `services` | Hizmet içeriği + SEO (meta_title, meta_description, keywords, faq) | `/hizmetler/[...slug]` (1 segment) |
| `service_city_seo` | Şehir/il özel SEO (`ozel_meta_desc`, `lokal_giris`, `lokal_sss`) | `/hizmetler/[...slug]` (2 segment) |
| `pages` | CMS sayfaları (81 il + 100 stratejik ilçe havuzu) | `/hizmetler/[...slug]` (2 segment, customPage) |
| `blog_posts` | Blog SEO + içerik (eski forum içeriği de bu şablonda) | `/blog/[slug]` |
| `xip_dynamic_content` | Genel sayfa meta (`content_type='page_meta'`) | Tüm statik sayfalar |

### 8.2 Ortak SEO Motoru

Hangi tablodan beslenirse beslensin, meta/OG/canonical/robots üretimi **tek noktadan**:
`src/lib/seo-helpers.ts` → `buildPageMetadata()`. Ana sayfa ve `ServiceMaster` bunu
doğrudan, blog `buildBlogPostMetadata()` ile kullanır. Kod tekrarı yoktur.

### 8.3 `xip_dynamic_content` Anahtar Tablosu

| Anahtar | Sayfa |
|---|---|
| `home` | Ana sayfa (`/`) |
| `hakkimizda` | Hakkımızda |
| `contact` | İletişim |
| `references` | Referanslar |
| `istanbul-yazilim-sirketi` | İstanbul Yazılım Şirketi |
| `blog` | Blog listesi |
| `hizmetler` | Hizmetler hub |
| `privacy-policy` | Gizlilik Politikası |
| `terms-of-service` | Kullanım Şartları |
| `cookie-policy` | Çerez Politikası |
| `login` | Giriş |
| `register` | Kayıt |
| `odeme` | Ödeme |
| `maintenance` | Bakım sayfası (`maintenance/layout.tsx`) |

> **Not:** Anahtar = `xip_dynamic_content.category` alanı (`content_type='page_meta'`).
> `getPageMeta(key)` çağrısı yapan her sayfanın anahtarı tabloda listelenir.

---

## 9. Sabit Kurumsal Sayfalar

| # | Sayfa | Rota | SEO Kaynağı |
|---|---|---|---|
| 1 | Ana Sayfa | `/` | `getPageMeta("home")` + fallback |
| 2 | Hakkımızda | `/hakkimizda` | `getPageMeta("hakkimizda")` |
| 3 | İletişim | `/contact-us` | `getPageMeta("contact")` |
| 4 | Teklif (token linki) | `/teklif/[token]` | — (noindex; `X-Robots-Tag` next.config) |
| 5 | Referanslar | `/references` | `getPageMeta("references")` |
| 6 | Gizlilik Politikası | `/privacy-policy` | `getPageMeta("privacy-policy")` |
| 7 | Kullanım Şartları | `/terms-of-service` | `getPageMeta("terms-of-service")` |
| 8 | Çerez Politikası | `/cookie-policy` | `getPageMeta("cookie-policy")` |
| 9 | Ürünler | `/urunler` | Liste sayfası — tek URL, alt sayfa YOK |
| 10 | İstanbul Yazılım | `/istanbul-yazilim-sirketi` | `getPageMeta("istanbul-yazilim-sirketi")` |
| 11 | Sitemap & Robots | `/sitemap.ts`, `/robots.ts` | DB'den dinamik |
| 12 | Hata & Güvenlik | `/not-found.tsx`, `/erisim-yok` | — (noindex) |

> **KESİN KURAL:** `/urunler/[slug]` gibi ürün alt sayfaları **YOKTUR**. Tek `/urunler` liste
> sayfası kullanılır; sitemap'e yalnızca bu girer.

### 9.1 Tasarım Sistemi (Dondurulmuş Görsel Standart)

- **Zemin & Renkler:** Obsidian uzay siyahı (`#050811`, `#070b16`), Neon Mor (`#9d72ff`, `#8b5cf6`), Cyan glow (`#ddd6fe`).
- **Liquid Glass:** `backdrop-filter: blur(28px)`, yarı şeffaf kartlar (`rgba(255,255,255,0.02)`), zarif kenarlıklar (`rgba(255,255,255,0.06)`), radial mor/cyan hover.
- **Tipografi:** Geist Variable / GeistPixel başlıklar, Inter gövde, JetBrains Mono rozetler.
- **Global katmanlar:** `SiteStarfield` (3D yıldız arka planı), `Navbar`, `Footer`, `TeklifModal`.

### 9.2 Diğer Canlı Rotalar

§9 tablosundaki kurumsal sayfaların dışında kalan canlı rotalar (15.10.2026 durumu):

| Rota | Dosya | SEO / Not |
|---|---|---|
| `/hizmetler` | `hizmetler/page.tsx` + `HizmetlerHubClient.tsx` | `getPageMeta("hizmetler")` — hub |
| `/hizmetler/[...slug]` | `hizmetler/[...slug]/page.tsx` | ServiceMaster — bkz. §7.1 |
| `/blog` | `blog/page.tsx` + `BlogPageClient.tsx` | `getPageMeta("blog")` — indexlenir |
| `/blog/[slug]` | `blog/[slug]/page.tsx` | BlogMaster — bkz. §7.2 |
| `/blog/post?slug=` | `blog/post/page.tsx` | İçerik üretmez; `/blog/<slug>`'a **301** (bkz. §7.2) |
| `/blog/write`, `/blog/edit`, `/blog/my-posts` | ilgili `page.tsx` | Giriş korumalı + `noindex` (yazarlama) |
| `/x/[nick]` | `x/[nick]/page.tsx` | Yazar profili; `Person` JSON-LD var ama **`noindex`** (SEO.md M3/§6.2 ile açık çelişki) |
| `/x/edit` | `x/edit/page.tsx` | Profil düzenleme (korumalı) + `noindex` |
| `/login` | `login/page.tsx` | `getPageMeta("login")` + `noindex` |
| `/register` | `register/page.tsx` | `getPageMeta("register")` + `noindex` |
| `/odeme` | `odeme/page.tsx` | `getPageMeta("odeme")` + `noindex` |
| `/maintenance` | `maintenance/page.tsx` + `maintenance/layout.tsx` | `getPageMeta("maintenance")` + `noindex` |
| `/s/[code]` | `s/[code]/route.ts` | Kısa link yönlendirme (`short_links.click_count`); sayfa değil, route handler |
| `/x`, `/teklif` (kök) | **page yok** | **Sayfa üretmez.** `/x/<nick>` yoksa 404. `/teklif` kökü de 404 verir; buna rağmen Navbar/Hero/PageTemplate/HomePageComponents `/teklif`'e **link verir** (CTA modalı JS ile açılıyor; href fallback'i boş) → ⚠️ **eksik rota** (bkz. aşağıdaki not) |
| `/erisim-yok`, `/sitemap.xml`, `/robots.txt` | `src/app/` (locale dışı) | §9 #11–12 ile birlikte |

> **Not:** `robots.ts` disallow listesi `noindex` sayfalarıyla uyumludur: `/teklif`, `/odeme`,
> `/login`, `/register`, `/x/edit`, `/blog/write|edit|my-posts`, `/maintenance`.
>
> **[Durum — açık bulgu]** `/teklif` için **sayfa veya redirect yoktur** (`src/app/[locale]/(site)/teklif/`
> altında yalnızca `[token]/page.tsx` vardır; `next.config.mjs`'te yalnızca `X-Robots-Tag` header
> kuralı, redirect yok). Buna karşın `Navbar` (2 yer), `Hero`, `PageTemplate` ve
> `HomePageComponents` `href="/teklif"` linkleri verir → bu linkler **404**'e gider. Öneri:
> `/teklif` için ince bir yönlendirme sayfası (`/contact-us`'a 301) veya modal tetikleyen bir
> route eklenmeli. Takip: `REFACTOR.md` §9.2.

> **Kaldırılan rotalar:** `/how-to` ve `/how-to-develop-setup` uygulamadan silinmiştir.
> Bu URL'ler artık uygulama rotası değildir; footer, robots, yönlendirme doğrulaması ve
> noindex header yapılandırmalarında kullanılmaz.

---

## 10. Forum Kaldırıldı & Legacy URL Kararları

### 10.1 Forum artık yok (fiziksel olarak kaldırıldı)

- Canlı forum bölümü **YOKTUR**: `/forum` rotası, `forum/*` sayfaları ve `src/lib/forum.ts`
  **tamamen silindi**; yeniden oluşturulmayacak.
- Eski forum içeriği `blog_posts` tablosuna taşınmıştır. Ölü tablolar
  (`threads`, `basliklar`, `cevaplar`, `bolumler`, `linkler`) = **0 satır**.
- Sitemap ve içerik API'sine forum girmez.

### 10.2 Eski forum linkleri → DB'den blog (301)

`/forum`, `/forum/<kategori>`, `/forum/<kategori>/<slug>` (+ `.html`, `.html.html`):
`src/middleware-utils/legacy-forum.ts` → son segment yayınlanmış `blog_posts.slug` ile
eşleşirse **301 → `/blog/<slug>`**, eşleşmezse **301 → `/blog`**. WordPress `-<sayı>`
soneki tolere edilir (`src/lib/slug-candidates.ts`).

### 10.3 Legacy WordPress taksonomi → 301

`/category/...`, `/tag/...`, `/author/...`, `/page/...`, `/feed`, `/comments/feed` →
**301 → `/blog`**.

> **Neden 410 değil?** GSC 410'u da "Bulunamadı (404)" sekmesinde raporlar. 301 → `/blog`,
> GSC'de "Yönlendirmeli sayfa" (kabul edilebilir) olarak görünür. Bilinçli mimari karardır.
> `DELETED_PATH_SET` (410 Gone) altyapısı ileride kalıcı silinen içerik için korunur; liste boştur.

---

## 11. Sitemap Kuralları

| Kaynak | Tablo | Koşul |
|---|---|---|
| `/hizmetler/<hizmet>` | `services` | `is_active = true` |
| `/hizmetler/<hizmet>/<konum>` | `pages` | `status = published` (81 il + 100 ilçe) |
| `/hizmetler/<hizmet>/<konum>` | `service_city_seo` | `is_indexed = true` + `lokal_giris >= 200 karakter` |
| `/blog/[slug]` | `blog_posts` | `status = published` |
| `/urunler` | Tek statik URL | Alt sayfa sitemap'e girmez |

> **NOT:** Forum bölümü kaldırıldı; sitemap'e forum URL'i **girmez**. Legacy forum linkleri
> middleware'de 301 ile `/blog/<slug>`'a bağlanır.

---

## 12. Klasör Adı Kanonikleri

| Kavram | Gerçek klasör adı |
|---|---|
| Hizmet + şehir/ilçe | **`[...slug]`** — tek catch-all (`ServiceMaster`); 1. ve 2. segment aynı dosyada ayrıştırılır |
| Blog yazısı | `[slug]` — BlogMaster (`blog/[slug]`) |

> **15.10.2026:** Eski iki-klasör yapısı (`hizmetler/[slug]` + `hizmetler/[slug]/[sehir]`)
> **silindi**. `[ilce]` adı hiç kullanılmadı; il/ilçe ayrımı `[...slug]` içinde DB
> `location_type` ile yapılır. Client bileşenler `hizmetler/_components/` altındadır
> (private klasör — rota segmenti değildir).

---

## 13. Dosya/Klasör Hedefi & Dosya Sayısı

> **Ölçüm (15.10.2026):** `src/` altında **385 dosya · ~46.286 satır**.

**Temel ilke:** Sıfır kod tekrarı / minimum dosya. Dağınık onlarca dosya ve iç içe klasör
yerine **2 dinamik master motor** (`ServiceMaster`, `BlogMaster`) kuruldu.

**Hedef yapı (özet):**

```
src/lib/
  db/           pool, services, service-city, references, admin-2fa, types   (barrel: database.ts)
  redis/        client, blog-cache                                          (barrel: redis.ts)
  blog/         slug, pagination, mutations, content, detail                (barrel'ler korunur)
  pages/        location, published, hash, sql                              (sayfa/lokasyon sorguları)
  content/      auth, ssrf, validation, lexical, response, request-guard, handlers/*  (barrel: content-api.ts)
  schema/       shared, blog, person, site                                  (barrel: schema-helpers.ts)
  seo/          internal-linking, page-audit, audit-store                   (barrel: seo-audit.ts)
```

**Barrel kuralı:** Büyük refactor'larda genel import yolu (`@/lib/database` vb.) **bozulmaz**;
dosya içeride bölünür, dışarıya barrel ile aynı yüzey sunulur.

**Dosya sayısı hedefi:** Mevcut 385 → hedef **~250** (ölü kod temizliği + bileşen birleştirme).
Takip: `REFACTOR.md` §10.

> **[Durum — 15.10.2026]** `ServicePageClient` ↔ `ServiceDistrictPageClient` birleştirmesi
> **tamamlandı**: il/ilçe şablonu `ServicePageClient.tsx` içine alındı (tek dosya, 618 satır;
> tekrar eden FeatureCard/ProcessStep/PackageCard/FaqItem/CTA blokları tek şablondan gelir).
> **Kalan açık iş:** `HizmetlerHubClient.tsx` (405 satır) ve `WebDesignGuide.tsx` (196 satır)
> hâlâ **sabit içerik** taşır; config/DB'ye taşınmalıdır. Takip: `REFACTOR.md` §9.2.

---

## 14. Güvenlik Katmanları

| Katman | İçerik |
|---|---|
| Edge/Headers | HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, CSP |
| Middleware | Trailing slash & host normalizasyonu, noindex (non-tr), güvenlik başlıkları, IP-block |
| API guard | Rate-limit (Redis), `X-Bot-Key` auth, payload limiti, JSON şema doğrulama, SSRF koruması |
| Admin | `ADMIN_EMAIL` eşleşmesi + Telegram 2FA (fail-closed), JWT/CSRF secret |
| İçerik | `isSafeExternalUrl` (SSRF), `sanitizeHTML`/DOMPurify |

**Header çelişkisi çözümü:** `X-Frame-Options` tek değerde (`DENY`) birleştirildi (config + CSP
`frame-ancestors 'none'`).

---

*Bu belge mimari kararların tek kaynağıdır. Kod değişikliklerinin kaydı `REFACTOR.md`'de,
SEO kararlarının kaydı `SEO.md`'de tutulur.*
