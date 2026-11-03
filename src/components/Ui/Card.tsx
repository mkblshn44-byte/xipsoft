import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils";

/**
 * XipSoft — Merkezi Kart Sistemi
 *
 * Tum stiller src/styles/colors-glass.css icinde tanimlidir.
 * Bilesenler sadece `.card` class'ini ekler, varyantlari
 * `card--flat`, `card--outline`, `card--elevated`, `card--interactive`, `card--admin`
 * ile secer.
 */

const Card = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "flat" | "outline" | "elevated" | "interactive" | "admin";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "card",
      variant === "flat" && "card--flat",
      variant === "outline" && "card--outline",
      variant === "elevated" && "card--elevated",
      variant === "interactive" && "card--interactive",
      variant === "admin" && "card--admin",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const GlassCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("card", className)}
      {...props}
    />
  )
);
GlassCard.displayName = "GlassCard";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6 md:p-8", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl md:text-2xl font-bold leading-tight tracking-tight text-ink",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm md:text-base text-zinc-400 leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 md:p-8 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center p-6 md:p-8 pt-0 border-t border-white/[0.04] mt-2",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  GlassCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
