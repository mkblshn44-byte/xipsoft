"use client";
/**
 * PageSectionHeader — Tüm sayfalarda standart section baslıgı.
 * Büyük harf, drop-shadow, gradient metin, opsiyonel alt baslık.
 * "Yazılım & Teknoloji" badge pattern'ı kaldırıldı — dogrudan baslık.
 */
import { motion, useInView } from "motion/react";
import { useRef } from "react";

interface PageSectionHeaderProps {
  /** Ana baslık — büyük harf uygulanır */
  title: string;
  /** Küçük açıklama metni */
  subtitle?: string;
  /** h1 veya h2 */
  tag?: "h1" | "h2";
  className?: string;
  /** ↓ kaydır ipucu göster */
  showScrollHint?: boolean;
}

export default function PageSectionHeader({
  title,
  subtitle,
  tag = "h2",
  className = "",
  showScrollHint = false,
}: PageSectionHeaderProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });

  const Tag = tag;

  return (
    <div ref={ref} className={`text-center ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Tag
          className={`
            -display font-black uppercase tracking-tight leading-none
            text-3xl sm:text-4xl lg:text-5xl xl:text-6xl
            bg-gradient-to-b from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent
            mb-4
          `}
          style={{
            filter: "drop-shadow(0 0 20px rgba(255,255,255,0.12))",
          }}
        >
          {title}
        </Tag>

        {subtitle && (
          <motion.p
            className="text-zinc-500 text-base max-w-xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {subtitle}
          </motion.p>
        )}

        {showScrollHint && (
          <p className="text-zinc-600 text-xs mt-4 -mono animate-bounce">↓ kaydır</p>
        )}
      </motion.div>
    </div>
  );
}
