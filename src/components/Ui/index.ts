// XipSoft Design System - Unified UI Kit Exports
// ─────────────────────────────────────────────────────────────────
// Single source of truth for all UI components
// Use: import { Button, Card, Badge, Input, Section, Container } from "@/components/ui"

export { default as Button } from "./Button/Button";
export type { ButtonProps } from "./Button/Button";

export { default as Badge } from "./Badge/Badge";
export type { BadgeProps } from "./Badge/Badge";

export { default as Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./Card/Card";
export type { CardProps, CardHeaderProps, CardTitleProps, CardDescriptionProps, CardContentProps, CardFooterProps } from "./Card/Card";

export { default as Input, Textarea, Select } from "./Input/Input";
export type { InputProps, TextareaProps, SelectProps } from "./Input/Input";

export { default as Container } from "./Container/Container";
export type { ContainerProps } from "./Container/Container";

export { default as Section, SectionHeader } from "./Section/Section";
export type { SectionProps, SectionHeaderProps } from "./Section/Section";

// Design tokens (for advanced usage)
export const designTokens = {
  colors: {
    brand: {
      primary: { DEFAULT: "#0F172A", light: "#1E293B", lighter: "#334155" },
      secondary: { DEFAULT: "#2563EB", light: "#3B82F6", lighter: "#60A5FA", dark: "#1D4ED8", bg: "#EFF6FF" },
      accent: { DEFAULT: "#38BDF8", light: "#7DD3FC", bg: "#F0F9FF" },
      neutral: { bg: "#FFFFFF", bgAlt: "#F8FAFC", surface: "#FFFFFF", surfaceHover: "#F1F5F9", border: "#E2E8F0", borderLight: "#F1F5F9" },
      text: { primary: "#0F172A", secondary: "#334155", tertiary: "#64748B", muted: "#94A3B8", inverse: "#FFFFFF", link: "#2563EB", linkHover: "#1D4ED8" },
      success: { DEFAULT: "#059669", bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46" },
      warning: { DEFAULT: "#D97706", bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" },
      error: { DEFAULT: "#DC2626", bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" },
    },
  },
  borderRadius: { btn: "0.5rem", card: "0.75rem", section: "1rem", pill: "9999px" },
  spacing: { sectionSm: "3rem", sectionMd: "5rem", sectionLg: "7rem", container: "1.5rem" },
  fontSize: {
    displayXl: "clamp(2.5rem, 5vw, 4rem)",
    displayLg: "clamp(2rem, 4vw, 3rem)",
    displayMd: "clamp(1.75rem, 3.5vw, 2.5rem)",
    displaySm: "clamp(1.5rem, 3vw, 2rem)",
    headingXl: "clamp(1.5rem, 2.5vw, 2rem)",
    headingLg: "clamp(1.25rem, 2vw, 1.5rem)",
    headingMd: "clamp(1.125rem, 1.5vw, 1.25rem)",
    headingSm: "1rem",
    bodyLg: "1.125rem",
    bodyMd: "1rem",
    bodySm: "0.875rem",
    caption: "0.8125rem",
    overline: "0.75rem",
  },
  shadows: {
    btn: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    btnHover: "0 4px 12px -2px rgb(37 99 235 / 0.25)",
    card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
    cardHover: "0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.08)",
  },
  transitions: { fast: "150ms", normal: "200ms", slow: "300ms" },
} as const;