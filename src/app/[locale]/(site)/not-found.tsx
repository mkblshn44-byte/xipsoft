"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Home, ArrowLeft, Globe, Code2, Shield, Smartphone } from "lucide-react";
import { BRAND_COLORS } from "@/config/brand.config";

const QUICK_LINKS = [
  { label: "Hizmetler",  href: "/hizmetler/web-yazilim-tasarim", color: BRAND_COLORS.secondary, icon: Globe },
  { label: "Blog",       href: "/blog",                          color: BRAND_COLORS.primary,   icon: Code2 },
  { label: "Güvenlik",   href: "/hizmetler/siber-guvenlik",      color: "#ddd6fe",              icon: Shield },
  { label: "Mobil",      href: "/hizmetler/mobil-uygulama",      color: BRAND_COLORS.accent,    icon: Smartphone },
];

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Arka plan */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 50% 0%, rgba(167,139,250,0.14) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 0% 100%, rgba(34,211,238,0.10) 0%, transparent 55%)
          `,
        }}
      />
      {/* grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(167,139,250,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(167,139,250,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 text-center max-w-xl w-full">
        {/* 404 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, filter: "blur(12px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            className="font-black leading-none select-none"
            style={{
              fontSize: "clamp(6rem, 20vw, 12rem)",
              background: "linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(167,139,250,0.5) 40%, rgba(34,211,238,0.4) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 50px rgba(167,139,250,0.4))",
            }}
          >
            404
          </span>
        </motion.div>

        {/* Ayırıcı */}
        <motion.div
          className="flex justify-center my-4"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div
            className="h-[2px] w-24 rounded-full"
            style={{
              background: "linear-gradient(90deg, transparent, #a78bfa, #ddd6fe, transparent)",
              boxShadow: "0 0 12px rgba(167,139,250,0.7)",
            }}
          />
        </motion.div>

        {/* Baslık */}
        <motion.h1
          className="font-black text-2xl md:text-3xl text-white mb-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Sayfa Bulunamadı
        </motion.h1>

        <motion.p
          className="text-zinc-500 text-sm leading-relaxed mb-10 max-w-sm mx-auto"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Aradıgınız sayfa kaldırılmıs, tasınmıs ya da hiç var olmamıs olabilir. Asagıdaki baglantılardan devam edebilirsiniz.
        </motion.p>

        {/* CTA butonlar */}
        <motion.div
          className="flex flex-wrap justify-center gap-3 mb-10"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-zinc-950 transition-all hover:scale-[1.03] active:scale-95"
            style={{
              background: "linear-gradient(135deg, #a78bfa, #ddd6fe)",
              boxShadow: "0 0 20px rgba(167,139,250,0.45)",
            }}
          >
            <Home className="w-4 h-4" />
            Ana Sayfaya Dön
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
            style={{
              background: "var(--color-card-bg)",
              border: "1px solid var(--color-border)",
              color: "rgba(255,255,255,0.75)",
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            geri git
          </button>
        </motion.div>

        {/* Hızlı baglantılar */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          {QUICK_LINKS.map((link, i) => {
            const Icon = link.icon;
            return (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.07 }}
              >
                <Link
                  href={link.href}
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: "var(--color-card-bg)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${link.color}15`, border: `1px solid ${link.color}25` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: link.color }} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-medium text-zinc-400 group-hover:text-white transition-colors">{link.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
