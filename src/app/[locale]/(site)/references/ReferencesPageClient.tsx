"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import XipIcon from "@/components/Ui/Icon";
import { teklifModal } from "@/components/Common/TeklifModal/teklif-modal-store";
import { BRAND_COLORS } from "@/config/brand.config";
import Hero from "@/components/Landing/Hero";
import TitleText from "@/components/Common/TitleText/TitleText";
import { GlassCard } from "@/components/Ui/Card";
import GlassBentoGrid from "@/components/Ui/GlassBento/GlassBentoGrid";
import type { CardItem } from "@/components/Ui/ScrollGrid3D/ScrollGrid3DCards";
import type { Reference } from "@/lib/db/references";

const Scrollgrid3DCards = dynamic(
  () => import("@/components/Ui/ScrollGrid3D/ScrollGrid3DCards"),
  { ssr: false }
);

// ─── Veri ──────────────────────────────────────────────────────────────────

const projectCategoryCards: CardItem[] = [
  { icon: "globe",        color: BRAND_COLORS.secondary, title: "Kurumsal Web",         desc: "sirket tanıtım siteleri, landing page, çok dilli web uygulamaları." },
  { icon: "shopping-cart",  color: BRAND_COLORS.accent, title: "E-Ticaret",            desc: "B2C & B2B e-ticaret sistemleri, ödeme entegrasyonları, stok yönetimi." },
  { icon: "smartphone",    color: BRAND_COLORS.primary, title: "Mobil Uygulama",       desc: "iOS & Android native ve cross-platform yüksek performanslı uygulamalar." },
  { icon: "monitor",       color: BRAND_COLORS.accentDeep, title: "Masaüstü ERP/CRM",     desc: "Windows/macOS tabanlı isletme yönetim ve otomasyon yazılımları." },
  { icon: "shield",        color: "#ddd6fe", title: "Güvenlik Çözümleri",   desc: "Pentest, Güvenlik denetimi, sızdırmazlık testleri ve KVKK danısmanlıgı." },
  { icon: "bar-chart2",     color: "#c4b5fd", title: "SEO & Dijital Reklam", desc: "Organik büyüme, google Ads, içerik stratejisi ve dönüsüm optimizasyonu." },
  { icon: "cpu",           color: BRAND_COLORS.secondary, title: "Özel Yazılım",         desc: "ERP, CRM, lojistik, üretim takip ve is akısı otomasyon sistemleri." },
  { icon: "truck",         color: BRAND_COLORS.accent, title: "Lojistik & Takip",     desc: "Kargo takip, araç yönetimi, rota optimizasyonu yazılım sistemleri." },
  { icon: "heart-pulse",    color: BRAND_COLORS.primary, title: "Saglık IT",            desc: "Klinik yönetim, hasta takip, randevu ve raporlama sistemleri." },
  { icon: "graduation-cap", color: BRAND_COLORS.accentDeep, title: "Egitim Platformu",    desc: "LMS, video platform, online sınav ve sertifika yönetim sistemleri." },
  { icon: "building2",     color: "#ddd6fe", title: "Fintech & Muhasebe",   desc: "Finansal raporlama, fatura yönetimi, ödeme sistemi entegrasyonları." },
  { icon: "scale",         color: "#c4b5fd", title: "Hukuk & Belge",        desc: "Sözlesme yönetimi, e-imza, arsivleme ve yasal süreç takip sistemleri." },
];

const sectorCards: CardItem[] = [
  { icon: "globe",      color: BRAND_COLORS.secondary, title: "Web & E-Ticaret",   desc: "85+ basarılı web projesi" },
  { icon: "smartphone",  color: BRAND_COLORS.primary, title: "Mobil Uygulamalar", desc: "40+ iOS & Android projesi" },
  { icon: "shield",      color: "#ddd6fe", title: "Siber Güvenlik",    desc: "30+ Güvenlik denetimi" },
  { icon: "bar-chart2",   color: BRAND_COLORS.accent, title: "SEO & Pazarlama",   desc: "25+ dijital büyüme projesi" },
  { icon: "monitor",     color: BRAND_COLORS.accentDeep, title: "Masaüstü Yazılım",  desc: "20+ ERP/CRM sistemi" },
  { icon: "cpu",         color: "#c4b5fd", title: "Özel Çözümler",     desc: "15+ kurumsal yazılım" },
];

