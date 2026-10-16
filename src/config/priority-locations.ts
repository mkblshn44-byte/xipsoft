/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ÖNCELİKLİ LOKASYON (İLÇE) ALLOWLIST'İ — OPERASYONEL YAPILANDIRMA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * MİMARİ NOT (MIMARI.md §2.1/§2.2 ile uyumlu):
 * Bu dosya İÇERİK değil, "hangi programatik ilçe sayfasının korunacağına" karar
 * veren İŞ/OPERASYON yapılandırmasıdır. İlçe adları, hizmet açıklamaları veya
 * SEO metinleri ÜRETMEZ; yalnızca DB'den gelen `locations` satırlarına uygulanan
 * bir "tut / yönlendir / indexle" karar girdisidir. İçerik tek gerçek kaynak
 * olarak NeonDB'de kalmaya devam eder.
 *
 * NEDEN VAR:
 * SEO-AKSIYON-PLANI.md §4 "20–30 ilçe bir kota değildir; sayfalar gerçek hizmet
 * kapsamı, kullanıcı faydası ve performans verisiyle seçilir" der. Aşağıdaki
 * liste, o planın "İlk 30 ilçe — web yazılım/tasarım" pilot listesidir (DB'de
 * yayınlı web-yazılım URL'leriyle doğrulanmış). Tutma/yönlendirme kararı bu 30
 * ilçeyi tüm hizmetlerde kapsar; bu içerik zenginleştirme çalışmasının kapsamı
 * ise yalnızca web-yazilim-tasarim hizmetidir. GSC dışa aktarımı geldiğinde
 * yalnızca bu dosyayı güncellemek yeterlidir; kod değişmez.
 *
 * ÖNEMLİ — INDEX vs KEEP AYRIMI:
 * Listede olmak, sayfanın otomatik olarak index'e gireceği anlamına GELMEZ.
 * Bu sayfalar şu anda `source_type='template'`. Plan gereği özgün yerel
 * bilgiyle zenginleştirilene kadar `noindex, follow` olarak CANLI tutulur;
 * böylece URL korunur, içerik zenginleşince (manual sayfa veya zengin
 * `service_city_seo` satırı) otomatik olarak indexlenebilir hale gelir.
 * Listede OLMAYAN ilçeler ise aynı hizmetin İL sayfasına kalıcı yönlendirilir.
 *
 * GÜNCELLEME:
 *   1. Google Search Console → Performans → Sayfalar (son 12 ay) CSV'sini al.
 *   2. Sorgu/hizmet bazlı en değerli ilçe URL'lerini seç (tıklama + konum +
 *      dönüşüm verisi birlikte).
 *   3. İlçeyi "ilSlug/ilceSlug" anahtarıyla aşağıdaki listeye ekle/kaldır.
 *   4. Deploy et; sitemap + iç linkleme + index/yönlendirme kararı otomatik
 *      güncellenir.
 *
 * Anahtar biçimi: `{il}slug/{ilçe}slug` (küçük harf, tireli, Türkçe karakterler
 * ASCII normalize edilmiş — `slugify` ile aynı biçim).
 *
 * Kaynak: SEO-AKSIYON-PLANI.md → "İlk 30 ilçe — web yazılım/tasarım".
 */
