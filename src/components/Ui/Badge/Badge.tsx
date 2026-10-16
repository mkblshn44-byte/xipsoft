"use client";

import React, { forwardRef } from "react";
import { cn } from "@/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  dot?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, className = "", variant = "default", size = "md", dot = false, ...props }, ref) => {
    const baseStyles = cn(
      "inline-flex items-center gap-1.5 font-medium rounded-pill",
      "transition-colors duration-fast",
    );

    const variantStyles = {
      default: cn(
        "bg-brand-neutral-bgAlt text-brand-text-secondary",
        "border border-brand-neutral-borderLight",
      ),
      success: cn(
        "bg-brand-success-bg text-brand-success-text",
        "border border-brand-success-border",
      ),
      warning: cn(
        "bg-brand-warning-bg text-brand-warning-text",
        "border border-brand-warning-border",
      ),
      error: cn(
        "bg-brand-error-bg text-brand-error-text",
        "border border-brand-error-border",
      ),
      info: cn(
        "bg-brand-secondary-bg text-brand-secondary",
        "border border-brand-secondary-lighter",
      ),
    };

    const sizeStyles = {
      sm: "px-2 py-0.5 text-caption",
      md: "px-2.5 py-1 text-body-sm",
    };

    return (
      <span ref={ref} className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)} {...props}>
        {dot && (
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              variant === "success" && "bg-brand-success",
              variant === "warning" && "bg-brand-warning",
              variant === "error" && "bg-brand-error",
              variant === "info" && "bg-brand-accent",
              variant === "default" && "bg-brand-text-tertiary",
            )}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";

export default Badge;