"use client";
import { motion } from "motion/react";
import { cn } from "@/utils";

type LedVariant = "fire" | "prism" | "dark-fire";

interface LedBorderProps {
  variant?: LedVariant;
  thick?: boolean;
  position?: "top" | "bottom";
  className?: string;
  speed?: number;
}

const gradients: Record<LedVariant, { thin: string; thick: string }> = {
  fire: {
    thin: "linear-gradient(90deg, transparent 0%, #a78bfa 15%, #a78bfa 35%, #a78bfa 50%, #a78bfa 65%, #a78bfa 85%, transparent 100%)",
    thick: "linear-gradient(90deg, transparent 0%, #a78bfa 12%, #a78bfa 30%, #a78bfa 50%, #a78bfa 70%, #a78bfa 88%, transparent 100%)",
  },
  prism: {
    thin: "linear-gradient(90deg,transparent,#ddd6fe,#a78bfa,#a78bfa,#a78bfa,#ddd6fe,transparent)",
    thick: "linear-gradient(90deg,transparent,#ddd6fe,#a78bfa,#a78bfa,#a78bfa,#ddd6fe,transparent)",
  },
  "dark-fire": {
    thin: "linear-gradient(90deg,transparent,#000000 15%,#a78bfa 50%,#000000 85%,transparent)",
    thick: "linear-gradient(90deg,transparent,#000000 12%,#a78bfa 50%,#000000 88%,transparent)",
  },
};

const shadows: Record<LedVariant, { thin: string; thick: string }> = {
  fire: {
    thin: "0 0 10px rgba(249,115,22,0.70), 0 0 20px rgba(251,191,36,0.30)",
    thick: "0 0 14px rgba(249,115,22,0.85), 0 0 32px rgba(251,191,36,0.40)",
  },
  prism: {
    thin: "0 0 10px rgba(167,139,250,0.40), 0 0 20px rgba(34,211,238,0.20)",
    thick: "0 0 14px rgba(167,139,250,0.50), 0 0 28px rgba(34,211,238,0.30)",
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