export const PRIORITY_DISTRICTS: ReadonlyArray<readonly [string, string]> = [
  // İstanbul (15)
  ["istanbul", "atasehir"],
  ["istanbul", "bakirkoy"],
  ["istanbul", "basaksehir"],
  ["istanbul", "besiktas"],
  ["istanbul", "beylikduzu"],
  ["istanbul", "esenyurt"],
  ["istanbul", "kadikoy"],
  ["istanbul", "kagithane"],
  ["istanbul", "kartal"],
  ["istanbul", "maltepe"],
  ["istanbul", "pendik"],
  ["istanbul", "sariyer"],
  ["istanbul", "sisli"],
  ["istanbul", "umraniye"],
  ["istanbul", "uskudar"],
  // Ankara (5)
  ["ankara", "cankaya"],
  ["ankara", "yenimahalle"],
  ["ankara", "etimesgut"],
  ["ankara", "golbasi"],
  ["ankara", "kecioren"],
  // İzmir (4)
  ["izmir", "konak"],
  ["izmir", "bornova"],
  ["izmir", "bayrakli"],
  ["izmir", "karsiyaka"],
  // Bursa (2)
  ["bursa", "nilufer"],
  ["bursa", "osmangazi"],
  // Antalya (2)
  ["antalya", "muratpasa"],
  ["antalya", "konyaalti"],
  // Kocaeli (2)
  ["kocaeli", "gebze"],
  ["kocaeli", "izmit"],
];

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GENİŞLETİLMİŞ ÖNCELİK KURALI (SEO strateji güncellemesi)
 * ─────────────────────────────────────────────────────────────────────────────
 * Öncelik artık yalnızca yukarıdaki pilot 30 ilçe değil; kural tabanlıdır:
 *
 *   1. Tüm İL sayfaları (`location_type = 'province'`) korunur.
 *   2. `TOP_PRIORITY_PROVINCES` içindeki en büyük 10 ilin TÜM ilçeleri korunur.
 *   3. Diğer illerde yalnızca `MAJOR_DISTRICTS` (ticari/merkez büyük ilçeler)
 *      korunur.
 *   4. Kalan jenerik küçük ilçeler korunmaz → il sayfasına 308 yönlendirilir
 *      ve `scripts/manage-location-status.ts` ile DB'de `status='paused'` yapılır
 *      (sitemap dışı + taranmaz → kopya içerik uyarısı önlenir).
 *
 * Yukarıdaki `PRIORITY_DISTRICTS` listesi geriye dönük uyumluluk için aynen
 * korunur (publish-local-seo-content.ts ile eşleşir); karar `isPriorityDistrict`
 * üzerinden bu genişletilmiş kurala göre verilir.
 */

/** En büyük 10 il — bu illerin TÜM ilçeleri önceliklidir (URL korunur). */
export const TOP_PRIORITY_PROVINCES: ReadonlySet<string> = new Set([
  "istanbul",
  "ankara",
  "izmir",
  "bursa",
  "antalya",
  "kocaeli",
  "adana",
  "gaziantep",
  "konya",
  "mersin",
]);

/**
 * Diğer illerde ticari/merkez önem taşıyan büyük ilçeler (il/ilçe).
 * Bu ilçeler il sayfasına yönlendirilmez; URL'leri korunur.
 * Anahtar biçimi: `{il}slug/{ilçe}slug` (slugify ile aynı biçim).
 *
 * KAPSAM: `TOP_PRIORITY_PROVINCES` dışındaki illerde, Türkiye'nin en kalabalık
 * ilçeleri sıralamasındaki (TÜİK ADNKS nüfus verisi) ticari/merkez ilçeler;
 * slug'lar nufusu.com kanonik ilçe URL'leriyle (örn. `kayapinar_diyarbakir-nufusu`)
 * doğrulanmıştır. Listedeki `#N` yorumları, ilgili ilçenin ilk-100 nüfus
 * sıralamasındaki yerini gösterir ve veriyle denetime açık tutar. Bu listede
 * olmak URL'nin korunmasını sağlar (template sayfalar özgün içerikle
 * zenginleşene kadar `noindex, follow` kalır).
 */
export const MAJOR_DISTRICTS: ReadonlyArray<readonly [string, string]> = [
  // Muğla — turizm/ticaret
  ["mugla", "bodrum"],
  ["mugla", "fethiye"],
  ["mugla", "marmaris"],
  // Denizli
  ["denizli", "pamukkale"],
  ["denizli", "merkezefendi"],
  // Sakarya — sanayi
  ["sakarya", "adapazari"],
  ["sakarya", "serdivan"],
  ["sakarya", "erenler"],
  // Samsun
  ["samsun", "atakum"],
  ["samsun", "ilkadim"],
  // Eskişehir
  ["eskisehir", "odunpazari"],
  ["eskisehir", "tepebasi"],
  // Trabzon
  ["trabzon", "ortahisar"],
  // Balıkesir — sanayi/turizm
  ["balikesir", "edremit"],
  // Tekirdağ — sanayi
  ["tekirdag", "corlu"],
  ["tekirdag", "suleymanpasa"], // #99 — il merkezi
  // Aydın — turizm
  ["aydin", "kusadasi"],
  ["aydin", "efeler"], // #72 — il merkezi
  // Kayseri — sanayi
  ["kayseri", "melikgazi"],
  ["kayseri", "kocasinan"],
  // Hatay
  ["hatay", "antakya"],
  ["hatay", "iskenderun"], // #98 — sanayi/liman
  // Diyarbakır
  ["diyarbakir", "kayapinar"], // #33
  ["diyarbakir", "baglar"], // #47
  // Şanlıurfa
  ["sanliurfa", "eyyubiye"], // #45
  ["sanliurfa", "haliliye"], // #50
  ["sanliurfa", "karakopru"], // #71
  ["sanliurfa", "siverek"], // #81
  // Kahramanmaraş
  ["kahramanmaras", "onikisubat"], // #35
  // Van
  ["van", "ipekyolu"], // #56
  // Malatya
  ["malatya", "yesilyurt"], // #73
  ["malatya", "battalgazi"], // #84
  // Adıyaman
  ["adiyaman", "merkez"], // #77 — il merkezi
  // Mardin
  ["mardin", "kiziltepe"], // #83
  // Manisa
  ["manisa", "yunusemre"], // #86
  // Ordu
  ["ordu", "altinordu"], // #95
];