// ─── Kategori renk haritası — DB'den gelen category'ye renk atar ─────────────

const CATEGORY_COLORS: Record<string, string> = {
  "Kurumsal Web": BRAND_COLORS.secondary,
  "E-Ticaret":    BRAND_COLORS.accent,
  "Fintech":      "#ddd6fe",
  "Eğitim":       BRAND_COLORS.accentDeep,
  "Ağır Sanayi":  BRAND_COLORS.primary,
  "Mobil":        BRAND_COLORS.primary,
  "SEO":          "#c4b5fd",
  "Özel Yazılım": "#c4b5fd",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? BRAND_COLORS.secondary;
}

const testimonials = [
  { name: "Ahmet Y.",  company: "E-Ticaret Firması", text: "XipSoft ekibi projemizi zamanında ve beklentilerimizin üzerinde teslim etti. Teknik bilgileri ve iletisimleri mükemmeldi.", service: "Web & E-Ticaret",  color: BRAND_COLORS.secondary },
  { name: "Mehmet K.", company: "Lojistik sirketi",  text: "Masaüstü yazılım projemizde XipSoft'un uzmanlıgı gerçekten fark yarattı. Kaynak dosyaları da teslim ettiler.",              service: "Masaüstü Yazılım", color: BRAND_COLORS.accentDeep },
  { name: "Ayse D.",   company: "Saglık Klinigi",    text: "Mobil uygulamamız hem iOS hem Android'de sorunsuz çalısıyor. Destek süreçleri de çok hızlı.",                               service: "Mobil Uygulama",   color: BRAND_COLORS.primary },
  { name: "Kemal S.",  company: "Fintech girisimi",  text: "Güvenlik denetimi ve pentest sürecinde XipSoft'un titizligi bizi çok etkiledi. Açıkları raporlayıp çözüme kavusturdular.", service: "Siber Güvenlik",   color: "#ddd6fe" },
  { name: "Selin A.",  company: "Dijital Ajans",      text: "SEO çalısmaları sonucunda organik trafigimiz 3 ayda %180 arttı. Raporlama ve seffaflıkları çok degerliydi.",               service: "SEO & Dijital",    color: BRAND_COLORS.accent },
  { name: "Burak T.",  company: "Üretim Firması",    text: "ERP entegrasyonumuz sorunsuz tamamlandı. Özellestirme talepleri için her zaman hızlı dönüs yaptılar.",                       service: "Özel Yazılım",     color: "#c4b5fd" },
];

// ─── Bölüm başlığı ───────────────────────────────────────────────────────────

const SectionHeader = ({
  title, subtitle, color = "rgba(148, 163, 184,0.4)", isInView,
}: {
  title: string; subtitle?: string; color?: string; isInView: boolean;
}) => (
  <motion.div
    className="text-center mb-12"
    initial={{ opacity: 0, y: 24 }}
    animate={isInView ? { opacity: 1, y: 0 } : {}}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
  >
    <TitleText tag="h2" variant="brand" className="mb-3">
      {title}
    </TitleText>
    <div className="flex justify-center mb-3">
      <div className="h-[1.5px] w-16 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
    </div>
    {subtitle && <p className="text-zinc-500 max-w-lg mx-auto text-sm leading-relaxed">{subtitle}</p>}
  </motion.div>
);

// ─── Ana bilesen ─────────────────────────────────────────────────────────────

