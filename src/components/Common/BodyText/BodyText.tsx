import { cn } from "@/utils";
import { PropsWithChildren } from "react";

type TBodyText = PropsWithChildren<{
  className?: string;
  tag?: "p" | "span" | "div";
}>;

const BodyText: React.FC<TBodyText> = ({
  className = "",
  children,
  tag = "p",
}) => {
  const Component = tag;
  return (
    <Component className={cn("-body text-sm text-zinc-300 leading-relaxed", className)}>
      {children}
    </Component>
  );
};
export default BodyText;