/**
 * TOP 100 İLÇE — Nüfusa göre en büyük 100 ilçe (81 il ayrı korunur).
 * Format: `{parent_slug}/{district_slug}`
 * Bu sabit script ve `isPriorityDistrict` tarafından kullanılır.
 * Kaynak: TÜİK ADNKS 2023 nüfus sıralaması.
 */
export const TOP_100_DISTRICTS: ReadonlySet<string> = new Set<string>([
  // İstanbul
  'istanbul/esenyurt',
  'istanbul/bagcilar',
  'istanbul/kucukcekmece',
  'istanbul/pendik',
  'istanbul/umraniye',
  'istanbul/sultanbeyli',
  'istanbul/uskudar',
  'istanbul/maltepe',
  'istanbul/sisli',
  'istanbul/kadikoy',
  'istanbul/sancaktepe',
  'istanbul/kartal',
  'istanbul/gaziosmanpasa',
  'istanbul/bahcelievler',
  'istanbul/sultangazi',
  'istanbul/basaksehir',
  'istanbul/avcilar',
  'istanbul/kagithane',
  'istanbul/beylikduzu',
  'istanbul/tuzla',
  'istanbul/besiktas',
  'istanbul/bakirkoy',
  'istanbul/atasehir',
  'istanbul/sariyer',
  'istanbul/fatih',
  'istanbul/esenler',
  'istanbul/zeytinburnu',
  'istanbul/buyukcekmece',
  'istanbul/silivri',
  'istanbul/cekmekoy',
  'istanbul/arnavutkoy',
  // Ankara
  'ankara/cankaya',
  'ankara/kecioren',
  'ankara/mamak',
  'ankara/etimesgut',
  'ankara/sincan',
  'ankara/yenimahalle',
  'ankara/altindag',
  'ankara/golbasi',
  'ankara/pursaklar',
  'ankara/polatli',
  // İzmir
  'izmir/bornova',
  'izmir/karabaglar',
  'izmir/konak',
  'izmir/karsiyaka',
  'izmir/bayrakli',
  'izmir/cigli',
  'izmir/buca',
  'izmir/menemen',
  'izmir/gaziemir',
  'izmir/cesme',
  // Kahramanmaraş
  'kahramanmaras/onikisubat',
  'kahramanmaras/dulkadiroglu',
  // Diyarbakır
  'diyarbakir/kayapinar',
  'diyarbakir/baglar',
  'diyarbakir/yenisehir',
  'diyarbakir/ergani',
  // Bursa
  'bursa/osmangazi',
  'bursa/nilufer',
  'bursa/yildirim',
  'bursa/inegol',
  'bursa/gemlik',
  'bursa/mudanya',
  'bursa/kestel',
  'bursa/gursu',
  'bursa/gorukle',
  'bursa/orhangazi',
  // Antalya
  'antalya/muratpasa',
  'antalya/kepez',
  'antalya/konyaalti',
  'antalya/alanya',
  'antalya/manavgat',
  'antalya/serik',
  'antalya/dosemealti',
  'antalya/aksu',
  'antalya/kemer',
  // Kocaeli
  'kocaeli/izmit',
  'kocaeli/gebze',
  'kocaeli/golcuk',
  'kocaeli/darica',
  'kocaeli/korfez',
  'kocaeli/derince',
  'kocaeli/basiskele',
  'kocaeli/dilovasi',
  'kocaeli/cayirova',
  // Adana
  'adana/seyhan',
  'adana/cukurova',
  'adana/yuregir',
  'adana/saricam',
  'adana/kozan',
  'adana/ceyhan',
  // Şanlıurfa
  'sanliurfa/eyyubiye',
  'sanliurfa/haliliye',
  'sanliurfa/karakopru',
  'sanliurfa/siverek',
  // Konya
  'konya/meram',
  'konya/selcuklu',
  'konya/karatay',
  'konya/eregli',
  'konya/beysehir',
  // Gaziantep
  'gaziantep/sahinbey',
  'gaziantep/sehitkamil',
  'gaziantep/nizip',
  'gaziantep/islahiye',
  // Mersin
  'mersin/yenisehir',
  'mersin/toroslar',
  'mersin/akdeniz',
  'mersin/mezitli',
  'mersin/tarsus',
  'mersin/erdemli',
  // Hatay
  'hatay/antakya',
  'hatay/iskenderun',
  'hatay/defne',
  // Van
  'van/ipekyolu',
  'van/tusba',
  // Malatya
  'malatya/yesilyurt',
  'malatya/battalgazi',
  // Denizli
  'denizli/pamukkale',
  'denizli/merkezefendi',
  // Sakarya
  'sakarya/adapazari',
  'sakarya/serdivan',
  'sakarya/erenler',
  // Samsun
  'samsun/atakum',
  'samsun/ilkadim',
  'samsun/canik',
  // Eskişehir
  'eskisehir/odunpazari',
  'eskisehir/tepebasi',
  // Aydın
  'aydin/efeler',
  'aydin/kusadasi',
  'aydin/didim',
  // Kayseri
  'kayseri/melikgazi',
  'kayseri/kocasinan',
  'kayseri/talas',
  // Manisa
  'manisa/yunusemre',
  'manisa/turgutlu',
  'manisa/akhisar',
  // Tekirdağ
  'tekirdag/corlu',
  'tekirdag/suleymanpasa',
  // Trabzon
  'trabzon/ortahisar',
  // Balıkesir
  'balikesir/edremit',
  'balikesir/karesi',
  'balikesir/altieylul',
  // Adıyaman
  'adiyaman/merkez',
  // Mardin
  'mardin/kiziltepe',
  'mardin/artuklu',
  // Muğla
  'mugla/bodrum',
  'mugla/fethiye',
  'mugla/marmaris',
  'mugla/milas',
  // Ordu
  'ordu/altinordu',
]);