export default function ReferencesPageClient({ dbReferences }: { dbReferences: Reference[] }) {
  const projectsRef    = useRef(null);
  const sectorsRef     = useRef(null);
  const liveRefRef     = useRef(null);
  const testimonialRef = useRef(null);
  const ctaRef         = useRef(null);
  const tRef = useTranslations("references");

  const projectsInView    = useInView(projectsRef,    { once: true, amount: 0.05 });
  const sectorsInView     = useInView(sectorsRef,     { once: true, amount: 0.1 });
  const liveRefInView     = useInView(liveRefRef,     { once: true, amount: 0.05 });
  const testimonialInView = useInView(testimonialRef, { once: true, amount: 0.1 });
  const ctaInView         = useInView(ctaRef,         { once: true, amount: 0.3 });

  return (
    <div className="min-h-screen">

      {/* ══ NEON HERO ══════════════════════════════════════════════════ */}
      <Hero
        variant="page"
        copy={{
          titleLine1: "200+ Basarılı",
          titleLine2: "Proje",
          subtitle:
            "15 yılda web'den mobil'e, masaüstünden siber güvenlige her sektörde güvenilir çözümler. Her proje müsteriye özel kodlanır, teslim edilir ve desteklenir.",
          stats: [
            { value: "15+",  label: "Yıl Tecrübe" },
            { value: "200+", label: "Proje" },
            { value: "150+", label: "Müsteri" },
            { value: "12",   label: "Sektör" },
          ],
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ══ PROJE KATEgORILERI — cam bento ═══════════════════════════ */}
        <section ref={projectsRef} className="py-16 lg:py-24">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[linear-gradient(155deg,#050a18_0%,#0a1730_42%,#060d1d_100%)] px-4 py-10 shadow-[0_30px_80px_-20px_rgba(5, 8, 17,0.9)] sm:px-6 lg:px-10 lg:py-14">
            {/* Dekoratif ışıltılar — içerik değil */}
            <div
              aria-hidden
              className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#7c3aed]/20 blur-[100px]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-[#7c3aed]/20 blur-[110px]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
            />

            <div className="relative z-10">
              <SectionHeader
                title={tRef("projects.title")}
                subtitle={tRef("projects.subtitle")}
                isInView={projectsInView}
              />
              <GlassBentoGrid items={projectCategoryCards} />
            </div>
          </div>
        </section>

        {/* ══ SEKTÖR DAgILIMI ══════════════════════════════════════════ */}
        <section ref={sectorsRef} className="py-20 lg:py-28 border-t border-white/[0.05]">
          <SectionHeader
            title={tRef("sectors.title")}
            subtitle={tRef("sectors.subtitle")}
            isInView={sectorsInView}
          />
          <Scrollgrid3DCards items={sectorCards} columns={3} animType="type1" uniformColor={BRAND_COLORS.accentDeep} />
        </section>

        {/* ══ CANLI REFERANS SİTELER ═══════════════════════════════════ */}
        <section ref={liveRefRef} className="py-20 lg:py-28 border-t border-white/[0.05]">
          <SectionHeader
            title="Teslim Edilen Projeler"
            subtitle="Geliştirip yayına aldığımız bazı referans sitelerimiz — canlı olarak inceleyebilirsiniz."
            color={BRAND_COLORS.secondary}
            isInView={liveRefInView}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {dbReferences.map((ref, i) => {
              const color = getCategoryColor(ref.category);
              const siteUrl = ref.project_url || ref.client_website || "#";
              const displayUrl = (ref.client_website || ref.project_url || "")
                .replace(/^https?:\/\/(www\.)?/, "")
                .replace(/\/$/, "");
              return (
                <motion.div
                  key={ref.id}
                  className="group relative"
                  initial={{ opacity: 0, y: 28, scale: 0.97 }}
                  animate={liveRefInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{ duration: 0.65, delay: 0.05 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  <GlassCard
                    className="relative flex flex-col gap-4 p-6 overflow-hidden transition-all duration-500 hover:-translate-y-1.5"
                    style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)" }}
                  >
                    {/* Hover üst çizgi */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl"
                      style={{ background: `linear-gradient(90deg, transparent, ${color}cc, transparent)` }}
                    />
                    {/* Hover iç glow */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none rounded-2xl"
                      style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${color}0f, transparent 68%)` }}
                    />
                    {/* Köşe orb */}
                    <div
                      className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-3xl"
                      style={{ background: color }}
                    />

                    {/* Üst satır: isim + kategori + link */}
                    <div className="flex items-start justify-between gap-3 relative z-10">
                      <div>
                        <h3 className="text-base font-bold text-white leading-tight">
                          {ref.client_name || ref.title}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: `${color}bb` }}>{ref.category}</p>
                      </div>
                      {siteUrl !== "#" && (
                        <a
                          href={siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 hover:scale-105"
                          style={{
                            background: `${color}18`,
                            border: `1px solid ${color}35`,
                            color: color,
                          }}
                        >
                          <XipIcon name="external-link" glow="none" className="w-3 h-3" />
                          Siteyi Gör
                        </a>
                      )}
                    </div>

                    {/* Açıklama */}
                    {ref.description && (
                      <p className="text-zinc-400 text-sm leading-relaxed relative z-10">{ref.description}</p>
                    )}

                    {/* Teknolojiler + URL */}
                    <div className="flex items-center justify-between gap-2 relative z-10 pt-1 border-t border-white/[0.05]">
                      <div className="flex flex-wrap gap-1.5">
                        {ref.technologies.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                            style={{ background: `${color}12`, color: `${color}cc`, border: `1px solid ${color}20` }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {displayUrl && (
                        <span className="text-zinc-600 text-[10px] font-mono shrink-0">{displayUrl}</span>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ══ MÜsTERI YORUMLARI ════════════════════════════════════════ */}
        <section ref={testimonialRef} className="py-20 lg:py-28 border-t border-white/[0.05]">
          <SectionHeader
            title={tRef("testimonials.title")}
            subtitle={tRef("testimonials.subtitle")}
            isInView={testimonialInView}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {testimonials.map((t, i) => {
              const dir = i % 3 === 0 ? { x: -28, y: 10 } : i % 3 === 1 ? { x: 28, y: 10 } : { x: 0, y: -28 };
              return (
                <motion.div
                  key={t.name}
                  className="group relative"
                  initial={{ opacity: 0, ...dir, scale: 0.97 }}
                  animate={testimonialInView ? { opacity: 1, x: 0, y: 0, scale: 1 } : {}}
                  transition={{ duration: 0.65, delay: 0.05 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  <GlassCard className="flex flex-col gap-4 p-6 transition-all duration-500 hover:-translate-y-1.5">
                    {/* hover üst çizgi */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl"
                      style={{ background: `linear-gradient(90deg, transparent, ${t.color}cc, transparent)` }}
                    />
                    {/* hover iç glow */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none rounded-2xl"
                      style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${t.color}10, transparent 68%)` }}
                    />
                    {/* köşe orb */}
                    <div
                      className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-3xl"
                      style={{ background: t.color }}
                    />

                    <XipIcon name="quote" glow="strong" className="w-6 h-6 opacity-20 relative z-10" style={{ color: t.color }} />
                    <p className="text-zinc-300 text-sm leading-relaxed relative z-10 flex-1">{t.text}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] relative z-10">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-zinc-950"
                          style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}99)` }}
                        >
                          {t.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{t.name}</p>
                          <p className="text-zinc-600 text-xs">{t.company}</p>
                        </div>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold"
                        style={{ background: `${t.color}12`, color: t.color, border: `1px solid ${t.color}20` }}
                      >
                        {t.service}
                      </span>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ══ CTA ═══════════════════════════════════════════════════════ */}
        <motion.section
          ref={ctaRef}
          className="py-20 mb-12 border-t border-white/[0.05]"
          initial={{ opacity: 0, y: 24 }}
          animate={ctaInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div
            className="relative rounded-3xl p-10 md:p-16 text-center overflow-hidden"
            style={{
              background: "linear-gradient(160deg, rgba(167, 139, 250,0.06), rgba(255,255,255,0.03))",
              border: "1px solid rgba(203, 213, 225, 0.08)",
            }}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(167, 139, 250,0.07) 0%, transparent 70%)" }} />
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-15">
              <div className="absolute w-[500px] h-[500px] rounded-full" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)", border: "1px solid rgba(203, 213, 225, 0.08)" }} />
              <div className="absolute w-[320px] h-[320px] rounded-full" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)", border: "1px solid rgba(167, 139, 250,0.12)" }} />
            </div>
            <h2
              className="relative z-10 font-black text-3xl md:text-4xl mb-4 brand-gradient-text"
              style={{
                backgroundImage: "linear-gradient(90deg, #ddd6fe 0%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Projenizi Konusalım
            </h2>
            <p className="relative z-10 text-zinc-400 mt-4 max-w-xl mx-auto leading-relaxed">
              Siz de 200+ basarılı projemize katılın. Ücretsiz danısmanlık için hemen iletisime geçin.
            </p>
            <div className="mt-8 relative z-10">
              <button
                onClick={() => teklifModal.open()}
                className="site-cta-primary group inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold shadow-[0_6px_20px_rgba(167, 139, 250,0.14)] transition-all duration-200 hover:-translate-y-0.5"
              >
                Ücretsiz Teklif Al <XipIcon name="external-link" glow="none" className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </motion.section>

      </div>
    </div>
  );
}
