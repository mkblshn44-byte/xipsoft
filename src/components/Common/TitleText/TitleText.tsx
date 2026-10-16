import { cn } from "@/utils";
import { CSSProperties, MouseEvent, PropsWithChildren } from "react";

type TitleVariant = "glass" | "section" | "hero" | "silver" | "admin" | "content";

type TTitleText = PropsWithChildren<{
  className?: string;
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "div" | "p";
  isBold?: boolean;
  onClick?: (event: MouseEvent) => void;
  variant?: TitleVariant;
  style?: CSSProperties;
}>;

const variantClasses: Record<TitleVariant, string> = {
  glass:   "title-text-glass title-text-glass--prism",
  section: "title-text-glass title-text-glass--section",
  hero:    "title-text-glass title-text-glass--hero",
  silver:  "title-text-glass title-text-glass--silver",
  admin:   "title-text-admin",
  content: "title-text-content",
};

const sizeClasses: Record<TitleVariant, string> = {
  glass:   "text-xl sm:text-2xl",
  section: "text-2xl sm:text-3xl lg:text-4xl",
  hero:    "text-3xl sm:text-4xl lg:text-5xl xl:text-6xl",
  silver:  "text-3xl sm:text-4xl lg:text-5xl",
  admin:   "text-2xl",
  content: "text-2xl",
};

const TitleText: React.FC<TTitleText> = ({
  className = "",
  children,
  tag = "h1",
  isBold = false,
  onClick,
  variant = "glass",
  style,
}) => {
  const Component = tag;

  return (
    <Component
      className={cn(
        variantClasses[variant],
        "leading-tight text-balance",
        sizeClasses[variant],
        isBold ? "font-bold" : "font-semibold",
        className,
      )}
      onClick={onClick}
      style={style}
    >
      {children}
    </Component>
  );
};

export default TitleText;