function buildKey(parentSlug: string, locationSlug: string): string {
  return `${parentSlug}/${locationSlug}`;
}

/** `istanbul/kadikoy` biçiminde normalize edilmiş anahtar kümesi (lookup için). */
export const PRIORITY_DISTRICT_KEYS: ReadonlySet<string> = new Set(
  PRIORITY_DISTRICTS.map(([parent, district]) => buildKey(parent, district)),
);

/** `MAJOR_DISTRICTS` için normalize edilmiş anahtar kümesi (lookup için). */
export const MAJOR_DISTRICT_KEYS: ReadonlySet<string> = new Set(
  MAJOR_DISTRICTS.map(([parent, district]) => buildKey(parent, district)),
);

/**
 * Bir ilçenin öncelikli (korunacak) olup olmadığını söyler.
 *
 * Öncelik kuralı (yukarıdaki GENİŞLETİLMİŞ ÖNCELİK KURALI ile aynı):
 *   1. Bağlı olduğu il `TOP_PRIORITY_PROVINCES` içindeyse → öncelikli.
 *   2. `PRIORITY_DISTRICTS` (pilot 30) veya `MAJOR_DISTRICTS` listesindeyse
 *      (il/ilçe anahtarıyla) → öncelikli.
 *   3. Aksi halde → öncelikli DEĞİL (pasife alınır / il sayfasına yönlenir).
 *
 * Parent bilgisi (il slug'ı) aynı adlı ilçeleri (ör. "merkez", "altyazi")
 * ayırt etmek için ZORUNLUDUR — salt ilçe adıyla karar verilmez.
 */
