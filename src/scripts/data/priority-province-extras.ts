/**
 * Öncelikli İL sayfaları için EK özgün içerik.
 *
 * İl sayfaları, o ilin ana otorite (hub) sayfası olduğundan ilçelerden daha
 * zengin olmalıdır (hedef: 500+ kelime). Ana profile ek olarak illere özgü
 * paragraf(lar) ve SSS ekler. İçerik elle yazılmıştır; şablon/spintax değildir.
 */
export interface ProvinceExtra {
  /** İle özgü ek paragraflar. */
  paragraphs: string[];
  /** İle özgü ek SSS. */
  faqs: Array<{ question: string; answer: string }>;
}

export const PRIORITY_PROVINCE_EXTRAS: Record<string, ProvinceExtra> = {
  istanbul: {
    paragraphs: [
      "İstanbul'un ölçeği, tek bir şablonun işe yaramadığı kadar geniş. Avrupa yakasındaki finans ve ticaret dokusu ile Anadolu yakasındaki teknoloji ve sanayi yapısı farklı beklentiler doğuruyor. Bu nedenle İstanbul projelerinde önce hedef kitleyi ve satış akışını netleştiriyor, ardından içeriği ve altyapıyı bu çeşitliliğe göre kuruyoruz.",
    ],
    faqs: [
      {
        question: "İstanbul'da çok lokasyonlu firmalar için nasıl bir yapı kuruyorsunuz?",
        answer: "Ortak içerik yapısına sahip, şubeleri tek merkezden yönetebileceğiniz bir altyapı kuruyoruz.",
      },
    ],
  },
  ankara: {
    paragraphs: [
      "Ankara'da kamu, sanayi ve teknoloji firmaları aynı pazarda buluşuyor. Bölgedeki firmaların önemli bir kısmı, karar vericilere kurumsal bir vitrin sunarken aynı zamanda teklif ve başvuru sürecini hızlandırmak istiyor. Bu nedenle kurumsal güveni öne çıkaran sade bir tasarımı, dosya ve form akışını kolaylaştıran bir altyapıyla birlikte kuruyoruz.",
      "Ankara'nın çok paydaşlı iş yapısı, içeriğin açık ve erişilebilir olmasını gerektiriyor. Hizmetleri net anlatan, referansı ve yetkinliği görünür kılan sayfalar; hem kurum hem firma tarafında güven oluşturuyor. Böylece firmanın profesyonel görünürlüğü artarken, müşteri adaylarının doğru bilgiye hızlı ulaşması kolaylaşıyor.",
    ],
    faqs: [
      {
        question: "Ankara'da kurumsal içerik için neyi öneriyorsunuz?",
        answer: "Net hizmet ve referans sayfaları ile kolayca güncellenebilen, erişilebilir bir yapı.",
      },
    ],
  },
  izmir: {
    paragraphs: [
      "İzmir'de liman, turizm ve üretim aynı ekonomiyi besliyor. Fuar ve liman kenti olduğu için hem yurt dışına iş yapan üreticiler hem de yerel müşteriye çalışan işletmeler güçlü. Bu ikili yapıyı görüyor, İzmir projelerinde çok dilli vitrin ile yerel hizmet sayfalarını dengeli biçimde kuruyoruz.",
      "İzmir'de müşteri çoğu zaman önce cep telefonundan bakıyor. Bu yüzden hızlı, sade ve mobilde akıcı sayfaları; bayiyi ve son tüketiciyi ayırmayan tek bir anlatımla destekliyoruz.",
    ],
    faqs: [
      {
        question: "İzmir'de hem bayiye hem tüketiciye satıyoruz, tek site yeterli mi?",
        answer: "Evet; ürün vitrini ile e-ticaret satışını aynı yapıda kurgulayabiliyoruz.",
      },
    ],
  },
  bursa: {
    paragraphs: [
      "Bursa; otomotiv, tekstil ve makine üretiminin merkezlerinden biri. Sanayinin kurumsal hafızası burada çok gelişmiş, ancak ihracat yapan firma sayısı arttıkça dijital vitrinin de İngilizce ve tutarlı olması gerekiyor. Bursa projelerinde üretim gücünü doğru yansıtan, teknik ve kurumsal dili dengede tutan bir yapı kuruyoruz.",
      "Kentte sanayi kadar üniversite ve hizmet sektörü de büyüyor. Bu nedenle yalnızca fabrikaya değil, yerel hizmet ve perakende işletmelerine de uygun çözümler sunuyoruz.",
      "Üretici firmalar için ürün varyantlarını, teknik belgeleri ve teklif talebini aynı akışta sunmak; alıcının doğru bilgiye ulaşmasını kolaylaştırır. Bayi ve ihracat kanalları bulunan işletmelerde içerik dillerini, ürün sınıflandırmasını ve iletişim formlarını birlikte planlıyoruz. Böylece site, firmanın iş geliştirme ekibinin kullanabileceği düzenli bir kaynak haline gelir.",
    ],
    faqs: [
      {
        question: "Bursa'da ihracat için İngilizce İçerikli site şart mı?",
        answer: "Zengin fayda sağlar; ihracat odaklı firmalar için çok dilli yapı kuruyoruz.",
      },
    ],
  },
  antalya: {
    paragraphs: [
      "Antalya'da turizm, tarım ve yerel hizmet ekonomisi birlikte büyüyor. Yabancı misafir oranı yüksek olduğundan çok dilli tanıtım doğrudan müşteri getiriyor; bu yüzden dil desteğini ve rezervasyona uygun akışları ilinde öne çıkarıyoruz.",
      "Sahil ve kent merkezindeki işletmelerin ihtiyaçları farklı olsa da ortak nokta hız ve netlik. Antalya projelerinde ilk izlenimi güçlendiren, çok dilli ve hızlı bir yapı kuruyoruz.",
      "Konaklama ve deneyim odaklı işletmeler için tarih, hizmet kapsamı, konum ve iletişim bilgisinin kolay bulunması önemlidir. Çok dilli içerik hazırlanırken yalnızca metin çevrilmez; menüler, formlar ve kullanıcı yolculuğu da her dilde anlaşılır tutulur. Yerel hizmet firmaları içinse teklif veya randevu talebini kısa adımlarla tamamlayan mobil uyumlu sayfalar tasarlıyoruz.",
    ],
    faqs: [
      {
        question: "Antalya'da çok dilli site bakımı nasıl olur?",
        answer: "İçeriği tek panelden yönetebileceğiniz bir yapı kuruyoruz.",
      },
    ],
  },
  kocaeli: {
    paragraphs: [
      "Kocaeli, Gebze ve Dilovası hattındaki ağır sanayi ile İzmit merkezindeki hizmet ve ticaret ekonomisini bir arada barındırıyor. Bir yanda yurt dışına ürün satan firmalar, diğer yanda yerel müşteriye çalışan işletmeler var. Bu ikili yapı, ilin kurumsal vitrinini tek tip düşünmemeyi gerektiriyor.",
      "Kocaeli'nde sanayi firmaları B2B çalıştığı için teklif, ürün bilgisi ve takip öne çıkıyor; hizmet işletmeleri ise hız ve yerel görünürlük istiyor. Bu nedenle kimi işlere ihracat uyumlu katalog, kimine pratik randevu ve iletişim akışı kuruyoruz.",
      "Kurumsal tedarik süreçlerinde ürün dokümanlarının güncel tutulması, doğru ekibe ulaşan talepler ve mevcut sistemlerle güvenilir veri alışverişi birlikte ele alınmalıdır. Proje kapsamını belirlerken katalog, teklif formu, bayi erişimi ve yönetim panelini işletmenin mevcut çalışma biçimine göre planlıyor; gereksiz modüller yerine kullanılacak işlevlere öncelik veriyoruz.",
    ],
    faqs: [
      {
        question: "Kocaeli'de sanayi firmalarına dönük ne sunuyorsunuz?",
        answer: "Ürün vitrini, teknik doküman ve teklif süreçlerini görünür kılan bir yapı kuruyoruz.",
      },
    ],
  },
};
