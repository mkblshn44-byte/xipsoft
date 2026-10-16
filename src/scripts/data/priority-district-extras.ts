/**
 * Öncelikli ilçe sayfaları için EK özgün içerik.
 * Kelime hedefini (300-400) karşılamak için ana profile ek olarak bir yerel
 * paragraf ve bir yerel SSS ekler. Her paragraf/SSS ilçeye özgü yazılmıştır;
 * şablon değildir. Anahtar: "{il}/{ilce}" slug.
 */
export interface DistrictExtra {
  /** İlçeye özgü ek paragraf. */
  paragraph: string;
  /** İlçeye özgü ek SSS. */
  faq: { question: string; answer: string };
}

export const PRIORITY_DISTRICT_EXTRAS: Record<string, DistrictExtra> = {
  "istanbul/atasehir": {
    paragraph: "Ataşehir'de plaza çevresinde faaliyet gösteren firmalar için teklif, başvuru ve dosya paylaşımı süreçlerini tek bir dijital akışa taşıyoruz. Kurumsal içerik güncel tutulduğunda hem müşteri hem iş ortağı karşısında güven artıyor; yavaş ve dağınık bir site ise bu ölçekte doğrudan itibar kaybına yol açıyor.",
    faq: { question: "Ataşehir'de çok şubeli kurumsal yapı kurabilir misiniz?", answer: "Evet; tek merkezden yönetilen çok şubeli yapıları erişilebilir bir biçimde kurabiliyoruz." },
  },
  "istanbul/bakirkoy": {
    paragraph: "Bakırköy'de hem cadde mağazacılığı hem de sağlık odaklı hizmetler hareketli. Bu nedenle yerel aramada görünürlüğü artıran içerik ile hızlı randevu ve iletişim akışını aynı projede birleştiriyoruz; böylece fiziksel müşteri ile dijital talep birbirini besliyor.",
    faq: { question: "Bakırköy'deki işletmemiz için yerel arama görünürlüğü nasıl artar?", answer: "Tutarlı yerel içerik, hızlı altyapı ve doğru teknik SEO ile görünürlüğünüzü destekliyoruz." },
  },
  "istanbul/basaksehir": {
    paragraph: "Başakşehir'de sağlık, eğitim ve lojistik kurumları yoğunlaşıyor. Bu kurumlar için bilgiyi erişilebilir biçimde sunan, başvuru ve iletişim formlarını hızlandıran sade bir yapı kuruyoruz; gereksiz süsleme yerine netliği önceliyoruz.",
    faq: { question: "Başakşehir'de çok dilli başvuru formu kurulabilir mi?", answer: "Evet; ihtiyaç halinde form ve bilgilendirmeleri çok dilli hazırlayabiliyoruz." },
  },
  "istanbul/besiktas": {
    paragraph: "Beşiktaş'ta üniversite ve plaza nüfusu hareketli tutuyor. Rezervasyon, üyelik ve etkinlik duyurusu gibi dinamikleri tek panelden yönetilebilir hale getiriyoruz; böylece ekip küçük de olsa içerik güncel kalıyor.",
    faq: { question: "Beşiktaş'ta içeriği kendi ekibimiz güncelleyebilir mi?", answer: "Evet; yönetim paneli ve kısa eğitimle içerikleri kendiniz güncelleyebilirsiniz." },
  },
  "istanbul/beylikduzu": {
    paragraph: "Beylikdüzü'nde aramaların büyük kısmı mobilden geliyor ve hızlı hizmet talebi öne çıkıyor. Bu yüzden sayfaların küçük ekranda hızlı açılmasını, ürün ve hizmet bilgisinin birkaç dokunuşta bulunmasını sağlayan sade bir yaklaşım izliyoruz.",
    faq: { question: "Beylikdüzü'nde kargo firmamız için entegrasyon yapılır mı?", answer: "Evet; çalıştığınız kargo firmasına uygun entegrasyonu kurabiliyoruz." },
  },
  "istanbul/esenyurt": {
    paragraph: "Esenyurt'ta tekstil ve üretim atölyeleri için güncellenebilir katalog, eskiyen numara listelerinden çok daha etkili. Bu kalabalık ve hızlı pazarda sade, hızlı ve güncel kalabilen bir yapı kurguluyoruz; böylece hem yerli hem yurt dışı alıcıya net görünüyorsunuz.",
    faq: { question: "Esenyurt'ta bütçe dostu bir çözüm mümkün mü?", answer: "Evet; ihtiyaçları önceliklendiren, büyüdükçe genişletilebilen paketlerle ilerliyoruz." },
  },
  "istanbul/kadikoy": {
    paragraph: "Kadıköy'de hızlı büyüyen girişimler için MVP, kreatif ajanslar için ise görsel kalitesi yüksek bir vitrin öne çıkıyor. Her iki profilde de teslim hızını ve içerik güncellenebilirliğini koruyoruz; böylece ürün büyürken site de ayak uyduruyor.",
    faq: { question: "Kadıköy'de hızlı teslim (MVP) mümkün mü?", answer: "Evet; MVP kapsamını birlikte netleştirip teslim süresini kısaltıyoruz." },
  },
  "istanbul/kagithane": {
    paragraph: "Kağıthane'de güçlü tekstil geçmişinin yanında yeni iş merkezleri yükseliyor. Firmaların yurt dışı bağlantıları arttıkça İngilizce içerik ve temiz bir kurumsal yapı önem kazanıyor; bu ikisini birlikte sunuyoruz.",
    faq: { question: "Kağıthane'de ihracat için İngilizce sayfa eklenebilir mi?", answer: "Evet; ihracata dönük çok dilli yapı kurabiliyoruz." },
  },
  "istanbul/kartal": {
    paragraph: "Kartal'da sanayi ve lojistik firmaları için şeffaflık belirleyici. Teklif, termin ve takip bilgisi görünür olduğunda B2B ilişki de güçleniyor; bu yüzden yalnızca tanıtan değil, iş akışını destekleyen bir site kuruyoruz.",
    faq: { question: "Kartal'da sanayi firmaları ile nasıl çalışıyorsunuz?", answer: "Uzaktan yürütüyor, gerektiğinde yerinde görüşerek ilerliyoruz." },
  },
  "istanbul/maltepe": {
    paragraph: "Maltepe'de aileye ve bölge sakinine dönük hizmet veren kurumlar öne çıkıyor. İlk izlenimi güçlendiren güven verici tasarımı, kurs ve klinik için pratik başvuru akışıyla birleştiriyoruz.",
    faq: { question: "Maltepe'de blog ve duyuru bölümü ekleyebilir misiniz?", answer: "Evet; kolay yönetilen içerik bölümleri ekliyoruz." },
  },
  "istanbul/pendik": {
    paragraph: "Pendik'te üretim, ticaret ve ulaştırma iç içe; bu yüzden teknik doküman kabul eden teklif formları, kataloglar ve takip kolaylığı öne çıkıyor. Firma büyüdükçe eklenebilecek bir altyapı kuruyoruz.",
    faq: { question: "Pendik'teki B2B firmamız için neyi öneriyorsunuz?", answer: "Net ürün vitrini ve hızlı dönüş veren bir teklif akışı." },
  },
  "istanbul/sariyer": {
    paragraph: "Sarıyer'de Boğaz manzarası ve turizm etkisiyle estetik önem taşıyor. Görsel kaliteyi yüksek tutarken sayfa hızını ve mobil deneyimi koruyoruz; böylece hem yerli hem yabancı ziyaretçi akıcı bir deneyim yaşıyor.",
    faq: { question: "Sarıyer'de rezervasyon altyapısı esnek mi?", answer: "Evet; iş modelinize uygun bir rezervasyon akışı kurguluyoruz." },
  },
  "istanbul/sisli": {
    paragraph: "Şişli'de kurumsal firmalar yoğun ve rekabet güçlü. Bu yüzden kurumsal kimliği doğru yansıtan, güven unsurlarını öne çıkaran ve içeriği kolay güncellenen bir yapı kurguluyoruz; eski görünen bir site burada doğrudan dezavantaj.",
    faq: { question: "Şişli'de kurumsal sitemiz markamıza özel olur mu?", answer: "Evet; hazır tema yerine markanıza özel tasarım üretiyoruz." },
  },
  "istanbul/umraniye": {
    paragraph: "Ümraniye'de hem organize sanayi hem büyük perakende birlikte yer alıyor. Ürün kataloğu ile e-ticaret satışını aynı çatıda yönetmeyi kolaylaştırıyoruz; böylece hem bayiye hem son tüketiciye tek noktadan net görünüyorsunuz.",
    faq: { question: "Ümraniye'de katalog ile e-ticaret birlikte olur mu?", answer: "Evet; ikisini tek yapı altında birlikte kurgulayabiliyoruz." },
  },
  "istanbul/uskudar": {
    paragraph: "Üsküdar'da hem yerel sakin hem şehir dışından gelen hasta ve ziyaretçi akışı canlı. Bu yüzden randevu, bilgilendirme ve iletişimi tek bir sade yapıda birleştiriyoruz.",
    faq: { question: "Üsküdar'da birden fazla şubeyi yönetebilir miyiz?", answer: "Evet; şubeleri tek panelden yönetebileceğiniz bir yapı kurabiliyoruz." },
  },
  "ankara/cankaya": {
    paragraph: "Çankaya'da kurumsal işlerde güven, şeffaflık ve erişilebilirlik belirleyici. Kamu ve ticari paydaşların farklı beklentilerini tek bir sade deneyimde karşılamaya odaklanıyoruz; böylece hem erişim hem algı güçleniyor.",
    faq: { question: "Çankaya'da içerikleri kendimiz güncelleyebilir miyiz?", answer: "Evet; panel üzerinden ekibiniz güncelleyebilir." },
  },
  "ankara/yenimahalle": {
    paragraph: "Yenimahalle'de organize sanayi çevresindeki firmalar ürününü doğrudan, teknik bir vitrinde göstermek istiyor. Bu yüzden ölçü, kapsam ve teklif gibi bilgileri eksiksiz sunan net bir yapı kuruyoruz.",
    faq: { question: "Yenimahalle'de çok dilli katalog mümkün mü?", answer: "Evet; ihracata dönük çok dilli katalog hazırlayabiliyoruz." },
  },
  "ankara/etimesgut": {
    paragraph: "Etimesgut'ta mühendislik ve teknik işler ağırlıklı. Bu nedenle firmanın yetkinliğini gösteren referans, sertifika ve proje sayfalarını net biçimde kurguluyoruz; teknik dil ile kurumsal dil dengesini gözetiyoruz.",
    faq: { question: "Etimesgut'ta içerik erişilebilirliği için ne yapıyorsunuz?", answer: "Anlaşılır yapı ve erişilebilirlik ilkeleriyle çalışıyoruz." },
  },
  "ankara/golbasi": {
    paragraph: "Gölbaşı'nda eğitim, yerel hizmet ve üretici işletmeler bir arada. Bilgiyi hızlı sunan ve iletişimi kolaylaştıran sayfaları, yönetilebilir içerik bölümleriyle destekliyoruz.",
    faq: { question: "Gölbaşı'nda mini e-ticaret mümkün mü?", answer: "Evet; kapsamı ölçerek küçük başlangıç kurabiliyoruz." },
  },
  "ankara/kecioren": {
    paragraph: "Keçiören'de günlük ihtiyaca dönük işletmeler ağırlıklı ve rekabet yerel. Bu yüzden hız, mobil uyum ve yerel arama görünürlüğünü birlikte önemsiyoruz; yakın çevreden gelen müşteriyi kolaylaştırıyoruz.",
    faq: { question: "Keçiören'de sitemiz ne kadar sürede yayına girer?", answer: "Kapsama göre; küçük çaplı projeler hızlı tamamlanır." },
  },
  "izmir/konak": {
    paragraph: "Konak, İzmir'in ticaret ve turizm merkezi olarak hem yerli hem yabancı müşteri barındırıyor. Bu çeşitlilik için ürün ve hizmetin net anlatıldığı, ödeme ve iletişimin kolaylaştığı bir yapı kuruyoruz.",
    faq: { question: "Konak'ta çok dilli tanıtım gerekir mi?", answer: "Müşteri profilinize göre evet; destek sunuyoruz." },
  },
  "izmir/bornova": {
    paragraph: "Bornova'da üniversite ve öğrenci nüfusu hareketi belirliyor. Hızlı, temiz ve kampanyaya açık sayfalar bu kitle için fark yaratıyor; bu yüzden mobil öncelikli bir yaklaşım izliyoruz.",
    faq: { question: "Bornova'da öğrenciye dönük içerik üretir misiniz?", answer: "Evet; hedef kitlenize uygun içerik planlıyoruz." },
  },
  "izmir/bayrakli": {
    paragraph: "Bayraklı'da yükselen iş kuleleri ve ofisler kurumsal bir profil oluşturuyor. Burada modern görünüm ve güvenilirlik öne çıktığı için tasarım ile performansı birlikte ele alıyoruz.",
    faq: { question: "Bayraklı'da kurumsal e-posta ve iletişim yönetimi var mı?", answer: "Evet; iletişim formu ve temel yönetimi kuruyoruz." },
  },
  "izmir/karsiyaka": {
    paragraph: "Karşıyaka'da müşteri çoğu zaman yakın çevreden geliyor; bu yüzden yerel arama ve hızlı yükleme doğrudan müşteri getiriyor. Sadeliği ve hızı elden bırakmayan sayfalar kuruyoruz.",
    faq: { question: "Karşıyaka'da görsel yoğun sayfa hızı düşürür mü?", answer: "Hayır; medyayı optimize ederek hızı koruyoruz." },
  },
  "bursa/nilufer": {
    paragraph: "Nilüfer'de sanayi, ihracat ve üniversite etkisi bir arada. Bu yüzden hem çok dilli kurumsal yapıyı hem de güncel ürün kataloğunu önemsiyoruz; firmanın yurt dışı hesabını kolaylaştırıyoruz.",
    faq: { question: "Nilüfer'de kataloğu kendimiz güncelleyebilir miyiz?", answer: "Evet; panel üzerinden güncellenir." },
  },
  "bursa/osmangazi": {
    paragraph: "Osmangazi'de köklü fakat dijitalde geri kalmış işletmeler var. Böyle işletmeler için hızlı, sade ve güvenilir bir dijital başlangıç kuruyoruz; karmaşaya gerek kalmadan görünür hale getiriyoruz.",
    faq: { question: "Osmangazi'de eski sitemizi taşır mısınız?", answer: "Evet; içeriği koruyarak taşıyoruz." },
  },
  "antalya/muratpasa": {
    paragraph: "Muratpaşa'da yerli ve yabancı misafir iç içe. Dil çeşitliliği ile rezervasyon kolaylığını birlikte sunmak, doğrudan talep getiriyor; bu yüzden bu iki unsuru önceliyoruz.",
    faq: { question: "Muratpaşa'da online menü güncellenir mi?", answer: "Evet; hızlı güncellenebilir hazırlıyoruz." },
  },
  "antalya/konyaalti": {
    paragraph: "Konyaaltı'nda konaklama ve sahil odaklı hizmet yoğun. Bu işletmeler için yabancı dilde bilgi ve rezervasyon akışı belirleyici olduğundan, misafirin kolayca talep bırakabildiği bir yapı kuruyoruz.",
    faq: { question: "Konyaaltı'nda rezervasyon entegrasyonu mümkün mü?", answer: "Evet; kullandığınız sisteme göre değerlendirmekteyiz." },
  },
  "kocaeli/gebze": {
    paragraph: "Gebze'de kimya ve üretim firmaları B2B çalışıyor; bu nedenle sertifika ve ürün bilgisini İngilizce sunan bir vitrin gerekiyor. Sanayi firmasının temposuna uygun, kolay muhafaza edilebilir bir yapı kuruyoruz.",
    faq: { question: "Gebze'de ürün sayfalarımızı toplu günceller misiniz?", answer: "Evet; uygun yönetimle ilerliyoruz." },
  },
  "kocaeli/izmit": {
    paragraph: "İzmit'te sanayi ve hizmeti dengeli tutan bir yapı kuruyoruz; böylece hem kentli yerel müşteri hem de B2B firma aynı site üzerinden doğru bilgiye ulaşıyor.",
    faq: { question: "İzmit'te çok şubeli yapı kurulabilir mi?", answer: "Evet; şubeleri tek panelden yönetebiliriz." },
  },
};
