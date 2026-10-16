"use client";

import React, { forwardRef } from "react";
import { cn } from "@/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "elevated";
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = "", variant = "default", hover = false, padding = "md", ...props }, ref) => {
    const baseStyles = cn(
      "rounded-card transition-all duration-normal ease-out-expo",
      "bg-brand-neutral-surface",
    );

    const variantStyles = {
      default: "shadow-card",
      bordered: "border border-brand-neutral-border shadow-none",
      elevated: "shadow-card-hover",
    };

    const paddingStyles = {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    };

    const hoverStyles = hover
      ? "hover:shadow-card-hover hover:-translate-y-0.5 hover:border-brand-secondary/20"
      : "";

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], paddingStyles[padding], hoverStyles, className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className = "", ...props }, ref) => (
    <div ref={ref} className={cn("mb-4", className)} {...props}>{children}</div>
  ),
);
CardHeader.displayName = "CardHeader";

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: "sm" | "md" | "lg";
}
export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className = "", size = "md", ...props }, ref) => {
    const sizeStyles = {
      sm: "text-heading-sm",
      md: "text-heading-md",
      lg: "text-heading-lg",
    };
    return (
      <h3 ref={ref} className={cn("font-semibold text-brand-text-primary", sizeStyles[size], className)} {...props}>
        {children}
      </h3>
    );
  },
);
CardTitle.displayName = "CardTitle";

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className = "", ...props }, ref) => (
    <p ref={ref} className={cn("mt-1 text-brand-text-tertiary text-body-sm", className)} {...props}>{children}</p>
  ),
);
CardDescription.displayName = "CardDescription";

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className = "", ...props }, ref) => (
    <div ref={ref} className={cn(className)} {...props}>{children}</div>
  ),
);
CardContent.displayName = "CardContent";

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mt-4 pt-4 border-t border-brand-neutral-borderLight flex items-center gap-3", className)}
      {...props}
    >
      {children}
    </div>
  ),
);
CardFooter.displayName = "CardFooter";

export default Card;