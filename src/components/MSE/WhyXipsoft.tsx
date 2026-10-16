"use client";

import { motion } from "motion/react";
import { Trophy, Users, Shield, Zap, Target, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { PALETTE } from "@/config/palette";
import TitleText from "@/components/Common/TitleText/TitleText";
import { GlassCard } from "@/components/Ui/Card";
import type { LucideIcon } from "lucide-react";

// ─── Renk Sabitleri — tek kaynak ──────────────────────────────────────────
// Tüm kartlar yalnızca bu iki ana palette rengi kullanır.
const V = PALETTE.neon[500];  // #a78bfa — neon mor (birincil)
const C = PALETTE.accent.cyan; // #ddd6fe — cyan (ikincil)

type StrengthCard = {
  icon: LucideIcon;
  color: string;
  badge?: string;
  title: string;
  desc: string;
};

// Renkler: V (mor) ve C (cyan) arasında alt-alta dönüşümlü
const strengthCards: StrengthCard[] = [
  {
    icon: Zap,
    color: C,
    badge: "LCP",
    title: "Anında Açılan Web Sitesi",
    desc: "Yavaş siteler müşteri kaybettirir. %100 Core Web Vitals yeşil skor ve <1.8 sn LCP hedefiyle teslim — performans sözleşmeye girer.",
  },
  {
    icon: Trophy,
    color: V,
    badge: "15+",
    title: "15 Yıllık Sektörel Otorite",
    desc: "200+ tamamlanan proje ve 150+ memnun kurumsal müşteriyle elde edilmiş gerçek deneyim — referans listesi açık.",
  },
  {
    icon: Shield,
    color: C,
    title: "OWASP Standartlarında Güvenlik",
    desc: "KVKK ve GDPR uyumlu güvenlik mimarisi; OWASP Top 10 sızma testleri ve kod analizi — veri güvenliği teslim öncesi denetlenir.",
  },
  {
    icon: Target,
    color: V,
    title: "SEO Uyumlu Kodlama",
    desc: "Google'ın sitenizi doğru indekslemesi için yapısal veri şemaları, teknik SEO ve Core Web Vitals optimizasyonu hazır teslim.",
  },
  {
    icon: Users,
    color: C,
    title: "Şeffaf Süreç & Sabit Fiyat",
    desc: "Haftalık demo gösterimleri, anlık iletişim kanalı ve sürpriz maliyet barındırmayan şeffaf proje yönetimi — teklif net gelir.",
  },
  {
    icon: CheckCircle,
    color: V,
    title: "Teslim Sonrası 7/24 Destek",
    desc: "Proje bitmek yenisinin başlangıcıdır. Teknik bakım, güvenlik güncellemeleri ve geliştirme hizmetleriyle uzun vadede yanınızdayız.",
  },
];

export default function WhyXipsoft() {
  const t = useTranslations("about");

  return (
    <section className="py-20 lg:py-28 border-t border-white/[0.05]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Başlık */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <TitleText tag="h2" variant="silver" className="mb-3">
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
        </motion.div>

        {/* Kartlar grid */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {strengthCards.map((card, i) => {
            const CardIcon = card.icon;
            const direction = i % 3;
            const initialMotion =
              direction === 0
                ? { opacity: 0, x: -48, y: 18, scale: 0.96 }
                : direction === 1
                ? { opacity: 0, x: 48, y: 18, scale: 0.96 }
                : { opacity: 0, x: 0, y: -40, scale: 0.96 };

            return (
              <motion.div
                key={card.title}
                className="group relative"
                initial={initialMotion}
                whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.12 }}
                transition={{ duration: 0.85, delay: 0.12 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
              >
                <GlassCard className="relative overflow-hidden transition-all duration-500 hover:-translate-y-1.5">
                  {/* Hover iç glow — palette rengine göre */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at top left, ${card.color}18, transparent 55%)`,
                    }}
                  />

                  <div className="relative z-10 p-7 xl:p-8">
                    {/* İkon + badge */}
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="flex items-center justify-center w-12 h-12 rounded-2xl"
                        style={{
                          background: `${card.color}12`,
                          border: `1px solid ${card.color}30`,
                        }}
                      >
                        <CardIcon className="w-5 h-5" style={{ color: card.color }} strokeWidth={1.6} />
                      </div>
                      {card.badge && (
                        <span
                          className="text-xs font-bold uppercase tracking-[0.3em]"
                          style={{ color: card.color }}
                        >
                          {card.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black tracking-tight text-white mb-3">
                      {card.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-ink-muted">
                      {card.desc}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
