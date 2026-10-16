"use client";
/**
 * SectionReveal — Bölüm girisinde reveal animasyonu + opsiyonel baslık
 */
import { useRef, type ReactNode } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/utils";
import { BRAND_COLORS } from "@/config/brand.config";

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  tag?: string;
  tagIcon?: ReactNode;
  tagColor?: string;
  title?: string;
  subtitle?: string;
  topBorder?: boolean;
  accentColor?: string;
  amount?: number;
}

export default function SectionReveal({
  children,
  className,
  delay = 0,
  tag,
  tagIcon,
  tagColor = BRAND_COLORS.primary,
  title,
  subtitle,
  topBorder = false,
  accentColor = BRAND_COLORS.primary,
  amount = 0.15,
}: SectionRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount });

  return (
    <section ref={ref} className={cn("relative py-16 lg:py-24", className)}>
      {/* Üst border dekor */}
      {topBorder && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)` }}
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1, delay: delay + 0.2 }}
        />
      )}

      {/* Header */}
      {(tag || title) && (
        <motion.div
          className="text-center mb-12 px-4"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        >
          {tag && (
            <div className="flex items-center justify-center gap-2 mb-3">
              {tagIcon && <span style={{ color: tagColor }}>{tagIcon}</span>}
              <span className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: tagColor }}>
                {tag}
              </span>
            </div>
          )}

          {title && (
            <>
              <motion.h2
                className="font-black tracking-tight leading-tight mb-4"
                style={{
                  fontSize: "clamp(1.75rem, 4vw, 3.5rem)",
                  background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 30%, #e2e8f0 50%, #f1f5f9 70%, #ffffff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 24px rgba(255,255,255,0.18)) drop-shadow(0 0 12px rgba(148,163,184,0.10))",
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: delay + 0.1 }}
              >
                {title}
              </motion.h2>
              <motion.div
                className="flex justify-center mb-4"
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.7, delay: delay + 0.25 }}
              >
                <div
                  className="h-[1.5px] w-20 rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
                />
              </motion.div>
            </>
          )}

          {subtitle && (
            <motion.p
              className="text-zinc-500 max-w-xl mx-auto leading-relaxed"
              style={{ fontSize: "clamp(0.875rem, 1.5vw, 1rem)" }}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: delay + 0.2 }}
            >
              {subtitle}
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Içerik */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: delay + 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}