export function isPriorityDistrict(
  parentLocationSlug: string | null | undefined,
  locationSlug: string | null | undefined,
): boolean {
  if (!parentLocationSlug || !locationSlug) return false;
  if (TOP_PRIORITY_PROVINCES.has(parentLocationSlug)) return true;
  const key = buildKey(parentLocationSlug, locationSlug);
  return PRIORITY_DISTRICT_KEYS.has(key) || MAJOR_DISTRICT_KEYS.has(key) || TOP_100_DISTRICTS.has(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// KARAR KATMANI — tek kaynak
// ─────────────────────────────────────────────────────────────────────────────
//
// Bir `/hizmetler/[hizmet]/[lokasyon]` URL'i için üç kararı buradan veririz:
//   • indexle  → <meta robots index,follow> + self canonical + sitemap kaydı
//   • koru     → URL 200 döner (zenginleştirme için tutulur) ama indexlenmez
//   • yönlendir→ en yakın anlamlı eşdeğere kalıcı (308) yönlendirme; yoksa 404
//
// Bu fonksiyonlar [sehir]/page.tsx, sitemap.ts ve iç linkleme tarafından ortak
// kullanılır (DRY).
export interface LocationDecisionInput {
  /** locations.location_type: 'province' | 'district' | 'neighborhood' */
  locationType?: string | null;
  /** pages.source_type: 'manual' | 'template' | 'ai' | null (DB satırı yoksa) */
  sourceType?: string | null;
  /** service_city_seo satırı var mı */
  isCustom?: boolean | null;
  /** service_city_seo.is_indexed */
  isIndexed?: boolean | null;
  /** service_city_seo.lokal_giris uzunluğu (özgün içerik derinliği eşiği) */
  localIntroLength?: number | null;
  /** İlçenin bağlı olduğu ilin slug'ı (district/neighborhood için) */
  parentLocationSlug?: string | null;
  /** locations.slug (ilçe/il slug'ı) */
  locationSlug?: string | null;
}

/**
 * Sayfanın GERÇEKTEN indexlenebilir olup olmadığı.
 *
 * Indexlenir (index, follow + self canonical):
 *  1. Yayınlanmış, zenginleştirilmiş CMS sayfaları (`pages.source_type = 'manual'`).
 *  2. `service_city_seo`'da özgün satırı olan ve `is_indexed` açık + en az
 *     200 karakter özgün giriş barındıran sayfalar.
 *
 * `source_type` tek başına içerik kalitesini kanıtlamaz; yayınlamadan önce
 * sayfanın içerik ve SSS eşikleri içerik iş akışında doğrulanmalıdır.
 *
 * ÖNEMLİ: İller korunur fakat şablon içerikle otomatik indexlenmez. İlçe
 * allowlist'inde olmak da tek başına index VERMEZ; template sayfalar özgün
 * içerikle zenginleştirilene kadar `noindex, follow` kalır.
 */
export function isIndexableLocation(input: LocationDecisionInput): boolean {
  if (
    input.locationType === "district" &&
    !isPriorityDistrict(input.parentLocationSlug, input.locationSlug)
  ) {
    return false;
  }
  if (input.sourceType === "manual") return true;
  const substantive = (input.localIntroLength ?? 0) >= 200;
  if (input.isCustom === true && input.isIndexed !== false && substantive) return true;
  return false;
}

/**
 * Sayfanın 404/yönlendirme yerine CANLI tutulup tutulmayacağı.
 * Indexlenebilir sayfalar ve öncelikli ilçeler korunur; kalan ilçeler
 * (`isKeepableLocation === false`) il sayfasına yönlendirilir veya 404 döner.
 */
export function isKeepableLocation(input: LocationDecisionInput): boolean {
  if (input.locationType === "province") return true;
  return input.locationType === "district" &&
    isPriorityDistrict(input.parentLocationSlug, input.locationSlug);
}

/**
 * Tutulmayan bir konum için EN YAKIN ANLAMLI EŞDEĞER hedef slug'ı döndürür.
 *  - district → bağlı olduğu il (aynı hizmetin il sayfası) — tek adım 308
 *  - neighborhood → bağlı olduğu ilçe (o ilçe tutulmuyorsa kendi kuralıyla
 *    iline yönlenecektir — nadir durum, kabul edilebilir tek adım)
 *  - province / bilinmiyor → null (404 kararı çağıran tarafa ait)
 */
export function getKeptRedirectTarget(location?: {
  locationType?: string | null;
  parentLocationSlug?: string | null;
} | null): string | null {
  if (!location) return null;
  if (location.locationType === "district" || location.locationType === "neighborhood") {
    return location.parentLocationSlug ?? null;
  }
  return null;
}
