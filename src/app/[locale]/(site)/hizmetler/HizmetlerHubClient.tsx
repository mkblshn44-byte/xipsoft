"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe, Smartphone, Bot, Shield, Monitor, ShoppingCart,
  Cloud, GitBranch, BarChart2, PieChart, Layers, CheckCircle,
  ArrowRight, Search, Sparkles, MessageCircle,
  Code2, Zap, Lock, Cpu
} from "lucide-react";
import type { ServiceHubItem } from "@/types/common";
import { teklifModal } from "@/components/Common/TeklifModal/TeklifModal";
import { BRAND_COMPANY, BRAND_COLORS } from "@/config/brand.config";
import FaqSection from "@/components/seo/FaqSection";

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Globe,
  Smartphone,
  Bot,
  Shield,
  Monitor,
  ShoppingCart,
  Cloud,
  GitBranch,
  BarChart2,
  PieChart,
  Layers,
  Code2,
  Zap,
  Lock,
  Cpu,
};

const CATEGORIES = [
  { id: "all", label: "Tüm Hizmetler" },
  { id: "software", label: "Yazılım & Web" },
  { id: "automation", label: "Otomasyon & AI" },
  { id: "mobile", label: "Mobil Çözümler" },
  { id: "cloud-security", label: "Bulut & Güvenlik" },
] as const;

export interface HizmetlerHubClientProps {
  /** NeonDB `services` tablosundan gelen hizmet listesi (bkz. MIMARI.md). */
  services: ServiceHubItem[];
  faq: Array<{ question: string; answer: string }>;
}

