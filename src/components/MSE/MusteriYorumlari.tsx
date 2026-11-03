"use client";

import { useTranslations } from "next-intl";
import TitleText from "@/components/Common/TitleText/TitleText";
import XipIcon from "@/components/Ui/Icon";
import { PALETTE } from "@/config/palette";
import { GlassCard } from "@/components/Ui/Card";

const V = PALETTE.neon[500];

const reviews = [
  {
    name: "Aykut S.",
    role: "E-Ticaret Girişimcisi",
    color: V,
    text: "XipSoft ile web sitemizi yeniledikten sonra organik Google trafiğimiz %140 arttı ve yüklenme süremiz 1,2 saniyeye düştü. Ekipteki herkes, yöneticilerden telefona yanıt veren çalışma arkadaşlarına kadar, son derece profesyoneldi.",
    highlight: "%140 organik trafik artışı",
    rating: 5,
  },
  {
    name: "Çiğdem P.",
    role: "Muhasebe & Finans Danışmanı",
    color: V,
    text: "Bir proje baştan sona bu kadar iyi ilerler mi diye sorarsanız, evet. Her aşamada hızlı geri dönüş aldık ve süreç şeffaf raporlarla ilerledi. Sektöründe öne çıkan firmalardan biri.",
    highlight: "Şeffaf süreç & anlık geri dönüş",
    rating: 5,
  },
  {
    name: "Oğuz T.",
    role: "Kurumsal Yazılım Direktörü",
    color: V,
    text: "Sektörde birçok firmayla çalıştım; özveri ve profesyonellik açısından en iyi deneyimi XipSoft'ta yaşadım. Özellikle güvenlik odaklı geliştirme yaklaşımları ve KVKK uyum süreci eksiksiz yönetildi.",
    highlight: "KVKK uyum süreci eksiksiz",
    rating: 5,
  },
  {
    name: "Meltem M.",
    role: "SaaS Platform Kurucusu",
    color: V,
    text: "İhtiyaçlarımıza uygun hizmet sunan, ilgili bir ekibe sahip bir yazılım firması. Teslimat sonrası destek gerçekten var; sadece sözde kalmıyor.",
    highlight: "Teslim sonrası destek gerçek",
    rating: 5,
  },
];

export default function MusteriYorumlari() {
  const t = useTranslations("home.reviews");

  return (
    <section className="py-16 lg:py-24">
      {/* Başlık */}
      <div className="text-center mb-12 home-reveal">
        <TitleText tag="h2" variant="brand" className="mb-3">
          {t("title")}
        </TitleText>
        <p className="text-ink-muted text-base max-w-xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      {/* Yorum kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {reviews.map((r, index) => (
          <div
            key={r.name}
            className="group relative review-card-enter"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <GlassCard className="home-liquid-glass relative flex flex-col gap-5 p-8 overflow-hidden transition-all duration-500 hover:-translate-y-1.5">
              {/* Arka plan orb */}
              <div
                className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full opacity-15 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none blur-2xl"
                style={{ background: r.color }}
              />

              {/* Hover üst çizgi */}
              <div
                className="absolute inset-x-0 top-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${r.color}, transparent)` }}
              />

              <XipIcon name="quote" glow="strong" className="w-7 h-7 opacity-25" style={{ color: r.color }} />

              <p className="text-zinc-300 text-base leading-relaxed flex-1">{r.text}</p>

              {/* Ölçülebilir başarı verisi */}
              <div
                className="font-stat rounded-lg px-3 py-2 text-xs font-semibold"
                style={{
                  background: `${r.color}15`,
                  border: `1px solid ${r.color}30`,
                  color: r.color,
                }}
              >
                ✓ {r.highlight}
              </div>

              {/* Kullanıcı bilgisi */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] relative z-10">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${r.color}90, ${r.color}50)`,
                      color: "#050811",
                    }}
                  >
                    {r.name[0]}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">{r.name}</span>
                    <span className="text-xs text-ink-muted">{r.role}</span>
                  </div>
                </div>
                {/* Yıldızlar — amber kaldırıldı, palette rengi */}
                <div className="flex gap-0.5">
                  {Array.from({ length: r.rating }).map((_, j) => (
                    <XipIcon
                      key={j}
                      name="star"
                      glow="none"
                      className="w-3.5 h-3.5"
                      style={{ fill: V, color: V }}
                    />
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        ))}
      </div>
    </section>
  );
}
