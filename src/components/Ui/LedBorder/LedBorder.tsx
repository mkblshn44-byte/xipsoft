"use client";
import { motion } from "motion/react";
import { cn } from "@/utils";
import { PALETTE } from "@/config/palette";

type LedVariant = "fire" | "prism" | "dark-fire";

interface LedBorderProps {
  variant?: LedVariant;
  thick?: boolean;
  position?: "top" | "bottom";
  className?: string;
  speed?: number;
}

// Renkler ham hex değil merkezi paletten gelir (tek doğruluk kaynağı).
const A = PALETTE.neon[500];   // ana mavi
const AL = PALETTE.neon[300];  // açık mavi
/** Parıltı için neon-500'ün rgb karşılığı (renk değişirse palette.ts ile birlikte güncellenir). */
const glow = (a: number) => `rgba(167, 139, 250,${a})`;

const gradients: Record<LedVariant, { thin: string; thick: string }> = {
  fire: {
    thin: `linear-gradient(90deg, transparent 0%, ${A} 15%, ${A} 35%, ${A} 50%, ${A} 65%, ${A} 85%, transparent 100%)`,
    thick: `linear-gradient(90deg, transparent 0%, ${A} 12%, ${A} 30%, ${A} 50%, ${A} 70%, ${A} 88%, transparent 100%)`,
  },
  prism: {
    thin: `linear-gradient(90deg,transparent,${AL},${A},${A},${A},${AL},transparent)`,
    thick: `linear-gradient(90deg,transparent,${AL},${A},${A},${A},${AL},transparent)`,
  },
  "dark-fire": {
    thin: `linear-gradient(90deg,transparent,#000000 15%,${A} 50%,#000000 85%,transparent)`,
    thick: `linear-gradient(90deg,transparent,#000000 12%,${A} 50%,#000000 88%,transparent)`,
  },
};

const shadows: Record<LedVariant, { thin: string; thick: string }> = {
  fire: {
    thin: `0 0 10px ${glow(0.7)}, 0 0 20px ${glow(0.3)}`,
    thick: `0 0 14px ${glow(0.85)}, 0 0 32px ${glow(0.4)}`,
  },
  prism: {
    thin: `0 0 10px ${glow(0.1)}, 0 0 20px ${glow(0.06)}`,
    thick: `0 0 14px ${glow(0.14)}, 0 0 28px ${glow(0.08)}`,
  },
  "dark-fire": {
    thin: "none",
    thick: "none",
  },
};

export default function LedBorder({
  variant = "fire",
  thick = false,
  position = "top",
  className,
  speed,
}: LedBorderProps) {
  const h = thick ? "h-[3px]" : "h-[2px]";
  const grad = thick ? gradients[variant].thick : gradients[variant].thin;
  const shadow = shadows[variant][thick ? "thick" : "thin"];
  const dur = speed ?? (thick ? 3.5 : 4);

  return (
    <div className={cn("absolute left-0 right-0 overflow-hidden", h, position === "top" ? "top-0" : "bottom-0", className)}>
      <motion.div
        className="h-full w-[200%]"
        style={{ background: grad, boxShadow: shadow }}
        animate={{ x: ["-50%", "0%"] }}
        transition={{ duration: dur, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
