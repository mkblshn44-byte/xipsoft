/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ÖNCELİKLİ İLÇE SAYFALARI — ÖZGÜN İÇERİK VERİSİ
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SEO-AKSIYON-PLANI.md'deki "İlk 30 ilçe — web yazılım/tasarım" listesindeki
 * her ilçe için GERÇEKTEN o ilçeye özgü içerik. Şablon + ilçe adı değişimi
 * DEĞİLDİR; her kayıtta ticari yapı, sektörler, yakın bölgeler ve SSS'ler
 * ayrı ayrı yazılmıştır.
 *
 * Kurallar (SEO-AKSIYON-PLANI.md §3):
 *  - Doğrulanamayan müşteri adı, ciro, trafik artışı veya yüzde iddiası YOK.
 *  - "En iyi", "garantili sonuç" gibi vaatler YOK.
 *  - İfadeler yetkinlik + ilçenin bilinen ticari karakteri çerçevesinde.
 *  - Doğrulanmamış ofis, müşteri, trafik, sıralama veya teslim süresi iddiası YOK.
 *
 * `enrich-priority-districts.ts` bu veriyi Markdown'a dönüştürüp `pages`
 * tablosuna yazar (bkz. `buildMarkdown`).
 */
export interface PriorityDistrictProfile {
  provinceSlug: string;
  districtSlug: string;
  provinceName: string;
  districtName: string;
  /** "Kadıköy'de", "Çankaya'da" gibi doğru ekli bulunma hâli. */
  locative: string;
  /** H1 başlığı. */
  title: string;
  /** SEO title (≈50-60 karakter). */
  metaTitle: string;
  /** SEO meta açıklaması (≈150-160 karakter). */
  metaDescription: string;
  /** A/B ve özel meta için ikinci açıklama (≤320 karakter). */
  ozelMetaDesc: string;
  /** `pages.lokal_aciklama` — özgün giriş paragrafı. */
  intro: string;
  /** İlçenin dijital ihtiyacını anlatan özgün paragraf. */
  needParagraph: string;
  /** Madde madde öne çıkan çözümler (3-4). */
  focusBullets: string[];
  /** İlçede öne çıkan sektörler için özgün cümleler (3). */
  sectorNotes: string[];
  /** Yakın bölgeler/ilçeler (yerel kapsam). */
  areas: string[];
  /** İlçeye özel SSS (3). */
  faqs: Array<{ question: string; answer: string }>;
  /** Kapanış cümlesi. */
  closing: string;
}

