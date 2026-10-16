"use client";

import React, { forwardRef } from "react";
import { cn } from "@/utils";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ children, className = "", size = "lg", ...props }, ref) => {
    const sizeStyles = {
      sm: "max-w-3xl",
      md: "max-w-5xl",
      lg: "max-w-7xl",
      xl: "max-w-[90rem]",
      full: "max-full",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "mx-auto px-container sm:px-6 lg:px-8",
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Container.displayName = "Container";

export default Container;