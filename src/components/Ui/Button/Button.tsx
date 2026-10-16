"use client";

import React, { forwardRef } from "react";
import { cn } from "@/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant - only 3 variants per design system */
  variant?: "primary" | "secondary" | "ghost";
  /** Button size */
  size?: "sm" | "md" | "lg" | "xl";
  /** Loading state */
  isLoading?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Right icon */
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles = cn(
      "relative inline-flex items-center justify-center gap-2 font-semibold transition-all duration-normal ease-out-expo",
      "rounded-btn",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
      fullWidth && "w-full",
      "min-h-[44px]", // Touch target minimum
    );

    const variantStyles = {
      primary: cn(
        "bg-brand-secondary text-white",
        "hover:bg-brand-secondary-light",
        "active:bg-brand-secondary-dark",
        "shadow-btn hover:shadow-btn-hover",
        "text-body-md",
      ),
      secondary: cn(
        "border-2 border-brand-secondary text-brand-secondary bg-transparent",
        "hover:bg-brand-secondary hover:text-white",
        "active:bg-brand-secondary-dark",
        "text-body-md",
      ),
      ghost: cn(
        "text-brand-text-secondary bg-transparent",
        "hover:text-brand-primary hover:bg-brand-neutral-bgAlt",
        "active:bg-brand-neutral-borderLight",
        "text-body-md",
      ),
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-body-sm gap-1.5",
      md: "px-5 py-2.5 text-body-md gap-2",
      lg: "px-6 py-3 text-body-lg gap-2",
      xl: "px-8 py-4 text-display-sm gap-2.5",
    };

    const iconSize = {
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-5 h-5",
      xl: "w-5 h-5",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && (
          <svg
            className={cn("animate-spin", iconSize[size])}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && (
          <span className={cn("flex-shrink-0", iconSize[size])} aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <span className="relative z-10 flex items-center">{children}</span>
        {!isLoading && rightIcon && (
          <span className={cn("flex-shrink-0", iconSize[size])} aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;