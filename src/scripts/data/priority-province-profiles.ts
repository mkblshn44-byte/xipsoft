/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ÖNCELİKLİ İL SAYFALARI İÇİN ÖZGÜN İÇERİK (İl = province)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `/hizmetler/web-yazilim-tasarim/[il]` sayfaları, o il için "bölge otorite"
 * sayfasıdır. İlçe sayfalarından FARKLI olarak makroekonomik profili (sanayi,
 * e-ticaret, kurumsal, startup, turizm) anlatan daha geniş bir metin taşır.
 *
 * İçerik kuralları ilçe profiliyle aynıdır: doğrulanamayan müşteri/sonuç
 * iddiası YOK, "en iyi/garantili" YOK; her il için gerçekçi ve özgün metin.
 *
 * Kapsam: öncelikli 30 pilot ilçenin bulunduğu 6 il (İstanbul, Ankara, İzmir,
 * Bursa, Antalya, Kocaeli). Böylece il = hub, pilot ilçeler = spoke kümelenir.
 * Yeni il eklemek için diziye profil eklemek yeterlidir.
 */
export interface PriorityProvinceProfile {
  provinceSlug: string;
  provinceName: string;
  /** "İstanbul'da" gibi eke uygun yer hâli. */
  locative: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  ozelMetaDesc: string;
  /** Kısa giriş paragrafı. */
  intro: string;
  /** İlin ekonomik profilini anlatan uzun paragraf. */
  economyParagraph: string;
  /** Öne çıkan çözümler (4-5). */
  focusBullets: string[];
  /** İlde öne çıkan sektörler (3-4). */
  sectorNotes: string[];
  /** İlde hizmet verdiğimiz pilot ilçeler (iç bağlantı için). */
  keyDistricts: Array<{ name: string; slug: string }>;
  /** Çalışma biçimimiz. */
  serviceApproach: string;
  /** İle özel SSS (4-5). */
  faqs: Array<{ question: string; answer: string }>;
  /** Kapanış cümlesi. */
  closing: string;
}

