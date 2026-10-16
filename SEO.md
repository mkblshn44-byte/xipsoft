# XipSoft — Sadeleştirme Planı + Düzeltilmiş SEO Rehberi

> **Amaç:** (1) Projeyi daha az dosya ve daha az kodla aynı işi yapacak hale getirmek, (2) SEO belgesini doğru, kısa ve kodla uyumlu tek rehbere indirmek.
> **Kural:** Bu belge sadece plandır, kod içermez. Her adımdan sonra `build` + sitemap/robots/404 kontrolü yapılır.
> **Not:** "Doğrula" etiketli maddeler uygulanmadan önce gerçek koda bakılmalıdır. Google davranışına dair ifadeler Google'ın resmi dokümantasyonuyla teyit edilmelidir.

**İçindekiler**

* [Bölüm A — Sadeleştirme Planı](#bölüm-a--sadeleştirme-planı)
* [Bölüm B — Düzeltilmiş SEO Rehberi (50 madde yerine 20 madde)](#bölüm-b--düzeltilmiş-seo-rehberi)
* [Bölüm C — Eski SEO.md'den Düzeltilecekler](#bölüm-c--eski-seomdden-düzeltilecekler)
* [Bölüm D — Birleşik Öncelik Listesi ve Doğrulama](#bölüm-d--birleşik-öncelik-listesi-ve-doğrulama)

---

# Bölüm A — Sadeleştirme Planı

**Başlangıç:** `src/` altında 385 dosya, ~46.286 satır. **Hedef:** ~250 dosya, %20-30 daha az satır.

## A0. Çalışma Sırası

| Sıra | Aşama | Risk | Kazanç |
|---|---|---|---|
| 1 | Ölü kod ve kullanılmayan dosya temizliği | Düşük | Yüksek |
| 2 | Kopya ve çakışan yapıların birleştirilmesi | Düşük | Orta |
| 3 | Sabit içeriğin config/DB'ye taşınması | Orta | Yüksek |
| 4 | Sitemap, robots, kök layout sadeleştirme | Düşük | Orta |
| 5 | Barrel ve klasör bölünmelerinin gözden geçirilmesi | Orta | Orta |
| 6 | Dokümantasyon birleştirme | Düşük | Orta |
| 7 | Doğrulama ve ölçüm | — | — |

## A1. Ölü Kod ve Kullanılmayan Dosya Temizliği

Önce tespit, sonra silme. Silmeden önce her aday için "hiçbir yerden import edilmiyor" teyidi alınır.

* **Kullanılmayan dosya ve export tespiti:** `knip` veya `ts-prune` ile import edilmeyen dosya, export ve bağımlılıkları listele; listeyi elle gözden geçir, sonra sil.
* **Kullanılmayan npm paketleri:** `depcheck` ile bul ve kaldır.
* **Eski rota artıkları:** `/how-to`, `/how-to-develop-setup` ve forum kalıntıları için kod, çeviri anahtarı, CSS ve görsellerde arama yap.
* **Ölü DB tabloları:** `threads`, `basliklar`, `cevaplar`, `bolumler`, `linkler` tabloları 0 satır. Bunlara dokunan sorgu, tip ve script varsa sil. Tabloları düşürmeden önce yedek al.
* **Tek seferlik scriptler:** `src/scripts/` altında işi bitmiş migration veya toplu işlem scriptlerini gözden geçir; gerekmeyenleri sil.
* **Yorum satırı ve kapalı kod:** Yoruma alınmış eski kodu, kullanılmayan değişken ve import'ları ESLint ile temizle.
* **Kullanılmayan görsel, font ve CSS:** `public/` içindeki referanssız dosyaları ve üç global CSS dosyasından (`globals.scss`, `home-lcp.css`, `colors-glass.css`) kullanılmayan kuralları tespit et.

## A2. Kopya ve Çakışan Yapıların Birleştirilmesi

1. **`SITE_URL` iki yerden geliyor.** `layout.tsx`, `robots.ts`, `not-found.tsx` bunu `@/config/brand.config`'ten, `sitemap.ts` ise `@/lib/site-url`'den alıyor. Tek kaynak seç, diğerini kaldır veya ondan yeniden export ettir.
2. **Hata sayfaları.** Rota bazlı `error.tsx` dosyaları aynı `RouteError` bileşenini farklı başlıkla çağırıyorsa tek üst seviye `error.tsx` yeterli olabilir (doğrula). `global-error.tsx` kasıtlı olarak ayrı kalır.
3. **404 zinciri.** Kök `not-found.tsx`, `[locale]/(site)/not-found` dosyasını import edip sarmalıyor. Tek `not-found` kalmalı. Metadata (noindex) tek yerde tanımlansın; 404'te canonical gereksiz.
4. **Sitemap'te iki lokasyon kaynağı.** `districtPages` (pages tablosu) ile `serviceCityPages` (service_city_seo) aynı URL desenini üretiyor ve `dedupeSitemap` ile birleştiriliyor. Hedef: lokasyon sayfaları için tek tablo veya tek kaynak. Kısa vadede iki sorguyu tek fonksiyonda birleştir.
5. **Sitemap yardımcı fonksiyonları.** `getBlogEntries`, `getServiceEntries` ve lokasyon fonksiyonları aynı kalıbı (env kontrolü, try/catch, boş dizi, `unstable_cache`) tekrar ediyor. Tek ortak sarmalayıcı yeterli.
6. **Statik sayfa listesi.** Sitemap'teki 10 statik sayfa elle yazılmış. Küçük bir liste + tek döngü olsun; aynı liste robots ve `xip_dynamic_content` anahtarlarıyla da uyumlu tutulabilir.
7. **Giriş gerektiren sayfalar.** `blog/write`, `blog/edit`, `blog/my-posts`, `x/edit` aynı "giriş yoksa `/login`'e yönlendir" mantığını ayrı ayrı yapıyor. Ortak layout veya tek koruma noktasında topla.
8. **Noindex bilgisinin tekrarı.** Sayfa metadata'ları, `robots.ts` disallow listesi ve `next.config` `X-Robots-Tag` kuralları aynı bilgiyi üç yerde tutuyor. Tek "indekslenmeyecek yollar" listesinden üretmeyi değerlendir (doğrula).

## A3. Sabit İçeriğin Config/DB'ye Taşınması

* `HizmetlerHubClient.tsx` (405 satır): sabit metin ve kartlar veri odaklı hale gelsin; tek kısa render bileşeni + veri kaynağı.
* `WebDesignGuide.tsx` (196 satır): sabit rehber içeriğini blog yazısı olarak DB'ye taşı veya markdown'a çevir; bileşeni sil.
* `ServicePageClient.tsx` (618 satır): FeatureCard, ProcessStep, PackageCard, FaqItem gibi alt bileşenleri ortak `Ui` bileşenleriyle karşılaştır, aynı işi yapanları tekilleştir. Dosya sayısını artırma; yalnızca gerçekten tekrar kullanılanları ayır.
* `service-fallback.ts` (11 hizmet) ile DB'deki `services` aynı bilgiyi iki yerde tutuyor. Fallback'i minimum alana (slug, başlık, kısa açıklama) indir.

## A4. Kök Layout, Sitemap ve Robots

**`layout.tsx`**

* Üç JSON-LD şeması (LocalBusiness, WebSite, Organization) dosyanın yarısını kaplıyor. `src/lib/schema/site` altına taşı; layout'ta tek çağrı kalsın. Üç ayrı `<script>` yerine tek `@graph` kullanılabilir.
* Aynı `image`, `description`, `address`, `geo` birden çok şemada tekrar ediyor; tek ortak nesneden üret.
* `areaServed` iki şemada farklı (LocalBusiness: İstanbul/Türkiye; Organization: Türkiye/Azerbaycan/Almanya). İş kararı olarak netleştir.
* Provider zinciri (`Language → Intl → Auth → Cart → Auction`) her sayfada yükleniyor. `Cart` ve `Auction` yalnızca belirli rotalarda kullanılıyorsa o rota grubunun layout'una taşı (doğrula).
* `meta keywords` Google tarafından kullanılmıyor; kaldır. Kullanılmayan `dns-prefetch` girdilerini çıkar.
* `APP_CONFIg`, `Og_IMAgE` gibi tuhaf büyük/küçük harfli adları standart adlara çevir (arama-değiştirme).

**`sitemap.ts`**

* `force-dynamic` ile `unstable_cache` birlikte kullanılıyor. Amacı netleştir; yalnızca önbellek + `revalidate` yeterliyse `force-dynamic` kalkabilir (önce build sırasında mock DB sorununu çöz).
* Üç ayrı `unstable_cache` sarmalayıcısı yerine tek yardımcı.
* Statik sayfaların `lastModified` değeri her istekte `new Date()` oluyor; gerçek güncelleme tarihine bağla.
* `priority` ve `changeFrequency` alanları Google tarafından büyük ölçüde yok sayılıyor; kaldırılabilir.

**`robots.ts`**

* Yinelenen `utm_*`, `fbclid`, `gclid` satırları: bir dizi + `map` ile üret.
* AI botlarını (GPTBot, ClaudeBot, anthropic-ai vb.) engellemek bilinçli bir karar mı, teyit et. Bu karar yalnızca eğitim amaçlı tarayıcıları etkiler; arama sıralamasını etkilemez.
* Kural gruplarını iki kısa sabit listeye indir.

## A5. Barrel ve Klasör Yapısı

MIMARI.md §13 hedef yapısı çok sayıda küçük dosya öneriyor; bu, dosya sayısını azaltmak yerine artırıyor.

* Her `src/lib/*` alt klasörü için dosya sayısı, satır sayısı ve kaç yerden import edildiğini çıkar.
* 50-100 satırdan küçük ve tek yerden kullanılan dosyaları ilgili ana dosyaya birleştir.
* Barrel dosyaları (`database.ts`, `redis.ts`, `schema-helpers.ts`, `seo-audit.ts`): yalnızca gerçekten gerekliyse tut; import'lar yeni yola taşındıktan sonra sil.
* `src/lib/pages.ts` ile `src/lib/pages/` aynı anda mevcut görünüyor; çakışma varsa tek yapıya indir (doğrula).
* `content/handlers/*` ve `content-api`: kaç endpoint'e hizmet ettiğine bak, az kullanılıyorsa sadeleştir.
* `blog/post/` klasörünün yanıltıcı adı: paylaşılan bileşenleri `blog/_components/` gibi özel bir klasöre taşı; `blog/post/page.tsx` (301 yönlendirme) middleware'e alınıp silinebilir.
* `src/components/Common` ve `src/components/Ui` içinde aynı işi yapan bileşenleri (buton, kart, modal, başlık) listele ve tekilleştir.

## A6. Açık Bulgular (Sadeleştirmeyle Birlikte Kapatılacak)

* **`/teklif` kök rotası 404 veriyor** ama Navbar (2 yer), Hero, PageTemplate ve HomePageComponents bu adrese link veriyor. Linkleri `/contact-us`'a çevir veya modalı açan tek bir bileşende topla.
* **`/x/[nick]`** `Person` JSON-LD üretiyor ama `noindex`. Karar ver: indekslenecekse `noindex`'i kaldır; değilse JSON-LD'yi sil.
* **Lokasyon ve blog detay için config fallback yok (DB-only).** Yeni fallback katmanı eklemek hedefle çelişir; DB erişilemediğinde hata sayfası kabul edilebilir mi karar ver.

## A7. Dokümantasyon

* Gönderilen `MIMARI.md` iki kez birebir aynı geldi; depoda iki kopya varsa birini sil.
* `MIMARI.md` yalnızca "olması gereken" durumu anlatsın; tarihli "Durum" notlarını `REFACTOR.md`'ye taşı.
* §7 ve §9.2 rota tablolarını tek tabloda birleştir.
* `SEO.md` için bkz. Bölüm C.

---

# Bölüm B — Düzeltilmiş SEO Rehberi

Eski 50 maddenin içinden doğru ve işe yarayanlar, hatalı olanlar düzeltilerek 20 maddede toplandı. Rakamsal "tahmini etki" ve kendi kendine verilmiş uyum yüzdeleri bilerek çıkarıldı.

## B1. İçerik ve Güven

1. **Kullanıcıya fayda sağlayan özgün içerik.** Sayfa, aranan sorunun cevabını vermeli. Anahtar kelime doldurmak, aynı metni şehir adı değiştirerek çoğaltmak zarar verir.
2. **Arama niyeti eşleşmesi.** Sorgunun bilgi, karşılaştırma, hizmet veya marka araması olduğuna bak; SERP'teki rakip formatını (rehber, liste, tablo) referans al.
3. **Yazar, tarih ve kaynak şeffaflığı.** Gerçek yazar adı, kısa biyografi, yayın ve güncelleme tarihi, iddialar için güvenilir kaynaklar. Not: E-E-A-T doğrudan bir sıralama faktörü veya "puan" değil, Google'ın kalite değerlendirme çerçevesidir; hedef güven vermek, bir skoru yükseltmek değil.
4. **Kurumsal güven sayfaları.** Hakkımızda, iletişim (adres, telefon, e-posta), gizlilik, kullanım şartları. Sitenizde mevcut.
5. **Konu kümeleri ve iç bağlantı.** Birbiriyle ilişkili sayfalar birbirine açıklayıcı anchor metinle bağlanır; yetim sayfa olmaz. Blog → hizmet bağlantısı ticari sayfalara otorite taşır.
6. **Güncelliği önemli içerikleri düzenli gözden geçir.** Gerçek değişiklik olduğunda `dateModified` güncellenir; kozmetik tarih değişikliği yapılmaz.

## B2. Performans

7. **Core Web Vitals:** LCP ≤ 2,5 sn, INP ≤ 200 ms, CLS ≤ 0,1. Sıralamada laboratuvar skoru değil, CrUX alan verisi (75. yüzdelik, 28 gün) esas alınır.
8. **LCP görseli:** WebP/AVIF, doğru boyut, `fetchpriority="high"`, lazy yüklenmez. Doğrulanması gereken: eski denetimde `<link rel="preload">` yok denmişti; Next.js `priority` davranışını kontrol et.
9. **CLS:** Görsel, video ve iframe için boyut ver; reklam alanı için yer ayır.
10. **Üçüncü parti scriptler:** Analytics, reklam, widget'lar kritik yolu bloke etmeden (ertelenmiş) yüklenir.
11. **HTTPS + HSTS, mobil uyum (viewport, dokunma hedefleri).**

## B3. Teknik SEO

12. **Doğru HTTP durumu.** Var olan sayfa 200; kalıcı taşınan 301/308; gerçekten silinen ve karşılığı olmayan sayfa 404 veya 410. Not: Google 404 ve 410'u neredeyse aynı işler; 410'un belirgin avantajı yoktur. Karşılığı olmayan URL'leri toplu olarak `/blog`'a yönlendirmek soft-404 olarak değerlendirilebilir; yalnızca gerçekten ilgili içeriğe yönlendirin.
13. **Canonical.** Her sayfa kendi canonical'ını verir (kök layout'ta global canonical olmaması doğru). Trailing slash politikası sabit.
14. **Sitemap ve robots uyumu.** Sitemap'e yalnızca indekslenebilir (200, noindex olmayan, kendine canonical) URL girer. `lastModified` gerçek tarihi yansıtır. `priority` ve `changeFrequency` Google tarafından yok sayılır.
15. **Sayfalama.** `?page=2` gibi sayfalar taranabilir olmalı ve kendi canonical'ına sahip olmalı. `rel="prev/next"` Google tarafından 2019'dan beri kullanılmıyor; eklemeye gerek yok.
16. **Yapısal veri (JSON-LD).** Öncelik: `BlogPosting/Article`, `BreadcrumbList`, `Organization`, `LocalBusiness`, `Service`. Notlar: `HowTo` zengin sonucu kaldırıldı; `FAQPage` zengin sonucu büyük ölçüde sınırlandı (SSS içeriği kullanıcıya faydalıysa kalsın ama şema için fazla emek harcamayın); yapısal veri AI Overviews'a girmenin şartı değildir. Şemadaki bilgi sayfada görünenle aynı olmalı.
17. **Görsel SEO.** WebP/AVIF, açıklayıcı alt metni, anlamlı dosya adı, boyut öznitelikleri.
18. **Hreflang.** Yalnızca gerçekten çalışan dil sürümleri varsa eklenir; karşılıklı olmalı. Şu an yalnızca TR olduğu için eklenmemesi doğru.
19. **Blog ve yazar sayfaları.** İnce blog içeriği geliştirilmeli veya noindex yapılmalı; yazar sayfası ya indekslenmeli ya da Person şeması kaldırılmalı (çelişki giderilmeli).

## B4. Yerel SEO

20. **Lokasyon sayfaları ve Google Business Profile.** Yalnızca gerçekten özgün (elle yazılmış) il/ilçe sayfaları indekslenmeli; şablon olanlar noindex kalmalı (doorway page riski). NAP (ad, adres, telefon) web, GBP ve diğer platformlarda birebir aynı olmalı. `LocalBusiness`/`Service` şeması sayfada görünen bilgiyle tutarlı olmalı.

## B5. Ölçüm

* Search Console'da "Tarandı – dizine eklenmedi" ve gerçek 5xx hataları öncelikli izlenir.
* Aylık CrUX/GSC raporu (mevcut cron) alan verisini takip etmek için yeterli.
* Çekirdek güncellemeler sonrası düşüş/yükseliş sayfa bazında incelenir.

---

# Bölüm C — Eski SEO.md'den Düzeltilecekler

## C1. Yanlış veya güncel olmayan ifadeler

| Eski ifade | Sorun | Düzeltme |
|---|---|---|
| M25: `rel="prev/next"` kullanın | Google 2019'da desteği bıraktı | Maddeden kaldır; taranabilirlik + canonical yeterli |
| M28: şema "AI Overviews'a dahil edilmeyi sağlar" | Doğru değil | Cümleyi kaldır |
| M26: "410, 404'ten güçlü mesaj verir" | Fark çok küçük | "404 veya 410 kullanılabilir" yaz |
| M37: `rel="noopener noreferrer"` SEO için | Güvenlik özelliği | SEO bağlamından çıkar |
| M41: DR/DA 70+ hedefi | Üçüncü parti metrikler, Google kullanmaz | Çıkar; "alakalı, doğal bağlantı" yeterli |
| M42: anchor oranı %40/30/20/10 | Google'dan gelen bir kural değil | Çıkar |
| M43: CTR ve dwell time sinyali | Google doğrudan sinyal olduğunu reddediyor, tartışmalı | "Kullanıcı memnuniyeti" olarak yumuşat |
| M3, M10: "E-E-A-T puanı", "güven puanı" | Böyle bir metrik yok | Dili düzelt |
| "Zaten mükemmel": priority/changeFrequency | Yok sayılıyor | Övgüden çıkar |
| M32: 150-160 / 120-160 karakter | Tutarsız | Tek aralık yaz (140-160) |

## C2. Kanıtsız rakamlar (kaldırılacak)

"%40 trafik kaybı", "yıllık güncelleme +4,6 pozisyon", "AI Overviews %45-60", tüm "tahmini etki" sütunu (trafik +%20-40, LCP 3,0→1,8 sn vb.), "skor %70 → %83-87", "trafik 3-6 ayda +%40-70". Kaynaksız oldukları için belgeden silinmeli.

## C3. GSC yorumunun düzeltilmesi

* "Yönlendirmeli sayfa", "Doğru canonical'lı alternatif sayfa" ve "noindex ile hariç tutuldu" kategorileri çoğunlukla sorun değil, beklenen durumlardır. Hedef olarak "5.547 → <500" koymak yanlış öncelik. Bu satırlar "bilgi" olarak etiketlenmeli.
* Asıl öncelik: "Tarandı – dizine eklenmedi" (1.040), gerçek 404'ler ve 5xx (129).
* Eşleşmeyen eski URL'lerin tamamının 301 → `/blog` gitmesi soft-404 deseni üretebilir. Gerçekten karşılığı olmayanlar için 404/410 kabul edilebilir ve GSC'de "bulunamadı" görünmesi site sağlığını bozmaz.

## C4. Belge yapısı

1. **Bölüm 2'yi (Uyum Raporu) tamamen sil.** Bölüm 4 onu zaten geçersiz kılıyor.
2. **Bölüm 1'i bu belgenin Bölüm B'si ile değiştir** (50 madde → 20 madde).
3. **Bölüm 4'ü** sadeleştirip yalnızca açık çelişkileri tut: hreflang yok, VideoObject yok, `DELETED_PATH_SET` boş, LCP preload doğrulaması.
4. **Bölüm 3** sürekli güncellenen bir iş listesine dönüştürülsün; tamamlanan işler ayrı bir "yapıldı" listesine taşınsın.
5. `lastModified` iddiası düzeltilsin: statik sayfalarda `now` kullanılıyor.
6. Tüm yüzdeli skorlar kaldırılsın; yerine "yapıldı / kısmen / yok" etiketi yeterli.

---

# Bölüm D — Birleşik Öncelik Listesi ve Doğrulama

## D1. Öncelik listesi

| Sıra | İş | Tür |
|---|---|---|
| 1 | `knip` + `depcheck` ile ölü kod ve kullanılmayan paket tespiti | Sadeleştirme |
| 2 | `/teklif` linklerinin 404'e gitmesini düzelt | SEO + UX |
| 3 | `SITE_URL` tek kaynağa indir; 404/error sayfası tekrarlarını birleştir | Sadeleştirme |
| 4 | Statik sayfaların `lastModified` değerini gerçek tarihe bağla; priority/changeFrequency kaldır | SEO |
| 5 | Layout'taki JSON-LD'yi `lib/schema/site`'a taşı; `meta keywords` kaldır; `areaServed` tutarlılığı | Sadeleştirme + SEO |
| 6 | `/x/[nick]` kararı (indeksle veya şemayı kaldır) | SEO |
| 7 | Eşleşmeyen eski URL'leri toplu `/blog` yerine 404/410'a çevirmeyi değerlendir | SEO |
| 8 | Sitemap lokasyon kaynaklarını tek tabloda birleştir | Sadeleştirme |
| 9 | `HizmetlerHubClient` ve `WebDesignGuide` içeriğini DB/config'e taşı | Sadeleştirme |
| 10 | İnce blog içeriklerini gözden geçir (geliştir veya noindex) | SEO |
| 11 | SEO.md'yi Bölüm C'ye göre yeniden yaz; Bölüm 2'yi sil | Dokümantasyon |
| 12 | Barrel ve küçük dosya birleştirme (A5) | Sadeleştirme |

## D2. Doğrulama (her aşamadan sonra)

1. `npm run build` ve `tsc --noEmit` hatasız geçmeli.
2. `/sitemap.xml` ve `/robots.txt` çıktısı değişiklik öncesiyle karşılaştırılmalı (URL sayısı beklenmedik şekilde düşmemeli).
3. 404, 500 (global-error) ve rota hata sayfaları elle denenmeli.
4. Ana sayfa, bir hizmet, bir il/ilçe sayfası ve bir blog yazısında JSON-LD ve canonical kontrol edilmeli (Rich Results Test, GSC URL Denetleme).
5. Eski forum ve WordPress URL'lerinin yönlendirmeleri denenmeli.

## D3. Başarı ölçütleri

| Metrik | Başlangıç | Hedef |
|---|---|---|
| Dosya sayısı (`src/`) | 385 | ~250 |
| Toplam satır | ~46.286 | %20-30 azalma |
| Kök layout satırı | ~300 | ~80 |
| Kullanılmayan bağımlılık | ölç | 0 |
| SEO.md uzunluğu | çok uzun, tekrarlı | tek, kısa rehber |

## D4. Dikkat edilecekler

* Her aşamayı ayrı commit veya PR yap; geri dönüş kolay olsun.
* SEO'yu etkileyen değişikliklerde (canonical, noindex, sitemap, JSON-LD, yönlendirmeler) önce mevcut davranışın çıktısını al.
* DB tablosu silme ve veri taşıma işlerinde yedek al.
* Sadeleştirme sırasında yeni özellik ekleme; amaç yalnızca azaltmak.