export const PRIORITY_DISTRICT_PROFILES: PriorityDistrictProfile[] = [
  // Toplam 30 ilçe profili (SEO-AKSIYON-PLANI pilot listesi).
  {
    provinceSlug: "istanbul",
    districtSlug: "atasehir",
    provinceName: "İstanbul",
    districtName: "Ataşehir",
    locative: "Ataşehir'de",
    title: "Ataşehir Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Ataşehir Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Ataşehir'deki kurumsal firmalar, fintech girişimleri ve e-ticaret işletmeleri için hızlı, güvenli ve entegrasyona açık web tasarım ve yazılım çözümleri.",
    ozelMetaDesc: "Ataşehir'de kurumsal web sitesi, fintech paneli ve e-ticaret altyapısı. KVKK uyumlu, API entegrasyonlu özel web yazılımı geliştiriyoruz.",
    intro: "Ataşehir, İstanbul'un finans ve kurumsal hizmet aksında yer alıyor; İstanbul Finans Merkezi çevresindeki plazalar, fintech girişimleri ve genel merkez ofisleri bu profili belirliyor. Bu yapıya uygun olarak hızlı, güvenli ve kurumsal entegrasyonlara açık web altyapıları geliştiriyoruz.",
    needParagraph: "Ataşehir'deki kurumsal firmalar için web sitesi artık yalnızca tanıtım vitrinİ değil; teklif, başvuru ve iç süreçlerin dijital omurgası. Kurumsal kimliği doğru yansıtan, içerik yönetimi kolay ve geliştiriciye bağımlı kalmayan bir altyapı, satış ve pazarlama ekibinin hızını doğrudan etkiliyor.",
    focusBullets: [
      "**Kurumsal web sitesi:** Çok dilli, erişilebilir ve Core Web Vitals hedefli kurumsal siteler.",
      "**Fintech ve panel geliştirme:** Rol bazlı yetkilendirme, raporlama ve güvenli API köprüleri.",
      "**E-ticaret ve pazaryeri altyapısı:** Yüksek trafiğe dayanıklı, ölçeklenebilir sistemler.",
    ],
    sectorNotes: [
      "Finans ve fintech ekipleri için ödeme, mutabakat ve raporlama panellerini mevcut sistemlere bağlıyoruz.",
      "Kurumsal danışmanlık firmalarına teklif ve müşteri takibi akışları kuran web uygulamaları yazıyoruz.",
      "E-ticaret markalarına ürün, sepet ve lojistik entegrasyonlarını içeren mağaza altyapıları kuruyoruz.",
    ],
    areas: ["Kadıköy", "Ümraniye", "Maltepe"],
    faqs: [
      {
        question: "Ataşehir'deki firmalarla yüz yüze toplantı yapıyor musunuz?",
        answer: "Görüşme yöntemi proje kapsamına göre belirlenir. İlk ihtiyaç ve kapsam görüşmesi çevrimiçi yapılabilir; farklı bir toplantı biçimi gerekiyorsa proje başlamadan planlanır.",
      },
      {
        question: "Mevcut kurumsal sitemizi SEO kaybı yaşamadan taşır mısınız?",
        answer: "Taşıma öncesinde URL ve içerik envanteri çıkarılır, gerekli 301 yönlendirmeleri planlanır. Teknik önlemler kayıp riskini azaltabilir ancak arama sıralaması garanti edilemez.",
      },
      {
        question: "Ataşehir için proje süresi ve fiyatlandırma nasıl belirlenir?",
        answer: "Fiyat; sayfa sayısı, dil seçenekleri, entegrasyon ve özel yazılım kapsamına göre belirlenir. İhtiyaç analizinin ardından sabit kapsamlı, sürpriz maliyet içermeyen bir teklif sunuyoruz.",
      },
    ],
    closing: "Ataşehir'de kurumsal hedeflerinize uygun web projesinin kapsamını birlikte netleştirebiliriz.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "bakirkoy",
    provinceName: "İstanbul",
    districtName: "Bakırköy",
    locative: "Bakırköy'de",
    title: "Bakırköy Web Tasarım ve Web Yazılımı",
    metaTitle: "Bakırköy Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Bakırköy'deki sağlık, perakende ve hizmet işletmeleri için randevu, rezervasyon ve satış odaklı web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Bakırköy'de klinik, mağaza ve restoranlar için randevu, rezervasyon ve e-ticaret odaklı web tasarım. Yerel SEO ve mobil hız optimizasyonu dahil.",
    intro: "Bakırköy, yoğun perakende trafiği, sağlık kurumları ve köklü esnaf kültürünün bir arada olduğu merkezi bir ilçe. Fiziksel müşteri akışını dijital kanalla birleştiren, hızlı ve dönüşüm odaklı web siteleri tasarlıyoruz.",
    needParagraph: "Bakırköy'de müşteri çoğu zaman önce çevrimiçi araştırıp sonra dükkâna geliyor. Bu yüzden hizmet sayfalarının yerel aramada görünmesi, mobilde hızlı açılması ve randevu ya da sipariş akışının tek dokunuşla tamamlanması gerekiyor.",
    focusBullets: [
      "**Randevu ve rezervasyon:** Klinik, kuaför ve salonlar için online randevu akışları.",
      "**Yerel SEO odaklı site:** Google Haritalar ve yerel aramalarla uyumlu sayfa yapısı.",
      "**Mobil performans:** Kampanya ve görsel ağırlıklı sayfalarda Core Web Vitals ölçütlerini gözeten tasarım.",
    ],
    sectorNotes: [
      "Poliklinik ve sağlık işletmeleri için KVKK'ya uygun randevu ve bilgilendirme sistemleri kuruyoruz.",
      "Kafe, restoran ve mağazalara menü, rezervasyon ve online sipariş akışları ekliyoruz.",
      "Bölgedeki esnaf ve hizmet işletmelerine Google Haritalar uyumlu yerel web siteleri hazırlıyoruz.",
    ],
    areas: ["Bahçelievler", "Bakırköy sahili", "Şirinevler"],
    faqs: [
      {
        question: "Bakırköy'deki işletmem için yerel arama uyumlu bir site kurabilir misiniz?",
        answer: "Sayfa başlıkları, yapılandırılmış veri ve işletmenin doğru konum/hizmet bilgilerinin sunulması planlanabilir. Bu çalışmalar görünürlük hedefler; belirli bir sıralama garanti etmez.",
      },
      {
        question: "Online randevu sistemi kurmak ne kadar sürer?",
        answer: "Süre; randevu kuralları, kullanıcı rolleri, bildirimler ve varsa mevcut sistem entegrasyonları netleştikten sonra belirlenir.",
      },
      {
        question: "Sitem mobilde neden yavaş, bunu düzeltebilir misiniz?",
        answer: "Önce görsel boyutları, üçüncü taraf betikler ve önbellekleme davranışı ölçülür; ardından bulgulara göre teknik optimizasyon planı hazırlanır.",
      },
    ],
    closing: "Bakırköy'deki işletmenizin dijital vitrinini güçlendirmek için ihtiyaçlarınızı konuşalım.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "basaksehir",
    provinceName: "İstanbul",
    districtName: "Başakşehir",
    locative: "Başakşehir'de",
    title: "Başakşehir Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Başakşehir Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Başakşehir'deki sağlık kurumları, lojistik firmaları ve yeni yerleşim bölgelerindeki işletmeler için web tasarım ve yazılım çözümleri.",
    ozelMetaDesc: "Başakşehir'de sağlık, lojistik ve eğitim kurumlarına yönelik web tasarım, kurumsal portal ve entegre yazılım çözümleri.",
    intro: "Başakşehir, görece yeni yerleşim dokusu, şehir hastanesi çevresindeki sağlık ekosistemi ve lojistik aksıyla öne çıkıyor. Bu ekosistemdeki kurumlar için bilgi yoğun ve entegrasyona açık web çözümleri geliştiriyoruz.",
    needParagraph: "Başakşehir'de sağlık, eğitim ve lojistik kurumları çok sayıda paydaşla çalışıyor. Bu kurumların web sitesi; bilgilendirme, başvuru ve operasyon takibini tek çatı altında toplayabildiğinde gerçek değer üretiyor.",
    focusBullets: [
      "**Kurumsal portal:** Başvuru, duyuru ve doküman yönetimi tek panelde.",
      "**Entegrasyon:** ERP, CRM ve lojistik sistemlerine güvenli bağlantı.",
      "**Erişilebilirlik ve çok dillilik:** Kurum standartlarına uygun erişilebilir arayüzler.",
    ],
    sectorNotes: [
      "Sağlık kurumları için hasta bilgilendirme ve ön başvuru akışları tasarlıyoruz.",
      "Lojistik ve depo firmalarına sevkiyat ve stok takibini web üzerinden izleyen paneller kuruyoruz.",
      "Eğitim kurumlarına kayıt, duyuru ve çok dilli tanıtım siteleri hazırlıyoruz.",
    ],
    areas: ["Kayaşehir", "Başakşehir merkez", "Bahçeşehir"],
    faqs: [
      {
        question: "Başakşehir'de sağlık kurumları için KVKK uyumlu site yapıyor musunuz?",
        answer: "Evet. Hasta başvuru formlarında veri minimizasyonu, güvenli form gönderimi ve gizlilik metinleriyle KVKK uyumunu gözetiyoruz.",
      },
      {
        question: "Mevcut sistemlerimize (ERP, CRM) entegre bir web portalı kurulabilir mi?",
        answer: "Kurulabilir. Mevcut sistemlerinizin API'si üzerinden güvenli veri akışı sağlayan özel bir katman geliştiriyoruz.",
      },
      {
        question: "Başakşehir'de yeni açılan bir işletme için sıfırdan site kurabilir misiniz?",
        answer: "Evet; alan adı, tasarım, içerik yapısı ve teknik SEO dahil süreci uçtan uca yönetiyoruz.",
      },
    ],
    closing: "Başakşehir'deki kurumunuzun dijital ihtiyaçlarını birlikte planlayalım.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "besiktas",
    provinceName: "İstanbul",
    districtName: "Beşiktaş",
    locative: "Beşiktaş'ta",
    title: "Beşiktaş Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Beşiktaş Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Beşiktaş'taki finans, medya, turizm ve gastronomi işletmeleri için prestijli, hızlı ve dönüşüm odaklı web tasarım ve yazılım çözümleri.",
    ozelMetaDesc: "Beşiktaş'ta finans, medya ve gastronomi markaları için prestijli web tasarım, rezervasyon ve kurumsal portal çözümleri.",
    intro: "Beşiktaş; finans kurumları, medya, üniversiteler ve canlı gastronomi sahnesinin iç içe geçtiği, marka algısının yüksek olduğu bir ilçe. Estetik ile performansı birleştiren, itibar yönetimine uygun web deneyimleri tasarlıyoruz.",
    needParagraph: "Beşiktaş'ta müşteri kitlesi görsel ve içerik açısından talepkâr. Sitenin yavaş açılması ya da eski görünmesi, güçlü bir markada bile güveni hızla zayıflatıyor; bu yüzden tasarım kalitesi ile teknik hız birlikte ele alınmalı.",
    focusBullets: [
      "**Premium tasarım:** Marka değerini yansıtan, özgün ve modern arayüzler.",
      "**Rezervasyon ve etkinlik:** Restoran, etkinlik ve üyelik akışları.",
      "**İçerik yönetimi:** Ekibinizin kod desteği olmadan güncelleyebileceği panel.",
    ],
    sectorNotes: [
      "Restoran ve kafe işletmeleri için menü, rezervasyon ve etkinlik duyuru sistemleri kuruyoruz.",
      "Finans ve danışmanlık markalarına güven veren kurumsal siteler ve müşteri portalleri hazırlıyoruz.",
      "Medya ve yaratıcı ekipler için hızlı yayın akışına uygun içerik altyapıları geliştiriyoruz.",
    ],
    areas: ["Levent", "Etiler", "Ortaköy"],
    faqs: [
      {
        question: "Beşiktaş'taki markamız için özgün tasarım yapıyor musunuz?",
        answer: "Evet, hazır tema kullanmadan markanıza özel arayüz tasarlıyoruz; tasarım sürecine sizi de dahil ediyoruz.",
      },
      {
        question: "Restoranımız için online rezervasyon ve menü yönetimi kurulabilir mi?",
        answer: "Kurulabilir. Rezervasyon takvimi, masa yönetimi ve kolay güncellenebilir menü panelini birlikte kurabiliriz.",
      },
      {
        question: "Sitemizin içeriğini kendimiz güncelleyebilir miyiz?",
        answer: "Evet. İçerik yönetim panelini eğitimle devrediyoruz; teknik bilgi gerekmeden sayfa ve görsel güncelleyebilirsiniz.",
      },
    ],
    closing: "Beşiktaş'taki markanızın dijital itibarını güçlendirecek projeyi konuşalım.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "beylikduzu",
    provinceName: "İstanbul",
    districtName: "Beylikdüzü",
    locative: "Beylikdüzü'nde",
    title: "Beylikdüzü Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Beylikdüzü Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Beylikdüzü'ndeki perakende, fuar ve hizmet işletmeleri için hızlı, mobil öncelikli web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Beylikdüzü'nde perakende, fuarcılık ve hizmet işletmelerine yönelik mobil öncelikli web tasarım, e-ticaret ve rezervasyon çözümleri.",
    intro: "Beylikdüzü, hızla büyüyen konut dokusu, yoğun perakende trafiği ve fuar merkezi çevresindeki iş hareketliliğiyle dikkat çekiyor. Bu bölgede çoğunlukla mobilden gelen ziyaretçiler için hızlı ve net web deneyimleri kuruyoruz.",
    needParagraph: "Beylikdüzü'nde arama trafiğinin büyük kısmı mobil cihazlardan geliyor. Bu yüzden tasarımın önce telefon ekranında kusursuz çalışması, ürün ve hizmet bilgisinin birkaç dokunuşta bulunması kritik.",
    focusBullets: [
      "**Mobil öncelikli tasarım:** Küçük ekranda hızlı ve okunaklı arayüzler.",
      "**E-ticaret:** Ürün, sepet ve kargo entegrasyonlu mağazalar.",
      "**Yerel kampanya sayfaları:** Hızlı yüklenen, dönüşüm odaklı açılış sayfaları.",
    ],
    sectorNotes: [
      "Perakende mağazaları için ürün katalogları ve online satış altyapıları hazırlıyoruz.",
      "Fuar ve etkinlik katılımcıları için tanıtım ve kayıt odaklı davet sayfaları kuruyoruz.",
      "Bölgedeki hizmet işletmelerine mobil hızlı, yerel arama uyumlu siteler tasarlıyoruz.",
    ],
    areas: ["Esenyurt", "Büyükçekmece", "Yakuplu"],
    faqs: [
      {
        question: "Beylikdüzü'nde e-ticaret sitesi kurmak için nereden başlıyoruz?",
        answer: "Ürün sayısı, kargo ve ödeme altyapınızı konuşarak başlıyoruz; ardından ihtiyaca uygun mağaza altyapısını kuruyoruz.",
      },
      {
        question: "Sitemin mobilde hızlı olması satışa gerçekten etki eder mi?",
        answer: "Evet. Mobilde hızlı açılan sayfalar hem kullanıcıyı elde tutar hem de arama motoru sıralamasını destekler.",
      },
      {
        question: "Fuar için geçici bir tanıtım sayfası yapıyor musunuz?",
        answer: "Yapıyoruz. Etkinlik tarihine göre planlanan, kayıt/iletişim formu içeren hızlı açılış sayfaları hazırlayabiliriz.",
      },
    ],
    closing: "Beylikdüzü'ndeki işletmeniz için mobil hızlı bir web projesini birlikte kurgulayalım.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "esenyurt",
    provinceName: "İstanbul",
    districtName: "Esenyurt",
    locative: "Esenyurt'ta",
    title: "Esenyurt Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Esenyurt Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Esenyurt'taki üretim, perakende ve hizmet işletmeleri için ekonomik ve ölçeklenebilir web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Esenyurt'ta üretim, toptan ticaret ve perakende işletmelerine yönelik web tasarım, stok takibi ve sipariş yazılımı çözümleri.",
    intro: "Esenyurt, İstanbul'un en kalabalık ilçelerinden biri; üretim atölyeleri, toptan ticaret ve perakende yoğun bir ekonomik dokusu var. Bu yoğunluğa uygun, pratik ve maliyet-etkin dijital çözümler geliştiriyoruz.",
    needParagraph: "Esenyurt'ta birçok işletme aynı anda üretim, toptan ve perakende satışı bir arada yürütüyor. Numune gösterimi, sipariş takibi ve müşteri iletişimini tek bir web arayüzünde toplamak operasyonel yükü azaltıyor.",
    focusBullets: [
      "**Katalog ve toptan satış:** Bayi ve toptan sipariş akışlarına uygun altyapı.",
      "**Sipariş takip paneli:** Üretim ve sevkiyat durumunu tek ekranda görme.",
      "**Bütçe dostu kurulum:** İhtiyaca göre ölçeklendirilebilen paket yaklaşımı.",
    ],
    sectorNotes: [
      "Tekstil ve üretim atölyeleri için ürün vitrini ve toptan sipariş sistemleri kuruyoruz.",
      "Perakende işletmelerine stok ve sipariş takibini kolaylaştıran web panelleri hazırlıyoruz.",
      "Hizmet işletmelerine düşük bütçeyle hızlı yayına alınan tanıtım siteleri tasarlıyoruz.",
    ],
    areas: ["Beylikdüzü", "Avcılar", "Haramidere"],
    faqs: [
      {
        question: "Esenyurt'ta toptan satış yapan işletmem için özel bir panel kurulur mu?",
        answer: "Kurulur. Bayi bazlı fiyat, sipariş ve stok takibini yönetebileceğiniz bir panele sahip olabilirsiniz.",
      },
      {
        question: "Küçük bir işletmeyim, bütçeme uygun çözüm var mı?",
        answer: "Var. İhtiyaçları önceliklendirip başlangıçta sade, büyüdükçe eklenebilir bir yapıyla ilerliyoruz.",
      },
      {
        question: "Sitem çok dilli olabilir mi? Bölgede farklı dillerden müşterimiz var.",
        answer: "Evet. Türkçe, İngilizce ve ihtiyaca göre Arapça gibi ek dillerde içerik yapısı kurabiliriz.",
      },
    ],
    closing: "Esenyurt'taki işletmenizin üretim ve satış akışına uygun web çözümünü planlayalım.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "kadikoy",
    provinceName: "İstanbul",
    districtName: "Kadıköy",
    locative: "Kadıköy'de",
    title: "Kadıköy Web Tasarım, E-Ticaret ve Özel Yazılım",
    metaTitle: "Kadıköy Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Kadıköy'deki girişimler, ajanslar, kafe-restoranlar ve e-ticaret markaları için tasarım odaklı web ve özel yazılım çözümleri.",
    ozelMetaDesc: "Kadıköy'de startuplar, ajanslar ve gastronomi markaları için tasarım odaklı web sitesi, e-ticaret ve özel yazılım geliştirme.",
    intro: "Kadıköy; startupların, tasarım stüdyolarının, bağımsız markaların ve canlı bir gastronomi sahnesinin merkezi. Hızlı karar alan, estetiğe ve içeriğe önem veren bir kitleye hitap eden dijital ürünler tasarlıyoruz.",
    needParagraph: "Kadıköy'de işletmeler genelde dijital ve yaratıcı sektörlerde faaliyet gösteriyor; bu kitlenin siteyi ilk saniyelerde değerlendirdiği bir ortamda tasarım kalitesi, hız ve içerik netliği bir bütün olarak ele alınmalı.",
    focusBullets: [
      "**Marka odaklı web:** Özgün görsel dil, akıcı animasyon ve net anlatım.",
      "**E-ticaret ve abonelik:** Satış, kargo ve abonelik akışları.",
      "**Hızlı MVP:** Yeni girişimler için kısa sürede yayına hazır ürünler.",
    ],
    sectorNotes: [
      "Girişimler için kısa sürede yayına alınan MVP ve yatırımcı sunumuna uygun web ürünleri geliştiriyoruz.",
      "Kafe, restoran ve bağımsız markalar için menü, rezervasyon ve online satış çözümleri kuruyoruz.",
      "Yaratıcı ajanslar ve portfolyo sahipleri için hızlı, etkileyici vitrin siteleri tasarlıyoruz.",
    ],
    areas: ["Ataşehir", "Üsküdar", "Moda"],
    faqs: [
      {
        question: "Kadıköy'de yeni girişimim için hızlı bir web ürünü çıkarabilir misiniz?",
        answer: "Evet. Önce en kritik işlevleri belirleyip kısa sürede yayına alıyor, ardından veriye göre geliştiriyoruz.",
      },
      {
        question: "Tasarımı kendimiz yapsak, siz sadece geliştirme yapar mısınız?",
        answer: "Yapabiliriz. Hazır tasarımınızı alıp teknik olarak hızlı ve bakımı kolay biçimde hayata geçirebiliriz.",
      },
      {
        question: "Kafenin menüsünü ve rezervasyonunu tek panelden yönetebilir miyiz?",
        answer: "Evet, kolayca güncellenebilen menü ve rezervasyon akışını aynı yönetim panelinde birleştirebiliriz.",
      },
    ],
    closing: "Kadıköy'deki markanız için tasarım ve teknolojiyi bir araya getiren projeyi konuşalım.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "kagithane",
    provinceName: "İstanbul",
    districtName: "Kağıthane",
    locative: "Kağıthane'de",
    title: "Kağıthane Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Kağıthane Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Kağıthane'deki tekstil, medya ve yeni iş merkezlerindeki firmalar için kurumsal web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Kağıthane'de tekstil, medya ve kurumsal ofisler için kurumsal web sitesi, içerik yönetimi ve özel yazılım geliştirme.",
    intro: "Kağıthane, tekstil geçmişini yeni iş merkezleri ve ofis yapılarıyla birleştiren, Mecidiyeköy aksına yakın bir ilçe. Üretim ve kurumsal hizmeti bir arada yürüten firmalar için dengeli web altyapıları kuruyoruz.",
    needParagraph: "Kağıthane'deki firmaların bir kısmı üretim, bir kısmı kurumsal hizmet tarafında. Ortak ihtiyaç ise ürün ve hizmeti net anlatan, teklif talebini kolaylaştıran ve kurumsal güven veren bir web varlığı.",
    focusBullets: [
      "**Kurumsal site:** Referans, hizmet ve iletişim odaklı net yapı.",
      "**Ürün katalogları:** Tekstil ve üretim için görsel katalog altyapısı.",
      "**Teklif akışı:** Form, dosya yükleme ve hızlı dönüş süreçleri.",
    ],
    sectorNotes: [
      "Tekstil ve konfeksiyon firmalarına sezonluk ürün katalogları ve toptan iletişim akışları kuruyoruz.",
      "Kurumsal hizmet firmalarına güven veren referans ve hizmet sayfaları hazırlıyoruz.",
      "Ofis ve operasyon yönetimi için iç süreç panelleri geliştiriyoruz.",
    ],
    areas: ["Şişli", "Mecidiyeköy", "Gültepe"],
    faqs: [
      {
        question: "Kağıthane'deki tekstil firmamız için toptan satış sitesi kuruyor musunuz?",
        answer: "Evet. Ürünleri bayilere özel fiyat ve sipariş akışıyla sunan bir yapı kurabiliriz.",
      },
      {
        question: "Mevcut sitemizi modernleştirirken sıralamaları korur musunuz?",
        answer: "Yeniden yapılandırmada mevcut URL'leri ve SEO sinyallerini mümkün olduğunca koruyarak ilerliyoruz.",
      },
      {
        question: "İçerikleri kendimiz girebilir miyiz?",
        answer: "Evet, yönetim paneli ve kısa eğitimle içerikleri kendiniz güncelleyebilirsiniz.",
      },
    ],
    closing: "Kağıthane'deki firmanız için kurumsal web ve teklif akışını birlikte kuralım.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "kartal",
    provinceName: "İstanbul",
    districtName: "Kartal",
    locative: "Kartal'da",
    title: "Kartal Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Kartal Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Kartal'daki sanayi, lojistik ve hizmet işletmeleri için hızlı, güvenli web tasarım ve takip panelleri içeren özel yazılım çözümleri.",
    ozelMetaDesc: "Kartal'da sanayi, lojistik ve hizmet firmalarına yönelik kurumsal web tasarım, sevkiyat takip panelleri ve özel yazılım geliştirme.",
    intro: "Kartal; sanayi tesisleri, lojistik depoları ve sahil bandı boyunca uzanan yerleşimleriyle İstanbul'un doğu aksında üretken bir ilçe. Hem üretimi hem yerel hizmeti destekleyen web altyapıları kuruyoruz.",
    needParagraph: "Kartal'da birçok firma üretim ve sevkiyat tarafında çalışıyor. Bu firmalarda web sitesi yalnızca tanıtım değil; teklif, takip ve müşteri bilgilendirmesini bir arada yürüten bir araç olmalı.",
    focusBullets: [
      "**Kurumsal site:** Hizmet ve referans odaklı net yapı.",
      "**Takip panelleri:** Sevkiyat ve sipariş durumu için şeffaf ekran.",
      "**Performans:** Yoğun trafikte dahi stabil ve hızlı çalışma.",
    ],
    sectorNotes: [
      "Lojistik firmalarına sevkiyat takibi ve müşteri bilgilendirme panelleri kuruyoruz.",
      "Üretim işletmelerine ürün kataloğu ve teklif akışı yönetimi hazırlıyoruz.",
      "Hizmet işletmelerine yerel arama uyumlu, hızlı tanıtım siteleri tasarlıyoruz.",
    ],
    areas: ["Pendik", "Maltepe", "Sancaktepe"],
    faqs: [
      {
        question: "Kartal'da lojistik firmamız için takip sistemi kurulur mu?",
        answer: "Kurulur. Gönderi durumunu müşterinizle paylaşan bir panel ve entegrasyon geliştirebiliriz.",
      },
      {
        question: "Sanayi bölgesindeki firmalarla nasıl çalışıyorsunuz?",
        answer: "Proje başlangıcında bir araya geliyor, geliştirme sürecinde düzenli çevrimiçi toplantılarla ilerliyoruz.",
      },
      {
        question: "Büyük katalogları site performansı düşmeden yayınlayabilir miyiz?",
        answer: "Evet; görsel optimizasyonu ve uygun altyapıyla performansı koruyan bir katalog kuruyoruz.",
      },
    ],
    closing: "Kartal'daki firmanız için performansı önceleyen web altyapısını birlikte kuralım.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "maltepe",
    provinceName: "İstanbul",
    districtName: "Maltepe",
    locative: "Maltepe'de",
    title: "Maltepe Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Maltepe Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Maltepe'deki eğitim, sağlık ve hizmet işletmeleri için hızlı, mobil uyumlu web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Maltepe'de eğitim kurumları, klinikler ve hizmet işletmelerine yönelik web tasarım, kayıt ve randevu sistemleri.",
    intro: "Maltepe; sahil boyunca uzanan yerleşimleri, okulları ve yerel hizmet işletmeleriyle hızla gelişen bir ilçe. Kurumların bilgi, kayıt ve başvuru süreçlerini web üzerinden kolaylaştırıyoruz.",
    needParagraph: "Maltepe'de eğitim ve sağlık hizmeti veren kurumlar yoğun başvuru alıyor. Bilginin ve başvurunun tek bir hızlı web deneyiminde toplandığı yapılar, hem aileyi hem kurumu rahatlatıyor.",
    focusBullets: [
      "**Kayıt ve başvuru:** Online form ve belge yükleme akışları.",
      "**Randevu:** Klinik ve danışmanlık için randevu takvimi.",
      "**Yerel SEO:** Bölgeye özel arama görünürlüğü.",
    ],
    sectorNotes: [
      "Kurs ve okullara yönelik ön kayıt, bilgilendirme ve veli iletişim akışları kuruyoruz.",
      "Klinik ve sağlık işletmelerine randevu ve bilgilendirme altyapıları hazırlıyoruz.",
      "Yerel hizmet işletmelerine hızlı, mobil uyumlu tanıtım siteleri tasarlıyoruz.",
    ],
    areas: ["Kadıköy", "Kartal", "Ataşehir"],
    faqs: [
      {
        question: "Maltepe'deki kursumuz için online kayıt sistemi kurulur mu?",
        answer: "Kurulur; ön kayıt formu, bilgilendirme ve başvuru takibi için bir yapı oluşturabiliriz.",
      },
      {
        question: "Kliniğimiz için randevu sistemi kuruyor musunuz?",
        answer: "Evet, hekim ve hizmet bazlı randevu akışı ile hatırlatma altyapısı kurgulayabiliriz.",
      },
      {
        question: "Sitemizi kendimiz güncelleyebilir miyiz?",
        answer: "Evet; yönetim panelini kullanım eğitimiyle birlikte devrediyoruz.",
      },
    ],
    closing: "Maltepe'deki kurumunuz için bilgi ve başvuru akışını web üzerinde güçlendirelim.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "pendik",
    provinceName: "İstanbul",
    districtName: "Pendik",
    title: "Pendik Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Pendik Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Pendik'teki sanayi, lojistik ve havacılık destek işletmeleri için kurumsal web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Pendik'te sanayi, lojistik ve havacılık destek firmalarına yönelik kurumsal web sitesi, takip sistemi ve özel yazılım geliştirme.",
    locative: "Pendik'te",
    intro: "Pendik; havalimanı çevresi, tersane ve sanayi bölgeleriyle hem üretim hem ulaştırma tarafında güçlü bir ilçe. Buradaki firmaların operasyonunu dijitalde şeffaflaştıran çözümler geliştiriyoruz.",
    needParagraph: "Pendik'te faaliyet gösteren firmalar çoğunlukla çok paydaşlı ve operasyon yoğun. Doğru kurgulanmış bir web sitesi; teklif, takip ve iletişimi tek noktada toplayarak ekiplerin işini kolaylaştırıyor.",
    focusBullets: [
      "**Kurumsal site:** Hizmet ve referans odaklı, güven veren yapı.",
      "**Operasyon paneli:** Sipariş, sevkiyat ve talep takibi.",
      "**Çok dilli yapı:** Farklı pazarlara hitap eden içerik.",
    ],
    sectorNotes: [
      "Üretim firmalarına ürün kataloğu ve teklif yönetimi akışları kuruyoruz.",
      "Lojistik ve ulaştırma işletmelerine takip panelleri geliştiriyoruz.",
      "Havacılık çevresindeki hizmet firmalarına kurumsal tanıtım siteleri tasarlıyoruz.",
    ],
    areas: ["Kartal", "Pendik", "Tuzla"],
    faqs: [
      {
        question: "Pendik'teki firmamız için çok dilli site yapılabilir mi?",
        answer: "Evet; ihracat odaklı firmalar için Türkçe ve İngilizce başta olmak üzere çok dilli yapı kuruyoruz.",
      },
      {
        question: "Mevcut sitemizi kaybetmeden yenileyebilir misiniz?",
        answer: "Evet, mevcut içerik ve SEO değerini koruyarak yeni tasarıma geçiş yapıyoruz.",
      },
      {
        question: "Proje sonrası destek veriyor musunuz?",
        answer: "Evet; bakım ve geliştirme desteğini proje sonrasında da sürdürüyoruz.",
      },
    ],
    closing: "Pendik'teki firmanız için kapsamlı web projesini birlikte planlayalım.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "sariyer",
    provinceName: "İstanbul",
    districtName: "Sarıyer",
    locative: "Sarıyer'de",
    title: "Sarıyer Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Sarıyer Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Sarıyer'deki turizm, eğitim ve hizmet işletmeleri için şık ve hızlı web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Sarıyer'de turizm, eğitim ve yerel hizmet işletmelerine yönelik rezervasyon, bilgi ve kurumsal web tasarım çözümleri.",
    intro: "Sarıyer; Boğaz kıyısı, üniversiteleri ve güçlü yerel hizmet ekonomisiyle İstanbul'un kuzeyinde farklı bir profil sunuyor. Turizm, eğitim ve hizmet ağırlıklı işletmeler için etkili web deneyimleri tasarlıyoruz.",
    needParagraph: "Sarıyer'de hem yerli hem yabancı ziyaretçi profili var. Bu nedenle sitenin dil seçenekleri, rezervasyon akışı ve bölgeye dair net bilgi sunması, işletmenin görünürlüğünü doğrudan etkiliyor.",
    focusBullets: [
      "**Rezervasyon ve menü:** Restoran ve konaklama için kolay akış.",
      "**Çok dilli içerik:** Yerli ve yabancı ziyaretçiye hitap.",
      "**Şık tasarım:** Marka algısını güçlendiren arayüz.",
    ],
    sectorNotes: [
      "Restoran ve kafeler için menü, rezervasyon ve etkinlik sistemleri kuruyoruz.",
      "Konaklama işletmelerine çok dilli tanıtım ve talepe dayalı rezervasyon akışları hazırlıyoruz.",
      "Eğitim kurumlarına bilgilendirme ve başvuru içeren siteler tasarlıyoruz.",
    ],
    areas: ["Şişli", "Beşiktaş", "Maslak"],
    faqs: [
      {
        question: "Sarıyer'deki işletmemiz için çok dilli site yapıyor musunuz?",
        answer: "Evet; turizm ve hizmet işletmeleri için İngilizce dahil çok dilli içerik yapıları kuruyoruz.",
      },
      {
        question: "Rezervasyon sistemini kendimiz yönetebilir miyiz?",
        answer: "Evet, kullanımı kolay bir yönetim paneli ve eğitimle size devrediyoruz.",
      },
      {
        question: "Tasarımı bölgenin karakterine uygun yapar mısınız?",
        answer: "Evet; markanızı ve hedef kitlenizi dikkate alarak size özel tasarım geliştiriyoruz.",
      },
    ],
    closing: "Sarıyer'deki işletmenizin dijital vitrinini birlikte güçlendirelim.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "sisli",
    provinceName: "İstanbul",
    districtName: "Şişli",
    locative: "Şişli'de",
    title: "Şişli Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Şişli Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Şişli'deki kurumsal firmalar, sağlık kurumları ve perakende markaları için güçlü web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Şişli merkezli firmalar için kurumsal web sitesi, e-ticaret ve entegre yazılım çözümleri. XipSoft marka ofisi Mecidiyeköy'de.",
    intro: "Şişli; farklı ölçeklerdeki ofis, sağlık, perakende ve profesyonel hizmetlerin bir arada bulunduğu merkezi bir İstanbul ilçesidir. Bu çeşitlilik, işletmelerin dijital kanallarında hizmet kapsamını ve başvuru adımlarını anlaşılır sunmasını önemli kılar.",
    needParagraph: "Şişli'de firmalar prestij ve operasyonel verimliliği birlikte arıyor. Kurumsal kimliği doğru yansıtan, entegrasyona açık ve hızlı bir web altyapısı bu beklentiyi karşılıyor.",
    focusBullets: [
      "**Kurumsal site:** Referans, hizmet ve iletişim odaklı yapı.",
      "**E-ticaret:** Sepet, ödeme ve kargo entegrasyonlu mağaza.",
      "**Entegrasyon:** CRM ve ERP bağlantılı dijital süreçler.",
    ],
    sectorNotes: [
      "Kurumsal firmalara güven veren, referans odaklı kurumsal siteler hazırlıyoruz.",
      "Sağlık kurumlarına bilgilendirme ve randevu içeren altyapılar kuruyoruz.",
      "Perakende markalarına e-ticaret ve kampanya yönetimi çözümleri geliştiriyoruz.",
    ],
    areas: ["Mecidiyeköy", "Kağıthane", "Beşiktaş"],
    faqs: [
      {
        question: "Şişli'deki işletmem için proje görüşmesini nasıl yapabiliriz?",
        answer: "İlk kapsam görüşmesi çevrimiçi planlanabilir. Gereken toplantı biçimi ve takvim proje kapsamı netleştirilirken birlikte belirlenir.",
      },
      {
        question: "Mevcut kurumsal sitemizi baştan kurabilir misiniz?",
        answer: "Evet; kurumsal hedeflerinize uygun tasarımı sıfırdan planlayıp kurabiliriz.",
      },
      {
        question: "E-ticaret altyapınız neleri içeriyor?",
        answer: "Ürün yönetimi, sepet, ödeme ve kargo entegrasyonu gibi temel bileşenleri içeren bir yapı kuruyoruz.",
      },
    ],
    closing: "Şişli'deki kurumunuz için güçlü web altyapısını birlikte planlayalım.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "umraniye",
    provinceName: "İstanbul",
    districtName: "Ümraniye",
    locative: "Ümraniye'de",
    title: "Ümraniye Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Ümraniye Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Ümraniye'deki sanayi, perakende ve e-ticaret işletmeleri için hızlı web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Ümraniye'de sanayi, perakende ve e-ticaret işletmelerine yönelik kurumsal web tasarım, entegrasyon ve yazılım çözümleri.",
    intro: "Ümraniye; organize sanayi bölgesi, büyük alışveriş merkezleri ve geniş konut dokusuyla İstanbul'un en hareketli ilçelerinden. Hem üretim hem perakende tarafındaki işletmelere web çözümleri üretiyoruz.",
    needParagraph: "Ümraniye'deki işletmelerin çoğu hem fiziksel hem dijital satışı birlikte yürütüyor. Bu işletmeler için ürün ve hizmetlerin net sunulduğu, hızlı ve entegrasyona açık siteler gerekiyor.",
    focusBullets: [
      "**Kurumsal ve ürün sitesi:** Net katalog ve güven veren yapı.",
      "**E-ticaret:** Ürün, sepet ve kargo entegrasyonu.",
      "**Entegrasyon:** Mevcut sistemlerle veri alışverişi.",
    ],
    sectorNotes: [
      "Perakende işletmelerine e-ticaret ve kampanya altyapıları kuruyoruz.",
      "Sanayi firmalarına ürün kataloğu ve teklif akışı sistemleri hazırlıyoruz.",
      "Bölgedeki işletmelere arama motoru odaklı hızlı siteler tasarlıyoruz.",
    ],
    areas: ["Ataşehir", "Üsküdar", "Ümraniye"],
    faqs: [
      {
        question: "Ümraniye'deki işletmemize e-ticaret sitesi kuruyor musunuz?",
        answer: "Evet; ürün ve sipariş yönetimini kolaylaştıran tam kapsamlı bir e-ticaret altyapısı kurabiliriz.",
      },
      {
        question: "Mevcut ERP'mizle entegre olur mu?",
        answer: "Sisteminize uygun arayüzlerle entegrasyon sağlayacak şekilde çalışıyoruz.",
      },
      {
        question: "Siteyi sonradan kendimiz güncelleyebilir miyiz?",
        answer: "Evet; yönetim paneli ve eğitimle içerikleri bağımsız güncelleyebilirsiniz.",
      },
    ],
    closing: "Ümraniye'deki işletmeniz için web projesini birlikte planlayalım.",
  },
  {
    provinceSlug: "istanbul",
    districtSlug: "uskudar",
    provinceName: "İstanbul",
    districtName: "Üsküdar",
    locative: "Üsküdar'da",
    title: "Üsküdar Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Üsküdar Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Üsküdar'daki sağlık, turizm ve eğitim kurumları için hızlı web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Üsküdar'da sağlık, turizm ve eğitim kurumlarına yönelik web tasarım, randevu ve bilgilendirme sistemleri.",
    intro: "Üsküdar; tarihi dokusu, hastaneleri ve Boğaz'a bakan yerleşimleriyle İstanbul'un Anadolu yakasındaki köklü merkezlerinden biri. Sağlık, turizm ve eğitim ağırlıklı kurumlar için web altyapıları tasarlıyoruz.",
    needParagraph: "Üsküdar'da hizmet veren kurumlar hem bölge sakinine hem şehir dışından gelenlere hitap ediyor. Bu nedenle sitenin randevu, bilgilendirme ve yerel arama uyumunu birlikte sağlaması gerekiyor.",
    focusBullets: [
      "**Randevu akışı:** Klinik ve hizmet birimleri için kolay rezervasyon.",
      "**Kurumsal site:** Bilgi ve başvuru odaklı net yapı.",
      "**Yerel SEO:** Üsküdar ve çevresine yönelik arama görünürlüğü.",
    ],
    sectorNotes: [
      "Sağlık kurumlarına randevu ve hasta bilgilendirme akışları kuruyoruz.",
      "Turizm işletmelerine çok dilli tanıtım ve rezervasyon sayfaları hazırlıyoruz.",
      "Eğitim kurumlarına başvuru ve veli bilgilendirme siteleri tasarlıyoruz.",
    ],
    areas: ["Kadıköy", "Ümraniye", "Beylerbeyi"],
    faqs: [
      {
        question: "Üsküdar'daki kliniğimiz için randevu sistemi kurulur mu?",
        answer: "Evet; hekim ve şubeye göre randevu alan, hatırlatma yapan bir sistem kurabiliriz.",
      },
      {
        question: "Çok dilli site yapıyor musunuz?",
        answer: "Evet, ihtiyaca göre Türkçe ve İngilizce başta olmak üzere çok dilli yapı kuruyoruz.",
      },
      {
        question: "Yerel aramalarda üst sıralara çıkmak için ne yapıyorsunuz?",
        answer: "Yerel içerik, hızlı altyapı ve teknik SEO ile arama görünürlüğünüzü destekliyoruz.",
      },
    ],
    closing: "Üsküdar'daki kurumunuz için planlı bir web projesini birlikte kurallım.",
  },
  {
    provinceSlug: "ankara",
    districtSlug: "cankaya",
    provinceName: "Ankara",
    districtName: "Çankaya",
    locative: "Çankaya'da",
    title: "Çankaya Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Çankaya Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Çankaya'daki kurumsal firmalar, üniversiteler ve teknoloji işletmeleri için erişilebilir web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Çankaya'da kurumsal, eğitim ve teknoloji firmalarına yönelik web tasarım, kurumsal portal ve entegre yazılım geliştirme.",
    intro: "Çankaya; kamu kurumları, üniversiteler ve teknoloji–savunma sanayi ağırlıklı firmaların bulunduğu, Ankara'nın kurumsal merkezi. Bu profile uygun, erişilebilirlik odaklı web deneyimleri tasarlıyoruz.",
    needParagraph: "Çankaya'da kurumsal işlerde güven, şeffaflık ve erişilebilirlik öne çıkıyor. Site; bilgiyi net sunan, kurumsal kimliği doğru yansıtan ve mümkün olduğunca geniş bir kullanıcı kitlesine hitap eden bir yapı olmalı.",
    focusBullets: [
      "**Erişilebilirlik:** WCAG ilkelerini gözeten arayüzler.",
      "**Kurumsal site:** Net hizmet, referans ve iletişim yapısı.",
      "**Entegrasyon:** Mevcut sistemlerle veri akışı.",
    ],
    sectorNotes: [
      "Teknoloji ve savunma sanayi firmalarına kurumsal tanıtım ve ürün sayfaları hazırlıyoruz.",
      "Eğitim kurumlarına başvuru ve bilgilendirme odaklı siteler tasarlıyoruz.",
      "Kurumsal hizmet firmalarına güven veren, sade bir yapı kuruyoruz.",
    ],
    areas: ["Kızılay", "Çukurambar", "Çayyolu"],
    faqs: [
      {
        question: "Çankaya'da erişilebilir site yapıyor musunuz?",
        answer: "Evet; erişilebilirlik ilkelerini gözeten, klavye ve ekran okuyucu uyumlu arayüzler tasarlıyoruz.",
      },
      {
        question: "Kurumsal sitemiz için içerik yönetimi kolay olur mu?",
        answer: "Evet; ekibinizin teknik destek olmadan güncelleyebileceği bir yönetim paneli kuruyoruz.",
      },
      {
        question: "Mevcut sistemlerimizle entegre olur mu?",
        answer: "Sisteminizdeki uygun arayüzlerle güvenli entegrasyon sağlayacak şekilde çalışıyoruz.",
      },
    ],
    closing: "Çankaya'daki kurumunuz için kurumsal web çözümünü birlikte planlayalım.",
  },
  {
    provinceSlug: "ankara",
    districtSlug: "yenimahalle",
    provinceName: "Ankara",
    districtName: "Yenimahalle",
    locative: "Yenimahalle'de",
    title: "Yenimahalle Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Yenimahalle Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Yenimahalle'deki sanayi, savunma tedarik ve hizmet firmaları için web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Yenimahalle'de sanayi ve hizmet firmalarına yönelik kurumsal web tasarım, katalog ve yönetim paneli çözümleri.",
    intro: "Yenimahalle; OSTİM organize sanayi bölgesini barındıran, sanayi ile geniş konut dokusunu bir arada tutan bir Ankara ilçesi. Üretim ve hizmet firmalarına uygun web altyapıları kuruyoruz.",
    needParagraph: "Yenimahalle'de sanayi firmalarının çoğu teklif ve üretim takibine, hizmet firmaları ise görünürlüğe ihtiyaç duyuyor. İkisini de karşılayan dengeli bir web yapısı iş akışını kolaylaştırıyor.",
    focusBullets: [
      "**Kurumsal ve ürün site:** Net katalog ve güven veren yapı.",
      "**Teklif akışı:** Dosya yükleme ve hızlı dönüş.",
      "**Yönetim paneli:** Ürün ve içeriklerin kolay güncellenmesi.",
    ],
    sectorNotes: [
      "Üretim ve mühendislik firmalarına ürün vitrini ve teklif yönetimi kuruyoruz.",
      "Sanayi tedarikçilerine termin ve sipariş bilgisini paylaşan yapılar hazırlıyoruz.",
      "Hizmet firmalarına temiz, hızlı ve güven veren siteler tasarlıyoruz.",
    ],
    areas: ["Batıkent", "OSTİM", "Keçiören"],
    faqs: [
      {
        question: "Yenimahalle'deki sanayi firmamız için ürün vitrini kurulur mu?",
        answer: "Kurulur; ürünleri kategorilere ayırıp teklif alabileceğiniz bir yapı oluşturabiliriz.",
      },
      {
        question: "Teklif formu dosya kabul eder mi?",
        answer: "Evet; teknik çizim ve doküman yüklemeye uygun bir teklif formu kurabiliriz.",
      },
      {
        question: "Proje ne kadar sürede teslim edilir?",
        answer: "Kapsama göre değişir; küçük kurumsal siteler genelde hızlı, üretim süreleri ölçülebilir şekilde tamamlanır.",
      },
    ],
    closing: "Yenimahalle'deki firmanız için uygun web çözümünü birlikte belirleyelim.",
  },
  {
    provinceSlug: "ankara",
    districtSlug: "etimesgut",
    provinceName: "Ankara",
    districtName: "Etimesgut",
    locative: "Etimesgut'ta",
    title: "Etimesgut Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Etimesgut Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Etimesgut'taki savunma, havacılık ve sanayi çevresi firmaları için web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Etimesgut'ta savunma–havacılık ve sanayi çevresi firmalara yönelik web tasarım ve özel yazılım geliştirme.",
    intro: "Etimesgut; havacılık ve savunma çevresindeki firmalar ile Eryaman gibi planlı yerleşimleri bir arada barındıran bir Ankara ilçesi. Teknik ve kurumsal firmalara uygun web çözümleri geliştiriyoruz.",
    needParagraph: "Etimesgut'taki firmalar genellikle mühendislik ve teknik işler yapıyor. Bu firmalar için site; yetkinliği kanıtlayan bir vitrin ve yeni müşteri kazanımını kolaylaştıran bir kanal olmalı.",
    focusBullets: [
      "**Hizmet sayfaları:** Mühendislik ve teknik hizmetlerin net sunumu.",
      "**Kurumsal site:** Referans ve yetkinlik odaklı yapı.",
      "**İletişim akışı:** Hızlı dönüşe uygun form ve kanallar.",
    ],
    sectorNotes: [
      "Mühendislik ve teknik hizmet firmalarına referans odaklı siteler hazırlıyoruz.",
      "Sanayi çevresindeki tedarikçilere katalog ve teklif akışları kuruyoruz.",
      "Yerel hizmet firmalarına hızlı ve sade siteler tasarlıyoruz.",
    ],
    areas: ["Eryaman", "Kazan", "Yenimahalle"],
    faqs: [
      {
        question: "Etimesgut'taki mühendislik firmamız için site kurabilir misiniz?",
        answer: "Evet; hizmetlerinizi ve teknik yetkinliğinizi yansıtan bir kurumsal site kurabiliriz.",
      },
      {
        question: "İçerikleri kendimiz günceller miyiz?",
        answer: "Evet, yönetim paneli üzerinden ekibiniz içerik güncelleyebilir.",
      },
      {
        question: "Google'da görünürlük için destek veriyor musunuz?",
        answer: "Teknik SEO ve içerik yapısıyla görünürlüğünüzü destekliyoruz.",
      },
    ],
    closing: "Etimesgut'taki firmanız için kurumsal web projesini birlikte planlayalım.",
  },
  {
    provinceSlug: "ankara",
    districtSlug: "golbasi",
    provinceName: "Ankara",
    districtName: "Gölbaşı",
    locative: "Gölbaşı'nda",
    title: "Gölbaşı Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Gölbaşı Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Gölbaşı'ndaki eğitim, tarım ve yerel işletmeler için hızlı web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Gölbaşı'nda eğitim kurumları, tarım ve yerel hizmet işletmelerine yönelik web tasarım ve yazılım çözümleri.",
    intro: "Gölbaşı; gölleri, rekreasyon alanları ve planlı yerleşimleriyle Ankara'nın güneyinde ayrı bir profil taşıyor. Eğitim, tarım ve yerel hizmet ağırlıklı işletmelere web çözümleri üretiyoruz.",
    needParagraph: "Gölbaşı'ndaki işletmelerin önemli bölümü yerel müşteriye ve bilgiye dayalı çalışıyor. Bu nedenle sitenin hızlı yüklenmesi, net anlatması ve iletişimi kolaylaştırması gerekiyor.",
    focusBullets: [
      "**Kurumsal site:** Hizmet ve iletişim odaklı net yapı.",
      "**Başvuru ve kayıt:** Kurs ve hizmetler için online form.",
      "**Yerel SEO:** Gölbaşı ve çevresi için arama görünürlüğü.",
    ],
    sectorNotes: [
      "Eğitim ve kurs işletmelerine kayıt ve bilgilendirme akışları kuruyoruz.",
      "Tarım ve üretici işletmelerine tanıtım ve iletişim siteleri hazırlıyoruz.",
      "Yerel hizmet işletmelerine hızlı ve sade siteler tasarlıyoruz.",
    ],
    areas: ["Çankaya", "Bala", "Ahlatlıbel"],
    faqs: [
      {
        question: "Gölbaşı'ndaki kursumuz için kayıt sayfası kurulur mu?",
        answer: "Kurulur; başvuru vebilgilendirme formunu kapsayan bir sayfa oluşturabiliriz.",
      },
      {
        question: "Sitemiz mobilde nasıl görünür?",
        answer: "Tüm projelerimizde mobile öncelik vererek hızlı ve okunaklı bir deneyim sunuyoruz.",
      },
      {
        question: "Küçük işletmeler için uygun çözüm var mı?",
        answer: "Evet; ihtiyaca göre sadeleştirilebilen, ölçeklenebilir bir yapıyla ilerliyoruz.",
      },
    ],
    closing: "Gölbaşı'ndaki işletmeniz için uygun web projesini birlikte kuralım.",
  },
  {
    provinceSlug: "ankara",
    districtSlug: "kecioren",
    provinceName: "Ankara",
    districtName: "Keçiören",
    locative: "Keçiören'de",
    title: "Keçiören Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Keçiören Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Keçiören'deki sağlık, eğitim ve yerel ticaret işletmeleri için hızlı web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Keçiören'de sağlık, eğitim ve yerel ticaret işletmelerine yönelik web tasarım ve yazılım çözümleri.",
    intro: "Keçiören; yoğun yerleşimi, canlı yerel ticareti ve hizmet kurumlarıyla Ankara'nın en kalabalık ilçelerinden biri. Yerel işletmelere hızlı ve erişilebilir web çözümleri üretiyoruz.",
    needParagraph: "Keçiören'de günlük ihtiyaca dönük işletmeler ağırlıkta. Bu işletmeler için sitenin hızlı, mobil uyumlu ve yerel arama açısından görünür olması doğrudan müşteri getiriyor.",
    focusBullets: [
      "**Mobil hız:** Telefon ekranında hızlı açılan sayfalar.",
      "**Randevu ve iletişim:** Kolay erişim ve hızlı dönüş.",
      "**Yerel SEO:** Keçiören için arama görünürlüğü.",
    ],
    sectorNotes: [
      "Sağlık ve hizmet işletmelerine randevu ve iletişim odaklı siteler kuruyoruz.",
      "Eğitim faaliyetlerine tanıtım ve başvuru sayfaları hazırlıyorız.",
      "Yerel perakendeye hızlı tanıtım ve kampanya sayfaları tasarlıyoruz.",
    ],
    areas: ["Etlik", "Kalaba", "Keçiören"],
    faqs: [
      {
        question: "Keçiören'deki işletmemiz için hızlı site kuruyor musunuz?",
        answer: "Evet; performansı önceleyen, mobil hızlı bir site kuruyoruz.",
      },
      {
        question: "Dükkanımız için randevu veya sipariş formu eklenir mi?",
        answer: "Evet, ihtiyaca göre randevu veya sipariş formu ekleyebiliriz.",
      },
      {
        question: "Yerel aramalarda çıkmak için ne yapıyorsunuz?",
        answer: "Yerel içerik, hız ve teknik SEO ile arama görünürlüğünüzü destekliyoruz.",
      },
    ],
    closing: "Keçiören'deki işletmeniz için yerel odaklı web projesini konuşalım.",
  },
  {
    provinceSlug: "izmir",
    districtSlug: "konak",
    provinceName: "İzmir",
    districtName: "Konak",
    locative: "Konak'ta",
    title: "Konak Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Konak Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Konak'taki ticaret, turizm ve hizmet işletmeleri için hızlı web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "İzmir Konak'ta ticaret, turizm ve hizmet işletmelerine yönelik web tasarım, e-ticaret ve yazılım çözümleri.",
    intro: "Konak; tarihi çarşısı, limanı ve ticaret merkezleriyle İzmir'in kalbi konumunda. Ticaret, turizm ve hizmet ağırlıklı işletmeler için güçlü web altyapıları kuruyoruz.",
    needParagraph: "Konak'ta faaliyet gösteren işletmeler hem yerli hem yabancı müşteriye hitap ediyor. Bu nedenle sitenin çok dilli olabilmesi, ürün ve hizmeti net anlatması ve hızlı çalışması gerekiyor.",
    focusBullets: [
      "**Çok dilli site:** Yerli ve yabancı ziyaretçiye hitap.",
      "**E-ticaret:** Ürün, sepet ve kargo entegrasyonu.",
      "**Kurumsal site:** Güven veren net yapı.",
    ],
    sectorNotes: [
      "Ticaret ve toptan satış firmalarına ürün kataloğu ve sipariş akışları kuruyoruz.",
      "Turizm işletmelerine çok dilli tanıtım ve iletişim sayfaları hazırlıyoruz.",
      "Hizmet işletmelerine hızlı tanıtım siteleri tasarlıyoruz.",
    ],
    areas: ["Alsancak", "Bornova", "Karabağlar"],
    faqs: [
      {
        question: "Konak'taki ticaret firmamız için e-ticaret kuruyor musunuz?",
        answer: "Evet; ürün yönetimi ve sipariş akışını içeren bir e-ticaret altyapısı kuruyoruz.",
      },
      {
        question: "Yabancı müşteriler için İngilizce site yapılır mı?",
        answer: "Evet, ihtiyaca göre çok dilli bir yapı kuruyoruz.",
      },
      {
        question: "Mevcut sitemizi yenileyebilir misiniz?",
        answer: "Evet, mevcut içeriği koruyarak modern bir tasarıma geçiş yapabiliyoruz.",
      },
    ],
    closing: "Konak'taki işletmeniz için kapsamlı web projesini birlikte planlayalım.",
  },
  {
    provinceSlug: "izmir",
    districtSlug: "bornova",
    provinceName: "İzmir",
    districtName: "Bornova",
    locative: "Bornova'da",
    title: "Bornova Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Bornova Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Bornova'daki eğitim, sağlık ve hizmet işletmeleri için hızlı web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Bornova'da eğitim, sağlık ve hizmet işletmelerine yönelik web tasarım ve yazılım çözümleri.",
    intro: "Bornova; üniversite ve öğrenci nüfusunun canlı tuttuğu, sağlık ve hizmet işletmelerinin yoğunlaştığı bir İzmir ilçesi. Genç kitleye hitap eden hızlı web çözümleri üretiyoruz.",
    needParagraph: "Bornova'da hedef kitle çoğunlukla öğrenci ve genç çalışan. Bu kitle için sitenin hızlı, temiz ve kampanyaya açık olması dönüşüm açısından belirleyici.",
    focusBullets: [
      "**Hız:** Mobilde hızlı ve akıcı deneyim.",
      "**Kampanya sayfaları:** Etkinlik ve indirim için dönüşüm odaklı sayfalar.",
      "**Yerel SEO:** Bornova ve çevresi için görünürlük.",
    ],
    sectorNotes: [
      "Sağlık ve hizmet işletmelerine randevu ve bilgilendirme akışları kuruyoruz.",
      "Eğitim kurumlarına kayıt odaklı tanıtım siteleri hazırlıyoruz.",
      "Restoran ve kafeler için menü ve etkinlik sayfaları tasarlıyoruz.",
    ],
    areas: ["Konak", "Bornova", "Karşıyaka"],
    faqs: [
      {
        question: "Bornova'daki restoranımız için dijital menü kurulur mu?",
        answer: "Kurulur; kolay güncellenen menü ve iletişim sayfası oluşturabiliriz.",
      },
      {
        question: "Öğrencilere ulaşmak için ne yapıyorsunuz?",
        answer: "Hızlı ve sosyal medya ile uyumlu, mobil öncelikli bir yapı kuruyoruz.",
      },
      {
        question: "İçeriği sosyal medyadan yönetebilir miyiz?",
        answer: "Temel içerikleri panel üzerinden kolayca güncelleyebilirsiniz.",
      },
    ],
    closing: "Bornova'daki işletmeniz için genç kitleye uygun web projesini konuşalım.",
  },
  {
    provinceSlug: "izmir",
    districtSlug: "bayrakli",
    provinceName: "İzmir",
    districtName: "Bayraklı",
    locative: "Bayraklı'da",
    title: "Bayraklı Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Bayraklı Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Bayraklı'daki kurumsal firmalar, ofisler ve hizmet işletmeleri için modern web tasarım çözümleri.",
    ozelMetaDesc: "İzmir Bayraklı'da kurumsal firmalar ve ofisler için modern web tasarım ve yazılım çözümleri.",
    intro: "Bayraklı; İzmir'de çağdaş ofis ve iş kulelerinin yükseldiği, kurumsal hayatın yeni merkezlerinden biri. Kurumsal kimliği güçlendiren, modern web projeleri üretiyoruz.",
    needParagraph: "Bayraklı'da kurumsal görünürlük büyük önem taşıyor. Yavaş ya da eski görünen bir site, kurumsal firmada güveni zayıflatabileceği için tasarım ve performans birlikte ele alınmalı.",
    focusBullets: [
      "**Modern tasarım:** Kurumsal kimliği yansıtan arayüz.",
      "**Hız:** Performansı önceleyen altyapı.",
      "**İçerik yönetimi:** Kolay güncellenen panel.",
    ],
    sectorNotes: [
      "Kurumsal firmalara hizmet ve referans odaklı siteler kuruyoruz.",
      "Ofis ve işletmelere dijital kimlik danışmanlığı veriyoruz.",
      "E-ticaret satışına uygun firmalara altyapı hazırlıyoruz.",
    ],
    areas: ["Konak", "Bornova", "Karşıyaka"],
    faqs: [
      {
        question: "Bayraklı'daki firmamız için özgün tasarım yapıyor musunuz?",
        answer: "Evet, markanıza özel tasarım üretiyoruz.",
      },
      {
        question: "Sitemizin hızı neden önemli?",
        answer: "Hızlı site hem kullanıcı deneyimini hem arama motoru performansını iyileştirir.",
      },
      {
        question: "Kurumsal içerikleri kendimiz güncelleyebilir miyiz?",
        answer: "Evet; panel ve kısa eğitimle bunu mümkün kılıyoruz.",
      },
    ],
    closing: "Bayraklı'daki firmanız için modern bir web projesini birlikte kuralım.",
  },
  {
    provinceSlug: "izmir",
    districtSlug: "karsiyaka",
    provinceName: "İzmir",
    districtName: "Karşıyaka",
    locative: "Karşıyaka'da",
    title: "Karşıyaka Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Karşıyaka Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Karşıyaka'daki yerel ticaret, yeme–içme ve hizmet işletmeleri için hızlı web tasarım çözümleri.",
    ozelMetaDesc: "İzmir Karşıyaka'da yerel ticaret, yeme–içme ve hizmet işletmelerine yönelik web tasarım ve yazılım çözümleri.",
    intro: "Karşıyaka; sahil şeridi, canlı çarşısı ve güçlü yerel ticaret kültürüyle İzmir'in sevilen ilçelerinden. Yerel işletmeler için hızlı ve güven veren web çözümleri üretiyoruz.",
    needParagraph: "Karşıyaka'da müşteri çoğunlukla yakın çevreden geliyor. Bu nedenle yerel aramada çıkmak, hızlı yüklenmek ve iletişim bilgisini net sunmak işletmelere doğrudan müşteri kazandırıyor.",
    focusBullets: [
      "**Yerel SEO:** Mahalle ve çevre odaklı görünürlük.",
      "**Mobil hız:** Telefonda hızlı açılan sayfalar.",
      "**Rezervasyon ve iletişim:** Kolay erişim.",
    ],
    sectorNotes: [
      "Yeme–içme işletmelerine menü ve rezervasyon akışları kuruyoruz.",
      "Perakende mağazalarına ürün vitrini ve iletişim sayfaları hazırlıyoruz.",
      "Hizmet işletmelerine hızlı tanıtım siteleri tasarlıyoruz.",
    ],
    areas: ["Bornova", "Bayraklı", "Karşıyaka"],
    faqs: [
      {
        question: "Karşıyaka'daki restoranımız için menü ve rezervasyon kurulur mu?",
        answer: "Evet; menü ve rezervasyonu birlikte sunan bir yapı kurabiliriz.",
      },
      {
        question: "Yerel aramalarda görünmek için ne gerekiyor?",
        answer: "Yerel içerik, hız ve doğru iletişim bilgileriyle görünürlüğünüzü destekliyoruz.",
      },
      {
        question: "Sitemiz mobil uyumlu olur mu?",
        answer: "Evet, tüm projelerimiz mobil öncelikli tasarım ilkesiyle üretiliyor.",
      },
    ],
    closing: "Karşıyaka'daki işletmeniz için yerel odaklı web projesini planlayalım.",
  },
  {
    provinceSlug: "bursa",
    districtSlug: "nilufer",
    provinceName: "Bursa",
    districtName: "Nilüfer",
    locative: "Nilüfer'de",
    title: "Nilüfer Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Nilüfer Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Nilüfer'deki sanayi, otomotiv ve hizmet firmaları için web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Bursa Nilüfer'de sanayi, otomotiv ve hizmet firmalarına yönelik web tasarım ve özel yazılım çözümleri.",
    intro: "Nilüfer; organize sanayi bölgeleri, otomotiv ve tekstil üretiminin yanı sıra üniversite çevresindeki canlı yerleşimiyle Bursa'nın gelişen ilçelerinden biri. Kurumsal ve teknik firmalara web çözümleri üretiyoruz.",
    needParagraph: "Nilüfer'de sanayi firmalarının çoğu ihracat ve tedarik zinciri içinde çalışıyor. Bu firmalar için sitenin ürün ve kabiliyeti net anlatması, yabancı alıcıya hitap etmesi ve hızlı çalışması gerekiyor.",
    focusBullets: [
      "**Çok dilli kurumsal site:** İhracata uygun içerik.",
      "**Ürün kataloğu:** Sanayi ürünleri için net sunum.",
      "**Teklif akışı:** Dosya ve teknik detay kabul eden form.",
    ],
    sectorNotes: [
      "Otomotiv ve tedarik sanayisine ürün vitrini ve teklif yönetimi kuruyoruz.",
      "Tekstil ve üretim firmalarına güncel katalog altyapıları hazırlıyoruz.",
      "Hizmet işletmelerine hızlı ve güven veren siteler tasarlıyoruz.",
    ],
    areas: ["Osmangazi", "Görükle", "Mudanya"],
    faqs: [
      {
        question: "Nilüfer'deki sanayi firmamız için İngilizce site yapılır mı?",
        answer: "Evet; ihracat odaklı firmalar için çok dilli yapı kuruyoruz.",
      },
      {
        question: "Ürün kataloğunu kendimiz güncelleyebilir miyiz?",
        answer: "Evet, panel üzerinden ürün ve görselleri güncelleyebilirsiniz.",
      },
      {
        question: "Teklif formu teknik dosya kabul eder mi?",
        answer: "Evet; mühendislik dökümanlarına uygun bir teklif akışı kurabiliriz.",
      },
    ],
    closing: "Nilüfer'deki firmanız için ihracata uygun web projesini planlayalım.",
  },
  {
    provinceSlug: "bursa",
    districtSlug: "osmangazi",
    provinceName: "Bursa",
    districtName: "Osmangazi",
    locative: "Osmangazi'de",
    title: "Osmangazi Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Osmangazi Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Osmangazi'deki ticaret, tekstil ve turizm işletmeleri için hızlı web tasarım ve yazılım çözümleri.",
    ozelMetaDesc: "Bursa Osmangazi'de ticaret, tekstil ve turizm işletmelerine yönelik web tasarım ve yazılım çözümleri.",
    intro: "Osmangazi; Bursa'nın tarihi ticaret merkezi, çarşıları ve tekstil geçmişiyle şehrin ticari hafızasını taşıyor. Ticaret ve turizm odaklı işletmelere web çözümleri üretiyoruz.",
    needParagraph: "Osmangazi'deki işletmelerin çoğu köklü fakat dijitalde geri kalmış olabiliyor. Bu işletmeler için hızlı, sade ve yerelden gelen müşteriyi çevreleyen bir siteye ihtiyaç var.",
    focusBullets: [
      "**Yerel SEO:** Çarşı ve çevre odaklı çıkarım.",
      "**Mobil hız:** Telefonda hızlı açılış.",
      "**Turizm dokusu:** Yerli ve yabancı ziyaretçiye hitap.",
    ],
    sectorNotes: [
      "Turizm ve konaklama işletmelerine çok dilli tanıtım siteleri kuruyoruz.",
      "Tekstil ve ticaret firmalarına katalog ve sipariş sayfaları hazırlıyoruz.",
      "Yerel perakendeye hızlı tanıtım siteleri tasarlıyoruz.",
    ],
    areas: ["Yıldırım", "Nilüfer", "Heykel"],
    faqs: [
      {
        question: "Osmangazi'deki işletmemiz için yerel SEO yapıyor musunuz?",
        answer: "Evet; yerel içerik ve teknik SEO ile görünürlüğünüzü destekliyoruz.",
      },
      {
        question: "Sitemizi mobil uyumlu yapar mısınız?",
        answer: "Evet, tüm projelerde mobile öncelik veriyoruz.",
      },
      {
        question: "Turizm için İngilizce sayfa eklenir mi?",
        answer: "Evet, talep doğrultusunda çok dilli yapı ekliyoruz.",
      },
    ],
    closing: "Osmangazi'deki işletmeniz için yerel odaklı web projesini konuşalım.",
  },
  {
    provinceSlug: "antalya",
    districtSlug: "muratpasa",
    provinceName: "Antalya",
    districtName: "Muratpaşa",
    locative: "Muratpaşa'da",
    title: "Muratpaşa Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Muratpaşa Web Tasarım ve Web Yazılımı | XipSoft",
    metaDescription: "Antalya Muratpaşa'daki turizm, restoran ve hizmet işletmeleri için çok dilli web tasarım çözümleri.",
    ozelMetaDesc: "Antalya Muratpaşa'da turizm, yeme–içme ve hizmet işletmelerine yönelik web tasarım ve yazılım çözümleri.",
    intro: "Muratpaşa; Antalya'nın merkezinde, turizm ve yerel ticaretin iç içe olduğu canlı bir ilçe. Yerli ve yabancı misafire hitap eden işletmeler için web çözümleri üretiyoruz.",
    needParagraph: "Muratpaşa'da birçok işletme yabancı misafir ağırlıyor. Bu nedenle sitenin çok dilli olması, rezervasyon ve iletişimi kolaylaştırması, mobilde hızlı çalışması şart.",
    focusBullets: [
      "**Çok dilli yapı:** Yerli ve yabancı misafire hitap.",
      "**Rezervasyon:** Konaklama ve restoran için kolay akış.",
      "**Hız:** Mobilde hızlı ve akıcı deneyim.",
    ],
    sectorNotes: [
      "Restoran ve kafeler için çok dilli menü ve rezervasyon sistemleri kuruyoruz.",
      "Konaklama işletmelerine tanıtım ve iletişim odaklı siteler hazırlıyoruz.",
      "Yerel hizmet işletmelerine hızlı tanıtım sayfaları tasarlıyoruz.",
    ],
    areas: ["Konyaaltı", "Kepez", "Kaleiçi"],
    faqs: [
      {
        question: "Antalya'daki işletmemiz için İngilizce site kuruyor musunuz?",
        answer: "Evet; talep doğrultusunda Rusça dahil çok dilli yapı kurabiliyoruz.",
      },
      {
        question: "Online rezervasyon eklenebilir mi?",
        answer: "Evet, rezervasyon formu veya entegrasyon ekleyebiliriz.",
      },
      {
        question: "Mobil hız neden önemli?",
        answer: "Misafir çoğunlukla telefonla arama yaptığı için hız dönüşümü etkiliyor.",
      },
    ],
    closing: "Muratpaşa'daki işletmeniz için turizme uygun web projesini konuşalım.",
  },
  {
    provinceSlug: "antalya",
    districtSlug: "konyaalti",
    provinceName: "Antalya",
    districtName: "Konyaaltı",
    locative: "Konyaaltı'nda",
    title: "Konyaaltı Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Konyaaltı Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Konyaaltı'ndaki turizm, konaklama ve hizmet işletmeleri için çok dilli web tasarım çözümleri.",
    ozelMetaDesc: "Antalya Konyaaltı'nda turizm, konaklama ve hizmet işletmelerine yönelik web tasarım çözümleri.",
    intro: "Konyaaltı; plajı, konaklama tesisleri ve sahildeki yaşamıyla Antalya turizminin önemli duraklarından. Konaklama ve hizmet işletmelerine web çözümleri üretiyoruz.",
    needParagraph: "Konyaaltı'nda işletme çoğunlukla yabancı misafire hizmet ediyor. Bu nedenle çok dilli içerik, hızlı ve şık görünen bir site doğrudan rezervasyon getiriyor.",
    focusBullets: [
      "**Çok dilli site:** Misafire kendi dilinde hitap.",
      "**Rezervasyon:** Konaklama için kolay akış.",
      "**Görsel kalite:** Yüksek kaliteli ama hızlı sayfalar.",
    ],
    sectorNotes: [
      "Konaklama işletmelerine çok dilli tanıtım ve rezervasyon akışları kuruyoruz.",
      "Turistik hizmet işletmelerine hızlı ve görsel siteler hazırlıyoruz.",
      "Yeme–içme işletmelerine menü sayfaları tasarlıyoruz.",
    ],
    areas: ["Muratpaşa", "Kepez", "Kemer"],
    faqs: [
      {
        question: "Konyaaltı'ndaki otelimiz için rezervasyon sayfası kurulur mu?",
        answer: "Evet; talep ve entegrasyona uygun bir rezervasyon akışı kurabiliriz.",
      },
      {
        question: "Hangi dilleri destekliyorsunuz?",
        answer: "İhtiyaca göre Türkçe, İngilizce ve Rusça gibi dil seçenekleri sunabiliyoruz.",
      },
      {
        question: "Sitemiz mobilde hızlı olur mu?",
        answer: "Evet, performansı önceleyen bir altyapı kuruyoruz.",
      },
    ],
    closing: "Konyaaltı'ndaki işletmeniz için turizme uygun web projesini konuşalım.",
  },
  {
    provinceSlug: "kocaeli",
    districtSlug: "gebze",
    provinceName: "Kocaeli",
    districtName: "Gebze",
    locative: "Gebze'de",
    title: "Gebze Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "Gebze Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Gebze'deki sanayi, kimya ve lojistik firmaları için web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Gebze'de sanayi, kimya ve lojistik firmalarına yönelik kurumsal web tasarım ve yazılım çözümleri.",
    intro: "Gebze; organize sanayi bölgeleri, kimya ve üretim tesisleri, limanı ve lojistik bağlantılarıyla ülkenin sanayi omurgalarından biri. Sanayi firmalarına uygun web çözümleri üretiyoruz.",
    needParagraph: "Gebze'de faaliyet gösteren firmaların büyük kısmı B2B çalışıyor. Bu firmalar için İngilizce içerik, ürün ve sertifika vitrini ile hızlı teklif akışı belirleyici oluyor.",
    focusBullets: [
      "**B2B site:** İngilizce ve ürün dokusu.",
      "**Teklif akışı:** Teknik dosya kabul eden form.",
      "**Kurumsal güven:** Sertifika ve referans vitrini.",
    ],
    sectorNotes: [
      "Kimya ve üretim fabrikalarına ürün ve sertifika vitrinli siteler kuruyoruz.",
      "Lojistik firmalarına takip ve teklif akışları hazırlıyoruz.",
      "Kurumsal firmalara çok dilli tanıtım siteleri tasarlıyoruz.",
    ],
    areas: ["Çayırova", "Darıca", "Dilovası"],
    faqs: [
      {
        question: "Gebze'deki B2B firmamız için İngilizce site kurulur mu?",
        answer: "Evet; ihracat odaklı firmalar için çok dilli bir yapı kuruyoruz.",
      },
      {
        question: "Teklif formu teknik dosya kabul eder mi?",
        answer: "Evet; teknik doküman yükleyebileceğiniz bir teklif akışı kurabiliriz.",
      },
      {
        question: "İçerik güncellemesini kendimiz yapabilir miyiz?",
        answer: "Evet, panel ve eğitimle bunu mümkün kılıyoruz.",
      },
    ],
    closing: "Gebze'deki firmanız için B2B uygun web projesini planlayalım.",
  },
  {
    provinceSlug: "kocaeli",
    districtSlug: "izmit",
    provinceName: "Kocaeli",
    districtName: "İzmit",
    locative: "İzmit'te",
    title: "İzmit Web Tasarım ve Özel Web Yazılımı",
    metaTitle: "İzmit Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "İzmit'teki sanayi, ticaret ve hizmet firmaları için web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Kocaeli İzmit'te sanayi, ticaret ve hizmet firmalarına yönelik web tasarım ve yazılım çözümleri.",
    intro: "İzmit; sanayi, ticaret ve şehir merkezi işlevlerini bir arada barındıran Kocaeli'nin merkezi. Kurumsal ve yerel işletmelere uygun web çözümleri üretiyoruz.",
    needParagraph: "İzmit'te firmalar hem kurumsal müşteriye hem yerel müşteriye hitap ediyor. Bu nedenle sitenin güven veren bir kurumsal yapı ile hızlı ve yerel bir deneyimi birleştirmesi gerekiyor.",
    focusBullets: [
      "**Kurumsal site:** Net hizmet ve referans yapısı.",
      "**Yerel SEO:** İzmit ve çevresi için görünürlük.",
      "**Teklif akışı:** Hızlı iletişim ve talep.",
    ],
    sectorNotes: [
      "Sanayi firmalarına ürün vitrini ve teklif akışları kuruyoruz.",
      "Hizmet işletmelerine hızlı, yerel odaklı siteler hazırlıyoruz.",
      "Kurumsal firmalara güven veren tanıtım siteleri tasarlıyoruz.",
    ],
    areas: ["Başiskele", "Kartepe", "Kandıra"],
    faqs: [
      {
        question: "İzmit'teki firmamız için kurumsal site kuruyor musunuz?",
        answer: "Evet; hizmetlerinizi ve referanslarınızı yansıtan bir site kuruyoruz.",
      },
      {
        question: "Yerel aramalarda çıkmak için ne yapıyorsunuz?",
        answer: "Yerel içerik ve teknik SEO ile görünürlüğünüzü destekliyoruz.",
      },
      {
        question: "Mevcut sitemizi yeniler misiniz?",
        answer: "Evet, mevcut içeriği koruyarak modernleştiriyoruz.",
      },
    ],
    closing: "İzmit'teki firmanız için uygun web projesini birlikte kuralım.",
  },
];
