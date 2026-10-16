"use client";

/**
 * IceButton — Evrensel "Teklif Al" butonu.
 * Buz / glass blur efekti, tüm sayfalarda tutarlı görünüm.
 */
import { motion } from "motion/react";
import { Zap } from "lucide-react";
import { cn } from "@/utils";
import { teklifModal } from "@/components/Common/TeklifModal/TeklifModal";

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
    sm: "px-4 py-2 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-7 py-3.5 text-sm gap-2",
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.96 }}
      className={cn(
        "relative inline-flex items-center justify-center font-bold rounded-xl",
        "text-neon-300 tracking-wide",
        // neon mor glass base
        "bg-gradient-to-br from-neon-500/25 via-neon-600/12 to-neon-500/20",
        "border border-neon-500/40",
        "backdrop-blur-md",
        "shadow-[0_0_20px_rgba(157,114,255,0.24),inset_0_1px_0_rgba(255,255,255,0.12)]",
        // hover
        "hover:border-neon-400/60",
        "hover:from-neon-500/35 hover:via-neon-600/20 hover:to-neon-400/30",
        "hover:shadow-[0_0_32px_rgba(157,114,255,0.42),inset_0_1px_0_rgba(255,255,255,0.18)]",
        "transition-all duration-300",
        "active:scale-95",
        fullWidth && "w-full",
        sizeClasses[size],
        className,
      )}
    >
      {/* İç üst parlaklık */}
      <span className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/12 via-white/4 to-transparent pointer-events-none" />
      {/* Alt çizgi */}
      <span className="absolute inset-x-0 bottom-0 h-[1px] rounded-b-xl bg-gradient-to-r from-transparent via-neon-400/45 to-transparent pointer-events-none" />
      {/* Sol kenar ışığı */}
      <span className="absolute inset-y-0 left-0 w-[1px] rounded-l-xl bg-gradient-to-b from-transparent via-neon-400/35 to-transparent pointer-events-none" />

      <Zap className="w-3.5 h-3.5 relative z-10 text-neon-300 drop-shadow-[0_0_5px_rgba(157,114,255,0.7)] shrink-0" />
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}