export default function HizmetlerHubClient({ services, faq }: HizmetlerHubClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredServices = useMemo(() => {
    return services.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.features.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen relative text-zinc-100 overflow-hidden">
      {/* Background Gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 45% at 50% 0%, rgba(167,139,250,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 40%, rgba(34,211,238,0.08) 0%, transparent 55%),
            radial-gradient(ellipse 60% 45% at 10% 80%, rgba(251,191,36,0.06) 0%, transparent 60%)
          `,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-8 text-xs font-mono text-zinc-500">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-zinc-300 transition-colors">
                Ana Sayfa
              </Link>
            </li>
            <li className="text-zinc-700">/</li>
            <li className="text-zinc-300 font-medium">Hizmetlerimiz</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <header className="text-center max-w-3xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-mono tracking-wider uppercase mb-5"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Uçtan Uca Teknoloji Mimarisi</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight"
          >
            Özel Yazılım, Akıllı Otomasyon &{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-rose-400 bg-clip-text text-transparent">
              Teknoloji Hizmetleri
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-base sm:text-lg text-zinc-400 leading-relaxed"
          >
            Modern web ve mobil platformlardan Python tabanlı süreç otomasyonlarına,
            bulut mimarisinden siber Güvenlik denetimlerine kadar işletmenizin dijital büyümesini
            hızlandıran yüksek performanslı mühendislik çözümleri.
          </motion.p>
        </header>

        {/* Filter & Search Bar */}
        <div className="mb-12 flex flex-col md:flex-row gap-4 items-center justify-between border-y border-white/[0.08] py-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 ${
                    active
                      ? "bg-white text-zinc-950 font-semibold shadow-lg shadow-white/10"
                      : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hizmet veya teknoloji ara..."
              className="w-full bg-zinc-900/80 border border-white/[0.1] rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service, index) => {
              const Icon = ICON_COMPONENTS[service.icon] || Globe;
              return (
                <motion.article
                  layout
                  key={service.slug}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  className="group relative flex flex-col justify-between rounded-2xl p-7 bg-zinc-900/60 border border-white/[0.08] backdrop-blur-xl transition-all duration-300 hover:border-white/[0.2] hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 overflow-hidden"
                >
                  {/* Subtle top indicator */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(90deg, transparent, ${service.color}, transparent)` }}
                  />

                  <div>
                    {/* Header: Icon & Badge */}
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                        style={{
                          background: `${service.color}15`,
                          border: `1px solid ${service.color}35`,
                          color: service.color,
                        }}
                      >
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex items-center gap-2">
                        {service.popular && (
                          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                            Öne Çıkan
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-zinc-500 uppercase">
                          {service.categoryLabel}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                      <Link href={`/hizmetler/${service.slug}`}>
                        {service.title}
                      </Link>
                    </h2>

                    {/* Short Description */}
                    <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                      {service.shortDesc}
                    </p>

                    {/* Feature Bullets */}
                    <ul className="space-y-2.5 mb-8">
                      {service.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-xs text-zinc-300">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: service.color }} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-5 border-t border-white/[0.06] flex items-center justify-between gap-3">
                    <Link
                      href={`/hizmetler/${service.slug}`}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-white group-hover:text-cyan-400 transition-colors"
                    >
                      <span>Detayları İncele</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => teklifModal.open(service.title)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
                    >
                      Teklif Al
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Value Proposition / Why XipSoft */}
        <section className="rounded-3xl p-8 sm:p-12 mb-20 bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] relative overflow-hidden">
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold mb-2 block">
              Mühendislik Standartlarımız
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
              Neden XipSoft ile Çalışmalısınız?
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Hazır kalıplar ve hantal temalar yerine, projenizin ihtiyacına göre sıfırdan mimari tasarlarız.
              Hız, Güvenlik, SEO ve ölçeklenebilirlik teslim ettiğimiz her satır kodun değişmez temelidir.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/[0.06]">
              <div className="text-3xl font-black text-white mb-1">15+ Yıl</div>
              <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">Sektör Tecrübesi</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                2010 yılından bugüne yüzlerce şirkete güvenilir yazılım altyapısı ve danışmanlık sağladık.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/[0.06]">
              <div className="text-3xl font-black text-white mb-1">200+</div>
              <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Tamamlanan Proje</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                E-ticaret sistemlerinden finans botlarına, mobil uygulamalardan ERP entegrasyonlarına.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/[0.06]">
              <div className="text-3xl font-black text-white mb-1">&lt; 2.0 sn</div>
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">LCP & Sayfa Hızı</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Core Web Vitals yeşil bant garantisiyle arama motorlarında rakiplerinizden hızlı olun.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/[0.06]">
              <div className="text-3xl font-black text-white mb-1">24 Saat</div>
              <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">Hızlı Teklif Süresi</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Teknik gereksinimlerinizi dinler, 24 saat içinde net takvim ve bütçe planı sunarız.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section — sayfaya özel, veri yoksa render edilmez */}
        {faq.length > 0 && (
          <section className="max-w-4xl mx-auto mb-20">
            <FaqSection
              items={faq}
              eyebrow="Merak Edilenler"
              title="Hizmetlerimiz Hakkında Sıkça Sorulan Sorular"
              subtitle="Yazılım geliştirme, otomasyon botları ve iş birliği süreçlerimize dair en çok sorulan sorular."
            />
          </section>
        )}

        {/* CTA Conversion Banner */}
        <section className="rounded-3xl p-8 sm:p-14 text-center bg-gradient-to-r from-violet-900/30 via-cyan-900/20 to-blue-900/30 border border-white/[0.12] backdrop-blur-2xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
              Yeni Projenizi Hayata Geçirmeye Hazır mısınız?
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 mb-8 leading-relaxed">
              Özel yazılım veya süreç otomasyonu fikrinizi uzman mühendislerimizle değerlendirin.
              İhtiyaçlarınıza özel teknik mimariyi belirleyelim, 24 saat içinde ücretsiz teklifinizi sunalım.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => teklifModal.open("Hizmetler Hub Sayfası")}
                className="site-cta-primary px-6 py-3.5 text-sm font-bold transition-all hover:scale-[1.03]"
              >
                Ücretsiz Teklif Alın
              </button>

              <Link
                href="/contact-us"
                className="px-6 py-3.5 rounded-xl text-sm font-semibold text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] transition-all"
              >
                Bizimle İletişime Geçin
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
