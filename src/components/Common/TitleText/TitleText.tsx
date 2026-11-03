import { createElement, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/utils";

type TitleTextVariant = "glass" | "brand" | "hero" | "silver" | "section" | "content" | "admin";
type TitleTextTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";

interface TitleTextProps extends Omit<ComponentPropsWithoutRef<"h2">, "color" | "children" | "tag"> {
  tag?: TitleTextTag;
  variant?: TitleTextVariant;
  children?: ReactNode;
}

const variantClassMap: Record<TitleTextVariant, string> = {
  glass: "title-text-glass",
  brand: "title-text-brand",
  hero: "title-text-glass title-text-glass--hero",
  silver: "title-text-glass title-text-glass--silver",
  section: "title-text-glass title-text-glass--section",
  content: "title-text-content",
  admin: "title-text-admin",
};

export default function TitleText({
  tag: Component = "h2",
  variant = "brand",
  className,
  children,
  ...props
}: TitleTextProps) {
  return createElement(
    Component,
    {
      ...props,
      className: cn(variantClassMap[variant], className),
    },
    children,
  );
}
