const designPrinciples = [
  {
    title: "Önce ziyaretçinin işi",
    description:
      "Sayfa düzeni, ziyaretçinin aradığı bilgiye ve atması beklenen adıma göre kurulur. Açık menüler, anlaşılır başlıklar ve yerinde çağrı alanları gezinmeyi kolaylaştırır.",
  },
  {
    title: "Her ekranda rahat kullanım",
    description:
      "Telefon, tablet ve masaüstünde içerik okunaklı ve işlevler kullanılabilir kalmalıdır. Mobil görünüm, masaüstü tasarımının küçültülmüş bir kopyası değil; başlı başına ele alınan bir kullanım deneyimidir.",
  },
  {
    title: "Hız ve erişilebilirlik",
    description:
      "Görsel boyutları, kod yükü ve sayfa bileşenleri performans gözetilerek seçilir. Klavye kullanımı, metin karşıtlığı ve form etiketleri gibi erişilebilirlik ayrıntıları da tasarımın parçasıdır.",
  },
  {
    title: "İçeriğe uygun görsel dil",
    description:
      "Renk, tipografi, fotoğraf ve hareket; markanın karakterini desteklemeli, mesajın önüne geçmemelidir. Görsel tercihleri gerçek içerik ve marka gereksinimleriyle birlikte değerlendirilir.",
  },
];

const projectSteps = [
  {
    title: "İhtiyaç ve kapsam",
    description:
      "Hedef kitle, mevcut site, içerikler, öncelikli kullanıcı akışları ve teknik gereksinimler gözden geçirilir. Kapsam, bu ihtiyaçlara göre belirlenir.",
  },
  {
    title: "Bilgi mimarisi ve tasarım",
    description:
      "Sayfa yapısı ve temel etkileşimler netleştirilir. Görsel tasarım, onay ve geri bildirim adımlarıyla geliştirilir.",
  },
  {
    title: "Geliştirme ve kontrol",
    description:
      "Onaylanan tasarım web ortamına aktarılır. İçerik, bağlantılar, formlar ve farklı ekranlardaki görünüm yayına hazırlık sırasında kontrol edilir.",
  },
  {
    title: "Yayın ve sonraki adımlar",
    description:
      "Yayın öncesi son kontroller yapılır; içerik güncelleme, bakım veya yeni özellik ihtiyaçları ayrıca planlanabilir.",
  },
];

const questions = [
  {
    question: "Web tasarım çalışmasına başlamadan önce neler hazırlanmalı?",
    answer:
      "Varsa marka kılavuzu, mevcut site adresi, hizmet veya ürün bilgileri ve projeden beklenen sonuç başlangıç için yardımcı olur. İçerikler tamamlanmamışsa hangi metin ve görsellerin kim tarafından hazırlanacağı proje kapsamı belirlenirken konuşulabilir.",
  },
  {
    question: "Web sitesi telefon ve tabletlerde düzgün çalışır mı?",
    answer:
      "Tasarım ve geliştirme farklı ekran genişlikleri gözetilerek yapılır. Menü, metin, görsel ve formlar mobil kullanım senaryolarında da kontrol edilir; cihaz ve tarayıcı kapsamı proje planında netleştirilir.",
  },
  {
    question: "SEO uyumlu tasarım arama sıralamasını garanti eder mi?",
    answer:
      "Hayır. Teknik olarak anlaşılır sayfa yapısı, performans ve mobil kullanım SEO çalışmalarına katkı sağlayabilir; ancak sıralamalar içerik, rekabet, site geçmişi ve diğer pek çok etkene bağlıdır. Belirli bir sıra veya trafik sonucu garanti edilemez.",
  },
  {
    question: "Mevcut sitem yenilenirken eski sayfalar korunabilir mi?",
    answer:
      "Yenileme öncesinde URL ve içerik envanteri çıkarılır. Değişecek adresler için uygun yönlendirmeler planlanır ve yayına geçmeden önce kontrol edilir. Bu çalışma geçiş riskini azaltmayı hedefler, sıralama kaybı olmayacağını garanti etmez.",
  },
];

