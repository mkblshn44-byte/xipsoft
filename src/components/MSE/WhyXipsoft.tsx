"use client";

import { useEffect, useRef, type ReactNode } from "react";
import XipIcon from "@/components/Ui/Icon";
import { useTranslations } from "next-intl";
import { PALETTE } from "@/config/palette";
import TitleText from "@/components/Common/TitleText/TitleText";
import { GlassCard } from "@/components/Ui/Card";

// ─── Renk Sabitleri — tek kaynak ──────────────────────────────────────────
const V = PALETTE.neon[500];
const C = PALETTE.accent.cyan;

type StrengthCard = {
  icon: string;
  color: string;
  badge?: string;
  title: string;
  desc: ReactNode;
};

// Renkler: V (mor) ve C (cyan) arasında alt-alta dönüşümlü
const strengthCards: StrengthCard[] = [
  {
    icon: "zap",
    color: C,
    badge: "LCP",
    title: "Anında Açılan Web Sitesi",
    desc: "Yavaş siteler müşteri kaybettirir. %100 Core Web Vitals yeşil skor ve <1.8 sn LCP hedefiyle teslim — performans sözleşmeye girer.",
  },
  {
    icon: "trophy",
    color: V,
    badge: "15+",
    title: "15 Yıllık Sektörel Otorite",
    desc: <><span className="font-stat">200+</span> tamamlanan proje ve <span className="font-stat">150+</span> memnun kurumsal müşteriyle elde edilmiş gerçek deneyim — referans listesi açık.</>,
  },
  {
    icon: "shield",
    color: C,
    title: "OWASP Standartlarında Güvenlik",
    desc: "KVKK ve GDPR uyumlu güvenlik mimarisi; OWASP Top 10 sızma testleri ve kod analizi — veri güvenliği teslim öncesi denetlenir.",
  },
  {
    icon: "target",
    color: V,
    title: "SEO Uyumlu Kodlama",
    desc: "Google'ın sitenizi doğru indekslemesi için yapısal veri şemaları, teknik SEO ve Core Web Vitals optimizasyonu hazır teslim.",
  },
  {
    icon: "users",
    color: C,
    title: "Şeffaf Süreç & Sabit Fiyat",
    desc: "Haftalık demo gösterimleri, anlık iletişim kanalı ve sürpriz maliyet barındırmayan şeffaf proje yönetimi — teklif net gelir.",
  },
  {
    icon: "check-circle",
    color: V,
    title: "Teslim Sonrası 7/24 Destek",
    desc: "Proje bitmek yenisinin başlangıcıdır. Teknik bakım, güvenlik güncellemeleri ve geliştirme hizmetleriyle uzun vadede yanınızdayız.",
  },
];

export default function WhyXipsoft() {
  const t = useTranslations("about");
  const sectionRef = useRef<HTMLElement>(null);

  // Mouse ile aşağı indikçe (scroll ettikçe) öğelerin sırayla açılmasını sağlayan observer
  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-12");
          observer.unobserve(entry.target); // Bir kez açıldıktan sonra gözlemeyi bırak
        }
      });
    };

    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: "0px 0px -100px 0px", // Ekranın altından 100px kala tetikle
      threshold: 0.1,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const elements = sectionRef.current?.querySelectorAll(".scroll-reveal-item");

    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef} 
      id="why-xipsoft" 
      className="py-20 lg:py-28 border-t border-white/[0.05]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Başlık Alanı (İlk açılan kısım) */}
        <div className="text-center mb-12 scroll-reveal-item opacity-0 translate-y-12 transition-all duration-700 ease-out">
          <TitleText tag="h2" variant="brand" className="mb-3">
            {t("whyUs.title")}
          </TitleText>
          {/* Gradient divider — palette token */}
          <div className="flex justify-center mb-3">
            <div
              className="h-[1.5px] w-16 rounded-full"
              style={{ background: `linear-gradient(90deg, transparent, ${V}, transparent)` }}
            />
          </div>
          <p className="text-ink-muted max-w-lg mx-auto text-sm leading-relaxed">
            {t("whyUs.subtitle")}
          </p>
        </div>

        {/* Kartlar grid (Aşağı indikçe sırayla yukarı kayarak açılır) */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {strengthCards.map((card, index) => {
            // Her karta sırayla hafif gecikme (staggered effect) veriyoruz
            const delayStyle = { transitionDelay: `${index * 120}ms` };

            return (
              <div 
                key={card.title} 
                className="group relative scroll-reveal-item opacity-0 translate-y-12 transition-all duration-700 ease-out"
                style={delayStyle}
              >
                <GlassCard className="home-liquid-glass relative overflow-hidden transition-all duration-500 hover:-translate-y-1.5 h-full">
                  {/* Hover iç glow — palette rengine göre */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at top left, ${card.color}18, transparent 55%)`,
                    }}
                  />

                  <div className="relative z-10 p-7 xl:p-8 flex flex-col h-full">
                    {/* İkon + badge */}
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="icon-backlight flex items-center justify-center w-12 h-12 rounded-2xl"
                        style={{
                          background: `${card.color}12`,
                          border: `1px solid ${card.color}30`,
                        }}
                      >
                        <XipIcon name={card.icon} glow="strong" className="w-5 h-5" style={{ color: card.color }} />
                      </div>
                      {card.badge && (
                        <span
                          className="font-stat text-xs font-bold uppercase tracking-[0.3em]"
                          style={{ color: card.color }}
                        >
                          {card.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black tracking-tight text-white mb-3">
                      {card.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-ink-muted mt-auto">
                      {card.desc}
                    </p>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}