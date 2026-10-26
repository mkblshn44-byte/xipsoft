"use client";

/**
 * IceButton — Saydam yüzeyli, mavi çerçeveli evrensel "Teklif Al" butonu.
 */
import { motion } from "motion/react";
import XipIcon from "@/components/Ui/Icon";
import { cn } from "@/utils";
import { teklifModal } from "@/components/Common/TeklifModal/teklif-modal-store";

interface IceButtonProps {
  label?: string;
  service?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  onClick?: () => void;
}

export default function IceButton({
  label = "Teklif Al",
  service,
  className,
  size = "md",
  fullWidth = false,
  onClick,
}: IceButtonProps) {
  const handleClick = () => {
    onClick?.();
    teklifModal.open(service);
  };

  const sizeClasses = {
    sm: "px-4 py-2.5 text-xs gap-2",
    md: "px-5 py-3 text-sm gap-2.5",
    lg: "px-7 py-3.5 text-sm gap-3",
  };

  return (
    // `btn-glint` → "Teklif Al" butonunda üzerinden geçen ışık süpürmesi
    // (tbg-12 `glint` keyframe'i). Basma efekti kendi `whileTap`'inde kalır.
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.96 }}
      className={cn(
        "btn-glint group relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-neon-500/60 bg-transparent",
        "font-display font-bold tracking-wide text-neon-300",
        "shadow-btn-accent transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-neon-300 hover:shadow-btn-accent-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        "active:translate-y-0 active:scale-[0.98]",
        fullWidth && "w-full",
        sizeClasses[size],
        className,
      )}
    >
      <span>{label}</span>
      <XipIcon name="arrow-right" glow="strong" halo="red" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </motion.button>
  );
}
