"use client";

/**
 * GoldButton — Saydam yüzeyli, marka aksanlı cam buton.
 *
 * Adı "gold" ama rengi `accent-gold` token'ından gelir; o token artık safir
 * mavisidir (bkz. palette.ts). Ham hex YAZILMAZ — palet değişince burada
 * sarı kalmasın.
 */
import { motion } from "motion/react";
import { cn } from "@/utils";

interface GoldButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export default function GoldButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  icon,
  iconPosition = "right",
}: GoldButtonProps) {
  const sizeClasses = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const variantStyles = {
    primary: cn(
      "border border-accent-gold/60 bg-transparent text-accent-goldLight font-semibold tracking-wide",
      "shadow-gold-glow",
      "hover:shadow-gold-glow-lg hover:-translate-y-0.5",
      "active:translate-y-0 active:scale-[0.98]"
    ),
    outline: cn(
      "bg-transparent border border-accent-gold/50 text-accent-gold",
      "hover:bg-accent-gold/10 hover:border-accent-gold",
      "active:bg-accent-gold/20"
    ),
    ghost: cn(
      "bg-transparent text-accent-gold",
      "hover:bg-accent-gold/10",
      "active:bg-accent-gold/20"
    ),
  };

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={cn(
        "relative inline-flex items-center justify-center rounded-btn transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050811]",
        variantStyles[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
    >
      {icon && iconPosition === "left" && (
        <span className="mr-2">{icon}</span>
      )}
      <span className="font-luxury">{children}</span>
      {icon && iconPosition === "right" && (
        <span className="ml-2">{icon}</span>
      )}
    </motion.button>
  );
}