export const PRIORITY_PROVINCE_PROFILES: PriorityProvinceProfile[] = [
  {
    provinceSlug: "istanbul",
    provinceName: "İstanbul",
    locative: "İstanbul'da",
    title: "İstanbul Web Tasarım, E-Ticaret ve Özel Web Yazılımı",
    metaTitle: "İstanbul Web Tasarım ve Kurumsal Yazılım | XipSoft",
    metaDescription: "İstanbul'daki kurumsal firmalar, e-ticaret ve startuplar için hızlı web tasarım, e-ticaret altyapısı ve özel web yazılımı.",
    ozelMetaDesc: "İstanbul'da kurumsal web tasarım, e-ticaret ve özel web yazılımı. Finans, e-ticaret, sanayi ve turizm firmalarına ölçeklenebilir çözümler.",
    intro: "İstanbul; finans, e-ticaret, teknoloji girişimi, sanayi ve turizmi aynı anda barındıran Türkiye'nin en büyük ekonomik merkezi. Şehrin farklı iş kollarına hitap eden, ölçeklenebilir web çözümleri üretiyoruz.",
    economyParagraph: "İstanbul'da hem Boğaz çevresindeki kurumsal finans ofisleri hem de Ataşehir, Bakırköy ve Kağıthane gibi yoğun ticaret ve sanayi bölgeleri faaliyet gösteriyor. Şehirdeki firmaların büyük bölümü çok kanallı satış yürütüyor: fiziksel mağaza, e-ticaret ve B2B aynı anda yönetiliyor. Bu ölçekte web sitesi artık vitrin değil, satış ve operasyonun dijital omurgası. Bu nedenle İstanbul için hazırladığımız çözümleri şehrin farklı bölgelerinin ekonomik profiline göre ayrıştırıyor, her firmaya kendi ihtiyacına uygun altyapı kuruyoruz.",
    focusBullets: [
      "**Kurumsal web:** Çok dilli, hızlı ve erişilebilir kurumsal siteler.",
      "**E-ticaret:** Yüksek trafiğe dayanıklı, ödeme ve kargo entegre satış altyapısı.",
      "**Finans panelleri:** Rol bazlı yetkilendirme ve güvenli API entegrasyonu.",
      "**Kurumsal portal:** İç süreç ve müşteri yönetimi için web uygulamaları.",
      "**Teknik SEO:** Arama görünürlüğü ve sürdürülebilir içerik yapısı.",
    ],
    sectorNotes: [
      "Finans ve fintech firmalarına güvenli ödeme, raporlama ve entegrasyon katmanları geliştiriyoruz.",
      "E-ticaret işletmelerine sepette, ödemede ve kargoda kesintisiz bir satın alma deneyimi kuruyoruz.",
      "Sanayi ve lojistik firmalarına teklif, sipariş ve takip süreçlerini web üzerinden yöneten paneller kuruyoruz.",
      "Turizm ve hizmet işletmelerine çok dilli, rezervasyona uygun tanıtım siteleri hazırlıyoruz.",
    ],
    keyDistricts: [
      { name: "Kadıköy", slug: "istanbul-kadikoy" },
      { name: "Beşiktaş", slug: "istanbul-besiktas" },
      { name: "Şişli", slug: "istanbul-sisli" },
      { name: "Ataşehir", slug: "istanbul-atasehir" },
      { name: "Bakırköy", slug: "istanbul-bakirkoy" },
      { name: "Başakşehir", slug: "istanbul-basaksehir" },
      { name: "Beylikdüzü", slug: "istanbul-beylikduzu" },
      { name: "Esenyurt", slug: "istanbul-esenyurt" },
      { name: "Kağıthane", slug: "istanbul-kagithane" },
      { name: "Kartal", slug: "istanbul-kartal" },
      { name: "Maltepe", slug: "istanbul-maltepe" },
      { name: "Pendik", slug: "istanbul-pendik" },
      { name: "Sarıyer", slug: "istanbul-sariyer" },
      { name: "Ümraniye", slug: "istanbul-umraniye" },
      { name: "Üsküdar", slug: "istanbul-uskudar" },
    ],
    serviceApproach: "İstanbul'daki projelerde genellikle önce yüz yüze keşif toplantısı yapıyor, ardından geliştirmeyi haftalık çevrimiçi sprintlerle yürütüyoruz. Merkez ofisimiz Şişli/Mecidiyeköy'de; bu sayede hem Avrupa hem Anadolu yakasındaki firmalarla ulaşımı kolay bir noktada buluşuyoruz. Proje tesliminden sonra da içerik ve geliştirme desteğini sürdürüyoruz.",
    faqs: [
      {
        question: "İstanbul'da yüz yüze toplantı yapıyor musunuz?",
        answer: "Evet. Mecidiyeköy'deki ofisimizde veya firmanızın uygun olduğu bir noktada keşif ve değerlendirme toplantıları yapıyoruz.",
      },
      {
        question: "Büyük hacimli e-ticaret projelerinde neye dikkat ediyorsunuz?",
        answer: "Yoğun trafiğe dayanıklı altyapı, ödeme ve kargo entegrasyonlarının güvenilirliği ve mobilde hız başta geliyor.",
      },
      {
        question: "Mevcut kurumsal sitemizi SEO kaybetmeden taşır mısınız?",
        answer: "Evet; mevcut URL yapısını ve sinyalleri mümkün olduğunca koruyarak yeni tasarıma taşıyoruz.",
      },
      {
        question: "İstanbul dışındaki şubeler için de destek veriyor musunuz?",
        answer: "Evet; tek merkezden yönetilen çok şubeli yapıları aynı sistem üzerinden kurabiliyoruz.",
      },
      {
        question: "Hangi sektörlere web yazılım geliştiriyorsunuz?",
        answer: "Finans, e-ticaret, sanayi, lojistik, turizm ve profesyonel hizmet firmaları başta olmak üzere birçok sektöre çözüm üretiyoruz.",
      },
    ],
    closing: "İstanbul'daki işletmeniz için ölçeğinize uygun web ve e-ticaret altyapısını birlikte planlayalım.",
  },
  {
    provinceSlug: "ankara",
    provinceName: "Ankara",
    locative: "Ankara'da",
    title: "Ankara Web Tasarım ve Kurumsal Web Yazılımı",
    metaTitle: "Ankara Web Tasarım ve Kurumsal Yazılım | XipSoft",
    metaDescription: "Ankara'daki kurumsal firmalar, savunma sanayi tedarikçileri ve teknoloji işletmeleri için web tasarım ve özel yazılım.",
    ozelMetaDesc: "Ankara'da kurumsal web tasarım ve özel yazılım. Savunma, teknoloji ve kamu çevresi firmalara B2B iletişim ve entegrasyon çözümleri.",
    intro: "Ankara; kamu kurumları, savunma ve havacılık sanayi, üniversiteler ve teknoloji girişimlerinin iç içe geçtiği bir başkent ekonomisine sahip. Kurumsal ve teknik firmalara uygun web çözümleri üretiyoruz.",
    economyParagraph: "Başkentte kamu kaynaklı işler ile yerli teknoloji üretimi aynı anda ilerliyor. Savunma ve havacılık çevresindeki firma ve tedarikçiler, ihracat ve B2B iletişim için güçlü İngilizce içeriğe ve teknik referans vitrinine ihtiyaç duyuyor. Buna ek olarak üniversiteler ve araştırma kurumları bilgiyi dijitalden etkili sunmak istiyor. Bazı hizmetlerin kamu tarafından tedarikinde güvenilir ve erişilebilir bir site, ilk izlenimi belirliyor. Ankara'da bu iki eksene —kurumsal ve teknik— odaklanan çözümler geliştiriyoruz.",
    focusBullets: [
      "**B2B kurumsal web:** İngilizce ve teknik ürün vitrini.",
      "**Erişilebilirlik:** Geniş kullanıcı kitlesine uygun, WCAG odaklı arayüz.",
      "**Teklif akışı:** Teknik dosya kabul eden, hızlı dönüş veren formlar.",
      "**Entegrasyon:** Mevcut ERP/CRM sistemleriyle veri alışverişi.",
      "**Teknik SEO:** Kurumsal görünürlük ve içerik altyapısı.",
    ],
    sectorNotes: [
      "Savunma ve havacılık tedarikçilerine İngilizce içerikli, referans odaklı siteler kuruyoruz.",
      "Profesyonel hizmet firmalarına teklif ve portföyü öne çıkaran kurumsal sayfalar hazırlıyoruz.",
      "Teknoloji girişimlerine ürün anlatımı ve entegrasyonu kolaylaştıran altyapılar kuruyoruz.",
      "Eğitim kurumlarına başvuru ve bilgilendirme odaklı web deneyimleri tasarlıyoruz.",
    ],
    keyDistricts: [
      { name: "Çankaya", slug: "ankara-cankaya" },
      { name: "Yenimahalle", slug: "ankara-yenimahalle" },
      { name: "Etimesgut", slug: "ankara-etimesgut" },
      { name: "Gölbaşı", slug: "ankara-golbasi" },
      { name: "Keçiören", slug: "ankara-kecioren" },
    ],
    serviceApproach: "Ankara'daki projeleri genelde çevrimiçi keşif ve düzenli sprintlerle yürütüyor; gerektiğinde yerinde toplantı için Ankara'ya geliyoruz. Böylece şehirde ofis bulundurmanın yükü olmadan yakın ve planlı bir çalışma sağlıyoruz. Teslim sonrası içerik ve teknik destek de devam ediyor.",
    faqs: [
      {
        question: "Ankara'daki projelerde yüz yüze görüşme oluyor mu?",
        answer: "Evet, gerektiğinde Ankara'da buluşuyoruz; süreç genelde keşif yüz yüze, geliştirme çevrimiçi ilerliyor.",
      },
      {
        question: "Kamu işleri için sitemiz erişilebilir olmalı; destek veriyor musunuz?",
        answer: "Evet; erişilebilirlik ilkelerini gözeten, engelsiz kullanıma uygun arayüzler tasarlıyoruz.",
      },
      {
        question: "İngilizce kurumsal site kuruyor musunuz?",
        answer: "Evet; ihracat ve B2B tedarik için İngilizce başta olmak üzere çok dilli yapı kuruyoruz.",
      },
      {
        question: "Mevcut sistemlerimizle entegre olur mu?",
        answer: "Sisteminizdeki uygun arayüzlerle güvenli veri alışverişi sağlayan entegrasyonlar kuruyoruz.",
      },
    ],
    closing: "Ankara'daki kurumsal firmanız için erişilebilir ve B2B'ye uygun web projesini planlayalım.",
  },
  {
    provinceSlug: "izmir",
    provinceName: "İzmir",
    locative: "İzmir'de",
    title: "İzmir Web Tasarım, E-Ticaret ve Web Yazılımı",
    metaTitle: "İzmir Web Tasarım ve E-Ticaret Yazılımı | XipSoft",
    metaDescription: "İzmir'deki ticaret, ihracat ve turizm firmaları için web tasarım, e-ticaret altyapısı ve özel yazılım çözümleri.",
    ozelMetaDesc: "İzmir'de ticarete, ihracata ve turizme yönelik web tasarım ve e-ticaret altyapıları. XipSoft özel yazılım çözümleri.",
    intro: "İzmir; limanı, güçlü ihracatı, e-ticaret ekosistemi ve turizmiyle Ege'nin ticaret merkezi. Ticaret ve hizmet ağırlıklı firmalara uygun web çözümleri üretiyoruz.",
    economyParagraph: "İzmir ekonomisinin omurgasını liman ve ihracat, tekstil ve gıda üretimi ile büyüyen turizm oluşturuyor. Şehirdeki işletmelerin önemli bir kısmı hem yurt içi hem yurt dışı müşteriye hitap ettiği için çok dilli ve entegrasyona açık bir web varlığına ihtiyaç duyuyor. E-ticaret özelinde ise İzmirli satıcıların rekabeti yüksek; hız ve dönüşüm oranı belirleyici. Bu tabloda dijital kanal İzmirli firmalar için doğrudan ciroya dönüşüyor.",
    focusBullets: [
      "**E-ticaret:** Satış, ödeme ve kargo entegrasyonlu altyapı.",
      "**Çok dilli site:** İhracatçıya hitap eden yapı.",
      "**Kurumsal web:** Referans ve ürün vitrini.",
      "**Teklif akışı:** B2B satış için hızlı iletişim.",
      "**Teknik SEO:** Yerel ve ülke geneli görünürlük.",
    ],
    sectorNotes: [
      "E-ticaret satıcılarına yüksek rekabete dayanıklı, hızlı mağaza altyapıları kuruyoruz.",
      "İhracatçı firmalara çok dilli ürün kataloğu ve teklif akışı hazırlıyoruz.",
      "Turizm ve hizmet işletmelerine rezervasyona uygun, görsel siteler tasarlıyoruz.",
      "Gıda ve üretim firmalarına temiz kurumsal yapı ile içerik yönetimi kuruyoruz.",
    ],
    keyDistricts: [
      { name: "Konak", slug: "izmir-konak" },
      { name: "Bornova", slug: "izmir-bornova" },
      { name: "Bayraklı", slug: "izmir-bayrakli" },
      { name: "Karşıyaka", slug: "izmir-karsiyaka" },
    ],
    serviceApproach: "İzmir'deki projeleri çevrimiçi sprintlerle yürütüyor, ihtiyaç olduğunda yerinde toplantı için şehre geliyoruz. Böylece süreç hem hızlı hem de kesintiye uğramadan ilerliyor. Teslim sonrası bakım ve içerik desteğini sürdürüyoruz.",
    faqs: [
      {
        question: "İzmir'deki ihracatçı firmamız için çok dilli site yapıyor musunuz?",
        answer: "Evet; başta İngilizce olmak üzere ihtiyacınıza göre çok dilli yapı kuruyoruz.",
      },
      {
        question: "E-ticaret projemizde hızı nasıl sağlıyorsunuz?",
        answer: "Uygun altyapı, önbellek ve medya optimizasyonuyla hızlı bir mağaza deneyimi kuruyoruz.",
      },
      {
        question: "İzmir'de görüşme yapıyor musunuz?",
        answer: "Evet; gerektiğinde İzmir'de yüz yüze toplantı düzenliyoruz.",
      },
      {
        question: "Mevcut sistemlerimizle entegre olur mu?",
        answer: "Uygun olduğu ölçüde mevcut sistemlerinizle entegre çalışıyoruz.",
      },
    ],
    closing: "İzmir'deki işletmeniz için e-ticaret ve kurumsal web çözümünü birlikte planlayalım.",
  },
  {
    provinceSlug: "bursa",
    provinceName: "Bursa",
    locative: "Bursa'da",
    title: "Bursa Web Tasarım ve Kurumsal Web Yazılımı",
    metaTitle: "Bursa Web Tasarım ve Kurumsal Yazılım | XipSoft",
    metaDescription: "Bursa'daki otomotiv, tekstil ve makine firmaları için kurumsal web tasarım ve ihracata uygun yazılım çözümleri.",
    ozelMetaDesc: "Bursa'da sanayi ve ihracatçı firmalara yönelik kurumsal web tasarım, ürün kataloğu ve özel yazılım çözümleri.",
    intro: "Bursa; otomotiv, tekstil, makine ve tarım üretimini bir arada barındıran güçlü bir sanayi şehri. İhracata dönük kurumsal firmalara uygun web çözümleri üretiyoruz.",
    economyParagraph: "Bursa ekonomisinin merkezinde otomotiv ve yan sanayi, tekstil ve makine üretimi bulunuyor. Şehirdeki firmaların önemli kısmı ihracat yapıyor ve bu nedenle İngilizce içerik, ürün kataloğu ve teknik referans öne çıkıyor. Öte yandan şehir bir üniversite ve öğrenci potansiyeline sahip; perakende ve hizmet tarafı da gelişiyor. Bursa'da hem üretimci hem hizmet sağlayıcı firmaya hitap eden dengeli bir web yaklaşımı izliyoruz.",
    focusBullets: [
      "**Kurumsal web:** İhracatçıya güven veren yapı.",
      "**Ürün kataloğu:** Sanayi ürünlerinin net sunumu.",
      "**Teklif akışı:** Teknik dosya kabul eden formlar.",
      "**Çok dilli:** İhracat için dil desteği.",
      "**Bakım:** Güncel kalan altyapı.",
    ],
    sectorNotes: [
      "Otomotiv ve yan sanayi firmalarına ürün ve yetkinlik vitrinli siteler kuruyoruz.",
      "Tekstil ve makine üreticilerine ihracata uygun katalog altyapıları hazırlıyoruz.",
      "Profesyonel hizmet firmalarına sade ve güvenilir kurumsal sayfalar tasarlıyoruz.",
      "Turizm ve tarım işletmelerine bölgeyi anlatan içerikli siteler kuruyoruz.",
    ],
    keyDistricts: [
      { name: "Nilüfer", slug: "bursa-nilufer" },
      { name: "Osmangazi", slug: "bursa-osmangazi" },
    ],
    serviceApproach: "Bursa'daki projelerde ihtiyaç analizini takiben haftalık çevrimiçi sprintlerle ilerliyor, gerektiğinde Bursa'da yüz yüze buluşuyoruz. Böylece sanayi takvimine uyum sağlıyoruz. Teslim sonrası destek ve bakım sürüyor.",
    faqs: [
      {
        question: "Bursa'daki ihracatçı firmamız için İngilizce site yapıyor musunuz?",
        answer: "Evet; İhracata dönük firmalar için çok dilli yapı kuruyoruz.",
      },
      {
        question: "Ürün kataloğumuz kolay güncellenir mi?",
        answer: "Evet; panel üzerinden ürün ve görsellerinizi güncelleyebilirsiniz.",
      },
      {
        question: "Bursa'da görüşme yapıyor musunuz?",
        answer: "Evet; proje başlangıcında gerektiğinde Bursa'da toplanıyoruz.",
      },
      {
        question: "Kurumsal sitemiz arama motorunda görünür olur mu?",
        answer: "Teknik SEO ve içerik yapısıyla görünürlüğünüzü destekliyoruz.",
      },
    ],
    closing: "Bursa'daki firmanız için üretiminizi yansıtan web projesini birlikte kurallım.",
  },
  {
    provinceSlug: "antalya",
    provinceName: "Antalya",
    locative: "Antalya'da",
    title: "Antalya Web Tasarım ve Turizme Yönelik Web Yazılımı",
    metaTitle: "Antalya Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Antalya'daki turizm, konaklama ve hizmet işletmeleri için çok dilli web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Antalya'da turizm ve konaklama işletmelerine yönelik çok dilli web tasarım ve rezervasyon odaklı yazılım çözümleri.",
    intro: "Antalya; turizmi, tarımı ve ihracatıyla şehrin yıl boyu hareket eden bir ekonomik profili var. Konaklama ve hizmet ağırlıklı işletmelere web çözümleri üretiyoruz.",
    economyParagraph: "Antalya ekonomisinin merkezinde turizm ve konaklama ile buna bağlı hizmetler bulunuyor. Şehre gelen yerli ve yabancı misafir profili, işletmelerin çok dilli ve rezervasyona uygun bir web varlığına ihtiyaç duyduğunu gösteriyor. Tarım ve gıda ihracatı da güçlü; bu taraftaki firmalar için katalog ve B2B iletişim öne çıkıyor. Yaz aylarında istikrarlı performans gösteren bir site, rezervasyon ve doğrudan satış açısından belirleyici oluyor.",
    focusBullets: [
      "**Çok dilli site:** Yerli ve yabancı misafire hitap.",
      "**Rezervasyon:** Konaklama için kolay talep akışı.",
      "**Hız:** Yoğun sezonda stabil performans.",
      "**Katalog:** Tarım ve gıda için ürün vitrini.",
      "**Mobil öncelik:** Misafirin telefonundan hızlı erişim.",
    ],
    sectorNotes: [
      "Konaklama işletmelerine çok dilli tanıtım ve rezervasyon talebi toplayan siteler kuruyoruz.",
      "Turistik hizmet işletmelerine görsel kalitesi yüksek ama hızlı sayfalar hazırlıyoruz.",
      "Tarım ve gıda ihracatçılarına ürün kataloğu ve B2B iletişim akışları kuruyoruz.",
      "Yerel ticaret işletmelerine hızlı ve mobil uyumlu tanıtım siteleri tasarlıyoruz.",
    ],
    keyDistricts: [
      { name: "Muratpaşa", slug: "antalya-muratpasa" },
      { name: "Konyaaltı", slug: "antalya-konyaalti" },
    ],
    serviceApproach: "Antalya'daki projeleri çevrimiçi yürütüyor, gerektiğinde şehre gelerek yüz yüze görüşüyoruz. Turizm sezonunun yoğunluğunu dikkate alarak yayına alma ve destek planını buna göre kurguluyoruz.",
    faqs: [
      {
        question: "Antalya'daki otelimiz için çok dilli site kurulur mu?",
        answer: "Evet; ihtiyaca göre çok dilli tanıtım ve rezervasyon akışı kurabiliyoruz.",
      },
      {
        question: "Sezon yoğunluğunda site performansı nasıl korunur?",
        answer: "Hafif altyapı, önbellek ve uygun sunucu ile trafiği karşılayacak şekilde hazırlıyoruz.",
      },
      {
        question: "Türkçe dışında sayfa ekleyebilir miyiz?",
        answer: "Evet; yapınıza dil ekleyebiliyoruz.",
      },
      {
        question: "Yerel aramada çıkmak için ne yapıyorsunuz?",
        answer: "Yerel içerik ve teknik SEO ile görünürlüğünüzü destekliyoruz.",
      },
    ],
    closing: "Antalya'daki işletmeniz için turizme uygun web deneyimini birlikte kuralım.",
  },
  {
    provinceSlug: "kocaeli",
    provinceName: "Kocaeli",
    locative: "Kocaeli'nde",
    title: "Kocaeli Web Tasarım ve Sanayiye Yönelik Web Yazılımı",
    metaTitle: "Kocaeli Web Tasarım ve Yazılım | XipSoft",
    metaDescription: "Kocaeli'ndeki sanayi, kimya ve lojistik firmaları için B2B web tasarım ve özel yazılım çözümleri.",
    ozelMetaDesc: "Kocaeli'nde sanayi, kimya ve lojistik firmalara B2B web tasarım, ürün vitrini ve özel yazılım çözümleri.",
    intro: "Kocaeli; organize sanayi bölgeleri, kimya tesisleri ve liman bağlantılarıyla ülkenin sanayi omurgalarından biri. Sanayi ve B2B firmalara uygun web çözümleri üretiyoruz.",
    economyParagraph: "Kocaeli ekonomisi büyük ölçüde ağır sanayi, kimya ve lojistikine dayanıyor. Bölgedeki tesislerin bir kısmı hem yurt içi hem yurt dışına üretim yapıyor; bu da İngilizce içerik ve teknik referans ihtiyacını beraberinde getiriyor. Lojistik firmaları için ise müşteriye şeffaf takip sunan sistemler öne çıkıyor. Kocaeli'nde üretici ve taşıyıcı firmaya hitap eden, B2B odaklı bir web yaklaşımı izliyoruz.",
    focusBullets: [
      "**B2B site:** İngilizce ve teknik vitrin.",
      "**Kurumsal güven:** Sertifika ve referans.",
      "**Takip panelleri:** Sevkiyat ve sipariş.",
      "**Teklif akışı:** Teknik dosya kabulü.",
      "**Bakım:** Uzun ömürlü altyapı.",
    ],
    sectorNotes: [
      "Kimya ve üretim fabrikalarına sertifika ve ürün vitrinli siteler kuruyoruz.",
      "Lojistik firmalarına takip ve teklif akışı içeren paneller hazırlıyoruz.",
      "Makine ve yedek parça firmalarına güncel katalog altyapıları kuruyoruz.",
      "Hizmet işletmelerine hızlı, yerel odaklı tanıtım siteleri tasarlıyoruz.",
    ],
    keyDistricts: [
      { name: "Gebze", slug: "kocaeli-gebze" },
      { name: "İzmit", slug: "kocaeli-izmit" },
    ],
    serviceApproach: "Kocaeli'ndeki projeleri çevrimiçi yönetiyor, gerekli olduğunda şehre ziyaret düzenliyoruz. Sanayi firmalarının çalışma saatleri ve toplantı ritmine uyum sağlıyoruz.",
    faqs: [
      {
        question: "Kocaeli'nde B2B firmamız için İngilizce site kurar mısınız?",
        answer: "Evet; ihracat ve B2B için çok dilli yapı kurabiliyoruz.",
      },
      {
        question: "Sevkiyat takibi için panel yapılabilir mi?",
        answer: "Evet; talep doğrultusunda takip paneli geliştirebiliyoruz.",
      },
      {
        question: "Kocaeli'nde görüşme yapıyor musunuz?",
        answer: "Proje başlangıcında gerektiğinde yüz yüze görüşebiliyoruz.",
      },
      {
        question: "İçerikleri kendimiz güncelleyebilir miyiz?",
        answer: "Evet; panel ve eğitimle bunu sağlıyoruz.",
      },
    ],
    closing: "Kocaeli'ndeki firmanız için B2B odaklı web projesini birlikte planlayalım.",
  },
  {
    provinceSlug: "adana",
    provinceName: "Adana",
    locative: "Adana'da",
    title: "Adana Web Tasarım ve İşletmelere Özel Web Yazılımı",
    metaTitle: "Adana Web Tasarım ve Kurumsal Yazılım | XipSoft",
    metaDescription: "Adana'daki üretici, ticaret ve hizmet işletmeleri için kurumsal web tasarım, ürün kataloğu ve özel yazılım çözümleri.",
    ozelMetaDesc: "Adana'da kurumsal web sitesi, çevrimiçi ürün kataloğu ve işletme süreçlerine uyarlanmış web yazılımları.",
    intro: "Adana'da üretim, ticaret ve hizmet alanlarında faaliyet gösteren işletmeler için hedef kitleyi ve iş akışını temel alan web projeleri hazırlıyoruz. Kurumsal tanıtım, ürün sunumu ve müşteri talebi toplama ihtiyaçlarını aynı dijital yapı içinde planlıyoruz.",
    economyParagraph: "Bir işletmenin dijital ihtiyacı yalnızca bulunduğu ile göre belirlenmez; ürün yapısı, satış kanalı ve müşteriye sunduğu hizmet de çözümün kapsamını değiştirir. Adana'da üretim ve ürün satışı yapan firmalar için katalog, teknik doküman ve teklif talebinin düzenli sunulması önemlidir. Perakende ve profesyonel hizmet işletmeleri ise ziyaretçinin doğru bilgiye hızlı ulaşmasını ve iletişim adımını kolayca tamamlamasını ister. Bu nedenle projeye başlamadan önce ürünleri, hedef kullanıcıları ve içerik sorumlularını birlikte netleştiriyoruz.",
    focusBullets: [
      "**Kurumsal web sitesi:** Hizmetleri ve firma bilgisini açık biçimde sunan, mobil uyumlu sayfalar.",
      "**Ürün kataloğu:** Ürün grupları, teknik bilgiler ve teklif talepleri için yönetilebilir yapı.",
      "**E-ticaret:** Ürün, ödeme, sipariş ve teslimat adımlarını tutarlı biçimde birleştiren mağaza.",
      "**İşletme yazılımı:** Tekrarlanan iş akışlarını ve farklı sistemler arasındaki veri aktarımını destekleyen paneller.",
      "**Teknik SEO:** Arama motorlarının sayfaları doğru anlamasına yardımcı olan sağlam site altyapısı.",
    ],
    sectorNotes: [
      "Üretici ve tedarikçiler için ürün gruplarını, teknik belgeleri ve teklif toplama adımlarını düzenli bir katalogda birleştiriyoruz.",
      "Perakende işletmeler için ürün keşfini kolaylaştıran, sipariş ve ödeme akışlarıyla bütünleşik e-ticaret çözümleri hazırlıyoruz.",
      "Profesyonel hizmet firmaları için hizmet kapsamını açıklayan, başvuru ve iletişim taleplerini doğru ekibe ulaştıran sayfalar tasarlıyoruz.",
      "Birden fazla kanalda çalışan ekipler için raporlama, içerik yönetimi ve mevcut uygulamalarla entegrasyon seçeneklerini değerlendiriyoruz.",
    ],
    keyDistricts: [
      { name: "Seyhan", slug: "adana-seyhan" },
      { name: "Çukurova", slug: "adana-cukurova" },
      { name: "Yüreğir", slug: "adana-yuregir" },
      { name: "Sarıçam", slug: "adana-saricam" },
    ],
    serviceApproach: "Adana'daki projelerde önce mevcut siteyi, içerikleri ve kullanılan araçları inceliyoruz. Ardından sayfa yapısını, entegrasyonları ve teslim kapsamını yazılı olarak belirliyoruz. Geliştirme boyunca karar noktalarını görünür tutuyor; yayından önce mobil kullanım, form akışları, erişilebilirlik ve temel teknik SEO kontrollerini yapıyoruz. İçerik yönetimi gerekiyorsa ekibin günlük kullanabileceği sade bir panel de kapsam içine alınabiliyor.",
    faqs: [
      {
        question: "Adana'daki üretim firmamız için çevrimiçi ürün kataloğu hazırlayabilir misiniz?",
        answer: "Evet. Ürün grupları, teknik bilgiler ve teklif talebi adımlarını firmanızın içerik yapısına göre düzenleyebiliriz.",
      },
      {
        question: "Mevcut kurumsal sitemizi yenilerken içerikleri korur musunuz?",
        answer: "Önce mevcut sayfa ve URL envanterini çıkarır, gerekli yönlendirmeleri planlar ve taşınacak içerikleri kapsam içinde belirleriz.",
      },
      {
        question: "Adana'daki işletmemiz için e-ticaret altyapısı kurulabilir mi?",
        answer: "Ürün, ödeme, sipariş ve teslimat gereksinimlerini netleştirdikten sonra uygun mağaza kapsamını birlikte planlayabiliriz.",
      },
      {
        question: "Site içeriklerini kendi ekibimiz güncelleyebilir mi?",
        answer: "İçerik türlerinize uygun yönetim alanları kurabilir ve ekibinizin günlük güncellemeleri yapabilmesi için kullanım desteği sağlayabiliriz.",
      },
    ],
    closing: "Adana'daki işletmeniz için hedeflerinize ve günlük çalışma biçiminize uygun web projesini birlikte planlayalım.",
  },
];
