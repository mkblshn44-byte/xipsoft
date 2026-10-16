"use client";

import React, { forwardRef } from "react";
import Container from "@/components/Ui/Container/Container";
import { cn } from "@/utils";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Section background variant */
  variant?: "default" | "alternate" | "primary" | "bordered";
  /** Vertical padding size */
  padding?: "sm" | "md" | "lg" | "xl" | "none";
  /** Container size */
  containerSize?: "sm" | "md" | "lg" | "xl" | "full";
  /** Custom background class */
  background?: string;
  /** Section ID for anchor links */
  sectionId?: string;
}

const Section = forwardRef<HTMLElement, SectionProps>(
  (
    {
      children,
      className = "",
      variant = "default",
      padding = "lg",
      containerSize = "lg",
      background,
      sectionId,
      ...props
    },
    ref,
  ) => {
    const variantStyles = {
      default: "bg-brand-neutral-bg",
      alternate: "bg-brand-neutral-bgAlt",
      primary: "bg-brand-primary text-brand-text-inverse",
      bordered: "bg-brand-neutral-bg border-y border-brand-neutral-border",
    };

    const paddingStyles = {
      none: "py-0",
      sm: "py-section-sm",
      md: "py-section-md",
      lg: "py-section-lg",
      xl: "py-[9rem] lg:py-[11rem]",
    };

    return (
      <section
        ref={ref}
        id={sectionId}
        className={cn(
          "w-full",
          variantStyles[variant],
          paddingStyles[padding],
          background,
          className,
        )}
        {...props}
      >
        <Container size={containerSize}>{children}</Container>
      </section>
    );
  },
);

Section.displayName = "Section";

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Eyebrow/overline text */
  eyebrow?: string;
  /** Main heading */
  title: string;
  /** Subtitle/description */
  description?: string;
  /** Alignment */
  align?: "left" | "center" | "right";
  /** Max width for text content */
  maxWidth?: "sm" | "md" | "lg" | "full";
  /** Custom className for title */
  titleClassName?: string;
  /** Custom className for description */
  descriptionClassName?: string;
}

export const SectionHeader = forwardRef<HTMLDivElement, SectionHeaderProps>(
  (
    {
      children,
      className = "",
      eyebrow,
      title,
      description,
      align = "center",
      maxWidth = "md",
      titleClassName,
      descriptionClassName,
      ...props
    },
    ref,
  ) => {
    const alignStyles = {
      left: "items-start text-left",
      center: "items-center text-center",
      right: "items-end text-right",
    };

    const maxWidthStyles = {
      sm: "max-w-2xl",
      md: "max-w-3xl",
      lg: "max-w-4xl",
      full: "max-w-full",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-4 mx-auto",
          alignStyles[align],
          maxWidthStyles[maxWidth],
          className,
        )}
        {...props}
      >
        {eyebrow && (
          <span className="text-overline uppercase text-brand-accent">
            {eyebrow}
          </span>
        )}
        <h2 className={cn("text-display-md text-brand-text-primary font-bold tracking-tight", titleClassName)}>
          {title}
        </h2>
        {description && (
          <p className={cn("text-body-lg text-brand-text-secondary max-w-2xl", descriptionClassName)}>
            {description}
          </p>
        )}
        {children}
      </div>
    );
  },
);

SectionHeader.displayName = "SectionHeader";

export default Section;