export default function WebDesignGuide() {
  return (
    <section
      aria-labelledby="web-tasarim-rehberi"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20"
    >
      <div className="max-w-3xl mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400 mb-3">
          Web tasarım yaklaşımımız
        </p>
        <h2 id="web-tasarim-rehberi" className="text-3xl md:text-4xl font-black text-white mb-5">
          İyi bir web sitesi, güzel görünmenin ötesinde işini kolaylaştırır
        </h2>
        <p className="text-zinc-400 leading-8">
          Tasarım; markanın nasıl algılandığını, ziyaretçinin bilgiye ne kadar
          kolay ulaştığını ve bir sonraki adımı nasıl bulduğunu etkiler. Bu
          nedenle web tasarımını yalnızca renk ve görsel seçimi olarak değil;
          içerik, kullanım deneyimi ve teknik altyapının birlikte çözüldüğü bir
          çalışma olarak ele alıyoruz. Her proje için aynı hazır düzeni
          uygulamak yerine, hedefleri ve gerçek ihtiyaçları başlangıç noktası
          kabul ediyoruz.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-16">
        {designPrinciples.map((principle, index) => (
          <article
            key={principle.title}
            className="rounded-2xl p-6 md:p-7"
            style={{
              background: "var(--color-card-bg)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="text-xs font-mono text-violet-400 mb-3">
              0{index + 1}
            </p>
            <h3 className="text-lg font-bold text-white mb-2">{principle.title}</h3>
            <p className="text-sm text-zinc-400 leading-7">{principle.description}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] mb-16">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-5">
            Web tasarım ve yazılım süreci nasıl ilerler?
          </h2>
          <p className="text-zinc-400 leading-8">
            Sağlıklı bir proje, geliştirmeye başlamadan önce kapsamın
            anlaşılmasıyla başlar. Hangi sayfaların gerekli olduğu, ziyaretçinin
            hangi işlemleri yapacağı, içeriklerin kim tarafından yönetileceği
            ve dış sistemlerle bağlantı gerekip gerekmediği netleştirilir.
            Böylece tasarım tercihleri yalnızca görünüme değil, sitenin
            kullanımına ve işletme hedeflerine de dayanır.
          </p>
          <p className="text-zinc-400 leading-8 mt-4">
            Tasarım ve geliştirme boyunca geri bildirim noktaları belirlenir.
            Yayın öncesinde temel sayfa akışları, formlar, bağlantılar, mobil
            görünüm ve içerik tutarlılığı kontrol edilir. Projenin kapsamı,
            takvimi ve teslim sonrası destek beklentileri teklif aşamasında
            ayrıca açıklanır.
          </p>
        </div>

        <ol className="space-y-6">
          {projectSteps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-violet-300"
                style={{
                  background: "rgba(139, 92, 246, 0.12)",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                }}
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-bold text-white mb-1">{step.title}</h3>
                <p className="text-sm text-zinc-400 leading-7">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="max-w-3xl mb-12">
        <h2 className="text-2xl md:text-3xl font-black text-white mb-5">
          SEO, hız ve kullanıcı deneyimi birlikte düşünülmeli
        </h2>
        <p className="text-zinc-400 leading-8">
          Arama motorlarının sayfaları anlamasına yardımcı olan başlık düzeni,
          açıklayıcı bağlantılar ve teknik işaretlemeler; ziyaretçinin rahatça
          gezinebildiği bir deneyimin yerine geçmez, onu tamamlar. Benzer
          şekilde hızlı açılan bir sayfa da tek başına doğru içerik veya
          dönüşüm sağlamaz. Bu unsurlar proje hedefleriyle birlikte
          değerlendirilir; performans ölçümleri ve içerik ihtiyaçları
          doğrultusunda iyileştirme alanları belirlenir. Arama sonuçlarında
          belirli bir sıra, ziyaretçi sayısı ya da satış artışı vaat edilmez.
        </p>
      </div>

      <div>
        <h2 className="text-2xl md:text-3xl font-black text-white mb-6">
          Web tasarım hakkında merak edilenler
        </h2>
        <div className="max-w-3xl divide-y divide-white/10 border-y border-white/10">
          {questions.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-zinc-100">
                {item.question}
                <span
                  aria-hidden="true"
                  className="text-xl text-violet-400 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pt-3 pr-8 text-sm leading-7 text-zinc-400">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
