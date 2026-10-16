# XipSoft — Refactor

> **Amaç:** Kod tabanının **refactor geçmişi, modül durumu ve kalan işlerini** tek kaynaktan
> izlemek. Kod tabanı modül modül **Single Responsibility Principle (SRP)** ve **DRY** açısından
> incelenir; bulgular ve uygulama kaydı burada tutulur.
> **Kapsam:** `src/` altındaki **381 dosya · ~45.845 satır** (ölçüm: 15.10.2026).
> **Dil:** Türkçe
> **Yöntem:** Statik kod analizi + import/kullanım taraması.
> **İlişkili belgeler:** Mimari kararlar → [`MIMARI.md`](./MIMARI.md) · SEO stratejisi → [`SEO.md`](./SEO.md)
>
> **Uygulama politikası:** Rapor yazılır → kullanıcı onayı → refactor adım adım uygulanır
> (her adım sonrası `tsc --noEmit` + ESLint + `next build`).

**İçindekiler**
1. [Modül Haritası](#1-modül-haritası)
2. [Genel İlkeler](#2-genel-ilkeler)
3. [Mimari Kararlar](#3-mimari-kararlar)
4. [Modül 01 — Veri Katmanı](#4-modül-01--veri-katmanı)
5. [Modül 02 — İçerik API](#5-modül-02--içerik-api)
6. [Modül 03 — Blog Yardımcıları](#6-modül-03--blog-yardımcıları)
7. [Modül 04 — Sayfa & Yerel SEO](#7-modül-04--sayfa--yerel-seo)
8. [Modül 05 — SEO Yardımcıları](#8-modül-05--seo-yardımcıları)
9. [Kalan İşler (TODO)](#9-kalan-işler-todo)
10. [Dosya Sayısı Takibi](#10-dosya-sayısı-takibi)

---

## 1. Modül Haritası

| # | Modül | Ana dosyalar | Durum |
|---|-------|--------------|-------|
| 01 | Veri Katmanı | `lib/database.ts` (barrel), `lib/db/*`, `lib/redis.ts` (barrel), `lib/redis/*` | ✅ Adım 1–5 |
| 02 | İçerik API | `lib/content-api.ts` (barrel), `lib/content/*`, `app/api/content/*`, `app/api/bot/route.ts` | ✅ Adım 1–5 |
| 03 | Blog Yardımcıları | `lib/post-helpers.ts`, `lib/blog-post-page.ts`, `lib/blog/*` | ✅ Adım 1–4 |
| 04 | Sayfa & Yerel SEO | `lib/pages.ts`, `lib/pages/*`, `lib/services-hub.ts`, `lib/page-content.ts`, `config/priority-locations.ts` | ◐ DB-only (mevcut) → fallback iskelet hedefi |
| 05 | SEO Yardımcıları | `lib/seo-helpers.ts`, `lib/schema/*`, `lib/seo/*`, `app/sitemap.ts`, `app/robots.ts` | ✅ Adım 1 + 3; ◐ Adım 2 |
| 06 | Yönlendirme & Middleware | `lib/redirect-handler.ts`, `lib/redirect-utils.ts`, `middleware-utils/*`, `middleware.ts` | ⬜ |
| 07 | Güvenlik & Auth | `lib/api-guard.ts`, `lib/security*.ts`, `lib/rate-limit.ts`, `lib/turnstile.ts`, `lib/auth-*.ts`, `lib/telegram*.ts`, `lib/admin-2fa-config.ts` | ⬜ |
| 08 | Diğer Çekirdek | `lib/notifications.ts`, `lib/site-url.ts`, `lib/brand-color.ts`, `lib/file-validation.ts`, `lib/auction-engine.ts` | ⬜ |
| 09 | Server Actions — Blog & İçerik | `app/_actions/blog-actions.ts`, `admin-blog-actions.ts`, `admin-page-content-actions.ts`, `privacy-actions.ts` | ⬜ |
| 10 | Server Actions — Admin | `app/_actions/admin-*.ts` | ⬜ |
| 11 | Server Actions — Auth/SEO/Teklif/Upload/User | `app/_actions/auth/*`, `seo-actions.ts`, `teklif-actions.ts`, `upload-actions.ts`, `user-actions.ts` | ⬜ |
| 12 | API — Admin | `app/api/admin/*` | ⬜ |
| 13 | API — Cron/Diğer | `app/api/cron/*`, `teklif`, `telegram`, `track`, `status`, `revalidate`, `blog/feed.xml` | ⬜ |
| 14 | Site — Ana Sayfa & Landing | `(site)/page.tsx`, `components/Landing/*`, `components/MSE/*` | ⬜ |
| 15 | Site — Hizmetler | `(site)/hizmetler/*` | ⬜ |
| 16 | Site — Blog | `(site)/blog/*`, `components/Blog/*` | ⬜ |
| 17 | Site — Profil `/x/*` | `(site)/x/*` | ⬜ |
| 18 | Site — Statik Sayfalar | hakkımızda, iletişim, gizlilik, şartlar, cookie, referanslar, how-to, istanbul-yazilim-sirketi | ⬜ |
| 19 | Site — Auth/Teklif/Ödeme | login, register, odeme, teklif, erisim-yok | ⬜ |
| 20 | Admin Panel — Genel | monitoring, security, seo, redirects, automation, settings | ⬜ |
| 21 | Admin Panel — CMS & İçerik | cms/*, blog, hizmetler, faq, orders, media | ⬜ |
| 22 | Ortak Bileşenler & Scriptler & Config | `components/*`, `scripts/*`, `config/*`, `i18n/*`, kök config | ⬜ |

**Durum işaretleri:** ⬜ başlanmadı · 🔄 raporlandı · ◐ kısmen uygulandı · ✅ uygulandı

---

## 2. Genel İlkeler

1. **Tek Sorumluluk (SRP):** Bir dosya/bileşen tek bir iş yapmalı. Birden çok "eski dosya"
   birleşiminden oluşan mega dosyalar bölünür.
2. **DRY:** Aynı işi yapan fonksiyonlar/sorgular tek merkezde toplanır.
3. **Ölü Kod:** Hiçbir yerden çağrılmayan export'lar tespit edilip kaldırılır.
4. **Barrel & Uyumluluk:** Büyük refactor'larda genel import yolu (`@/lib/database` vb.)
   **bozulmaz**; dosya içeride bölünür, dışarıya barrel ile aynı yüzey sunulur.
5. **Doğrulama:** Her uygulama adımından sonra `tsc --noEmit` + ESLint (+ `next build`).

---

## 3. Mimari Kararlar

> **📌 15.10.2026 — Tüm modülleri etkiler:**

1. **Forum fiziksel olarak yok:** `/forum` rotası, `forum/*` sayfaları ve `src/lib/forum.ts`
   **tamamen silindi**; yeniden oluşturulmayacak. Eski forum linkleri middleware'de
   (`src/middleware-utils/legacy-forum.ts`) slug eşleşirse **301 → `/blog/<slug>`**,
   eşleşmezse **301 → `/blog`**.
2. **Yerel sayfa üretimi İPTAL:** Kod tarafında otomatik/dinamik içerik üretimi durduruldu
   (`local-page-generator.ts` vb. silindi). Gösterilen içerik yalnızca DB'deki **81 il +
   100 stratejik ilçe** (~1.400 `pages` kaydı) ile sınırlıdır (bkz. §7).
3. **Hizmet rotası birleşmesi:** `hizmetler/[slug]` + `hizmetler/[slug]/[sehir]` → tek
   catch-all **`hizmetler/[...slug]/page.tsx` (`ServiceMaster`)**; ayrı `[sehir]`/`[ilce]`
   klasörleri yoktur.
4. **Merkezî SEO motoru:** Tüm meta/OG/canonical/robots üretimi `src/lib/seo-helpers.ts` →
   `buildPageMetadata()` üzerinden; blog için `buildBlogPostMetadata()` (`lib/blog/detail.ts`)
   bunun üzerine kuruludur.
5. **Header çelişkisi:** `X-Frame-Options` tek değerde (`DENY`) birleştirildi; ölü `@/seobot/*`
   alias'ları `next.config.mjs`'ten kaldırıldı; eksik cron env değişkenleri `.env.example`'a eklendi.
6. **Şablon–içerik ayrımı + fallback KABUL EDİLDİ:** Sayfa iskeleti DB'den bağımsız render
   edilir; içerik **DB → config → i18n** sırasıyla doldurulur. DB erişilemediğinde
   hizmet/lokasyon/blog sayfaları **404 yerine 200 + iskelet** dönmelidir (bkz. §7 Modül 04 +
   §9.2). Otomatik *içerik üretimi* iptal kalır; **fallback iskelet** ondan farklıdır.
7. **Blog detay veri sözleşmesi (tamamlandı):** Eksik SELECT kolonları düzeltildi; liste ve
   detay sorguları **tek SQL sabiti `BLOG_BY_SLUG_SQL`**'e indirildi
   (`BLOG_POST_COLUMNS` + `BLOG_AUTHOR_COLUMNS`, `src/lib/blog/detail.ts`).
   Ayrıntı ve bulgu kaydı: [§6 Modül 03](#6-modül-03--blog-yardımcıları). Etkilenen belge
   notları: [`MIMARI.md`](./MIMARI.md) §7.2 · [`SEO.md`](./SEO.md) §4.3.
8. **Blog rota yapısı:** Tek canlı detay rotası `blog/[slug]/page.tsx`'tir.
   `blog/post/page.tsx` yalnızca eski `?slug=` URL'lerini **301** ile `/blog/<slug>`'a taşır;
   `blog/post/BlogDetailServer.tsx` + `BlogPostClient.tsx` + `blog/post/components/*` ise
   **paylaşılan bileşenlerdir**. `blog/post/` klasörü silinmez. → [`MIMARI.md`](./MIMARI.md) §7.2.

---

## 4. Modül 01 — Veri Katmanı

> **Dosyalar:** `src/lib/database.ts` (barrel, ~33 satır), `src/lib/db/*` (pool, admin-2fa,
> services, service-city, references, types), `src/lib/redis.ts` (barrel), `src/lib/redis/*`
> **Durum:** ✅ Adım 1 + 2 + 3 + 4 + 5 uygulandı

**Amaç:** DB bağlantı havuzu yönetimi, Redis cache istemcisi ve domain sorguları.

### Ana bulgular

- **SRP ihlali (başlangıç):** `database.ts` (1724 satır) 16 ayrı domain'i barındırıyordu; 71 dosya import ediyordu. → `src/lib/db/*`'a bölündü, `database.ts` barrel'e indirildi (dış import yüzeyi korundu).
- **Ölü kod:** `error_logs` CRUD, `verification_tokens`, `products`, `visitors` (yazma+okuma), `references` yazma fonksiyonları, gereksiz alias'lar (`getServiceSlugsWithDistricts`, `getRawServiceFromDB`), `transaction`, `upsertServiceCityData`, `getPublishedServiceCities` → tamamı silindi (kanıtlı ölü).
- **DRY:** `DBPool`/`MockPool` `updateStats`/`getStats` gövdeleri `applyHealthUpdate`/`statsSnapshot` yardımcılarına çıkarıldı; Redis get/set JSON deseni (11 tekrar) jenerik `cacheGet/Set/Del/Keys` ile tekleştirildi.
- **Gizli bug:** `isWriteQuery` regex'inde `gRANT`/`BEgIN` casing hatası (hiç eşleşmiyordu → read pool'a düşme riski) düzeltildi; `RETURNINg`/`gROUP`/`BEgIN` → `RETURNING`/`GROUP`/`BEGIN`.

### Uygulama kaydı

- [x] **Adım 1 — `db/*` bölme + barrel** ✅ — `db/` (pool, errors, verification, admin-2fa, products, services, service-city, visitors, references, types); `database.ts` → 33 satır barrel; `redis/` (client, blog-cache) + `redis.ts` barrel.
- [x] **Adım 2 — Ölü kod silme** ✅ — errors, verification, products, visitors; references yazma; alias'lar; `ProductListItem`.
- [x] **Adım 3 — Health helper DRY** ✅ — `applyHealthUpdate`, `statsSnapshot`.
- [x] **Adım 4 — `isWriteQuery` + SQL casing** ✅ — `GRANT`/`REVOKE`/`BEGIN`/`COMMIT`/`ROLLBACK`.
- [x] **Adım 5 — `redis/*` bölme + generic cache** ✅ — `cacheGet/Set/Del/Keys`, ölü session/home-cache silindi.

---

## 5. Modül 02 — İçerik API

> **Dosyalar:** `src/lib/content-api.ts` (barrel), `src/lib/content/*` (auth, ssrf, validation,
> lexical, response, constants, request-guard, handlers/*), `app/api/bot/route.ts`,
> `app/api/content/route.ts`, `app/api/content/update/route.ts`, `app/api/revalidate/locations/route.ts`
> **Durum:** ✅ Adım 1–5 uygulandı

**Amaç:** Dış otomasyon/botların içeriği güvenli biçimde DB'ye yazması (auth, rate-limit, payload
limiti, şema doğrulama, upsert, cache/ISR tazeleme).

### Ana bulgular

- **SRP ihlali (başlangıç):** `content-api.ts` (1253 satır) auth + SSRF + doğrulama + Lexical
  serileştirme + 5 ingest handler'ı barındırıyordu. → `src/lib/content/*`'a bölündü + barrel.
- **DRY:** Rota ön-yüzü 7 kez tekrar ediyordu (`getClientIp → rate-limit → auth → payload → json`)
  → ortak `guardContentApiRequest`. `NextResponse.json({success:false,...})` ~15 kez inline
  → ortak `fail()`. `isPlainRecord` birleştirildi.
- **Güvenlik/sertleştirme:** auth sırası standartlaştırıldı; `/api/revalidate/locations`'a
  rate-limit + payload guard eklendi; `checkPayloadSize` eksik `Content-Length` (chunked)
  durumunu reader ile ölçüyor; tablo adı `blog_posts` casing düzeltildi.
- **Batch:** `handlePageIncont` HTTP'den bağımsız `pageIngestCore()` çekirdeğine ayrıldı; batch
  `NextResponse.json()` round-trip'i yerine çekirdeği doğrudan çağırıyor.

### Uygulama kaydı

- [x] **Adım 1 — `content/*` bölme + barrel** ✅
- [x] **Adım 2 — Ortak request guard (D1/B1)** ✅
- [x] **Adım 3 — `fail()`/`isPlainRecord`/ölü kod** ✅
- [x] **Adım 4 — Güvenlik sertleştirme (B2/B3/B4)** ✅
- [x] **Adım 5 — Batch core** ✅

---

## 6. Modül 03 — Blog Yardımcıları

> **Dosyalar:** `src/lib/post-helpers.ts` (barrel), `src/lib/blog-content.ts` (barrel),
> `src/lib/blog-post-page.ts` (barrel), `src/lib/blog/*` (slug, pagination, mutations, content, detail),
> `src/lib/blog-slug.ts`, `src/lib/slug-candidates.ts`
> **Durum:** ✅ Adım 1–4 uygulandı

**Amaç:** Blog yazıları için paylaşılan sunucu yardımcıları (slug, sayfalama, içerik metni, detay
veri çözümleme + metadata).

### 🔴 Kritik bulgu (kapatıldı) — Eksik SELECT kolonları

`getCachedDbBlogBySlug` sorgusu, `DbBlogRow` tipinin bildirdiği birçok kolonu seçmiyordu
(`author_nick`, `citations`, `cover_image_alt`, `author_bio`, `author_linkedin_url`, …). Sonuç:
yazar linki (`/x/<nick>`), schema `sameAs`/`citation` (E-E-A-T) ve `coverImageAlt` kayboluyordu.
**Çözüm:** `BLOG_POST_COLUMNS` + `BLOG_AUTHOR_COLUMNS` + `BLOG_BY_SLUG_SQL` sabitleri eklendi;
liste (`blog-actions`) ile detay tek SQL sabitine indirildi.

### Diğer bulgular

- **SRP:** `post-helpers` (slug+sayfalama+mutasyon), `blog-post-page` (tip+slug+DB+cache+serialize+metadata) karışıktı → `src/lib/blog/*`'a bölündü.
- **DRY / casing:** `ALLOWED_TABLES` tek whitelist (`blog_posts`) + `assertAllowedTable`; `normalizeBlogSlug` tek kaynak (`src/lib/blog-slug.ts`); `baseSlug()` ortak.
- **Temizlik:** `buildPaginatedResult` gereksiz `async` kaldırıldı; ölü whitelist girdileri silindi; `getDbBlogBySlug` hata sözleşmesi belgelendi (yok → `null`; altyapı hatası → log + `throw`).

---

## 7. Modül 04 — Sayfa & Yerel SEO

> **Dosyalar:** `src/lib/pages.ts`, `src/lib/pages/*`, `lib/service-manager.ts`,
> `lib/services-hub.ts`, `lib/page-content.ts`, `src/config/priority-locations.ts`
> **Kaldırılan:** `local-page-generator.ts`, `generator-worker.ts`, `src/lib/local-pages/*`
> **Durum:** ◐ Otomatik yerel içerik üretimi iptal (kodda DB-only çalışıyor) → **hedef: fallback iskelet** · rota: `hizmetler/[...slug]` catch-all

**Mevcut ilke (kodda):** "Sadece DB'de varsa göster." Hizmet×konum geçerlilik:

1. `pages` tablosunda yayınlanmış, manuel (`source_type='manual'`) CMS sayfası → göster (PageTemplate)
2. `service_city_seo` tablosunda gerçek, özgün satır → göster
3. Hiçbiri yoksa → **404** (şu an; otomatik üretim YOK)

**Kapsam:** 81 il + 100 stratejik ilçe (~1.400 `pages` kaydı). Diğer ilçeler il sayfasına
yönlendirilir.

**Kaldırılan dosyalar/scriptler:** `local-pages/{variation,templates,defaults,content,indexing,backfill,bulk}.ts`,
`bulk-seo-pages-generator.ts`, `generate-province-pages.ts`, `backfill-local-content.ts`,
`migrate-local-pages.ts`, `local-seo-architecture-revision.ts`, `enrich-priority-pages.ts`.

> **✅ KARAR (kabul edildi):** Otomatik *içerik üretimi* iptal kalır; ancak DB erişilemediğinde
> sayfa **404 dönmemeli**, **200 + iskelet + config fallback** dönmelidir (bkz. `MIMARI.md` §3/§6).
> "Otomatik üretim yok" ile "fallback iskelet var" çelişmez: fallback, veri yokluğunda kullanıcıya
> ve bota anlamlı iskelet sunar; **uydurma özgün içerik üretmez**.

---

## 8. Modül 05 — SEO Yardımcıları

> **Dosyalar:** `src/lib/schema-helpers.ts` (barrel), `src/lib/schema/*` (shared, blog, person, site),
> `src/lib/seo-audit.ts` (barrel), `src/lib/seo/*` (page-audit, audit-store, internal-linking),
> `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/slug-candidates.ts`
> **Durum:** ✅ Adım 1 + 3 uygulandı; ◐ Adım 2 (D2 açık); Adım 4 (performans) bekliyor

**Amaç:** schema.org JSON-LD üretimi, sayfa denetimi, iç bağlantı enjeksiyonu, sitemap/robots,
WordPress uyumlu slug çözümleme.

### Bulgular

- **Ölü kod:** `softwareApplicationSchema`, `itemListSchema`, `serviceSchema` (fn), `howToSchema`
  + bağlı `buildRating`/`buildReviews`/`ReviewInput`/`AggregateRatingInput`; `getPageAudit`,
  `getBulkAuditResults`; `slugMatchesSet` → silindi.
- **DRY:** İkiz şemalar (`profilePageSchema`=`personSchema`, `faqPageSchema`=`faqSchema`) kaldırıldı;
  `sitemap.ts`'e `toEntry()` + `SitemapEntry` eklendi.
- **SRP:** `schema-helpers.ts` → `src/lib/schema/*`; `seo-audit.ts` → `src/lib/seo/*` (barrel'ler dış yüzeyi korur).

### Uygulama kaydı

- [x] **Adım 1 — Ölü kod temizliği** ✅
- [~] **Adım 2 — Alias + DRY** ◐ (D1 ✅, D4 ✅, D2 ⏳: Organization düğümü ortak sabite alınmadı — biçim farklı, davranış riski)
- [x] **Adım 3 — SRP bölme + barrel** ✅
- [ ] **Adım 4 — Performans** (P3/P4)

---

## 9. Kalan İşler (TODO)

### 9.1 Modül 05 açık
- [ ] **Adım 4 — Performans:** `injectInternalLinks` regex'lerini önceden derle (P3); `checkDuplicateHash` toplu sorgu (P4).
- [ ] **Adım 2 (D2):** `schema-helpers` Organization/publisher düğümünü ortak sabite alma kararı.

### 9.2 Mimari — kabul edilen hedefler (sırayla uygulanacak)

> **Karar verildi** (bkz. §3.6). Uygulama sırası:

- [ ] **1. Config fallback iskeleti (kalan: lokasyon + blog):** Hizmet detay için **tamam ✅**
      (`config/service-fallback.ts` + `resolveServicePage`: DB → config → 404, fallback
      `noindex, follow`). Kalan: lokasyon (il/ilçe) ve blog detay 200 + iskelet. (bkz. `MIMARI.md` §3, §6)
- [x] **2. Bileşen tekrarını kaldır:** `ServiceDistrictPageClient` → `ServicePageClient` içine
      birleştirildi; il/ilçe + ana hizmet tek şablon (618 satır). ✅
- [ ] **3. Sabit içeriği taşı:** `HizmetlerHubClient` (hero/istatistik/CTA) + `WebDesignGuide` → config/DB.
- [x] **4. Belge adı düzeltmesi:** Koddaki 14 `ARCHITECTURE.md` referansı `MIMARI.md`'ye çevrildi. ✅
- [ ] **5. Eksik `/teklif` rotası:** `Navbar` (2), `Hero`, `PageTemplate`, `HomePageComponents`
      `href="/teklif"` verir ama sayfa/redirect yok → **404**. Çözüm: `/teklif` → `/contact-us`
      301 veya CTA modalını açan ince sayfa. (bkz. `MIMARI.md` §9.2)
- [ ] **Redis yaygınlaştırma:** Hizmet/lokasyon içeriğinin `unstable_cache` yanında Redis ile
      önbelleklenmesi (opsiyonel performans).

### 9.3 Modül 06–22 (başlanmadı)
- [ ] Modül 06 — Yönlendirme & Middleware
- [ ] Modül 07 — Güvenlik & Auth
- [ ] Modül 08 — Diğer Çekirdek
- [ ] Modül 09–11 — Server Actions
- [ ] Modül 12–13 — API (Admin, Cron/Diğer)
- [ ] Modül 14–19 — Site sayfaları (Ana sayfa, Hizmetler, Blog, Profil, Statik, Auth)
- [ ] Modül 20–22 — Admin Panel, Ortak Bileşenler & Config

> Her modül için yöntem: statik analiz → bulgular (SRP/DRY/ölü kod/perf) → uygulama sırası
> → onay → adım adım uygulama → `tsc` + ESLint + build.

---

## 10. Dosya Sayısı Takibi

| Tarih | `src/` dosya | Satır | Not |
|---|---|---|---|
| (başlangıç kaydı) | 342 | ~47.000 | İlk analiz kapsamı |
| 15.10.2026 | **381** | **~45.845** | Modül 01–05 refactor sonrası (yeni barrel/parça dosyalar; ölü kod silindi) |
| 15.10.2026 | **385** | **~46.286** | Config fallback (`service-fallback.ts`) + `ServiceDistrictPageClient` birleştirmesi sonrası |
| **Hedef** | **~250** | — | Ölü kod temizliği + bileşen birleştirme |

> **Not:** Dosya sayısı, barrel + SRP bölme nedeniyle geçici olarak artabilir; asıl metrik
> **ölü kod oranı** ve **ortalama dosya boyutudur**. Hedef, tek sorumluluk + minimum tekrar.

---

*Bu belge kod refactor geçmişinin ve kalan işlerin tek kaynağıdır. Mimari kararlar
`MIMARI.md`'de, SEO kararları `SEO.md`'de tutulur.*
