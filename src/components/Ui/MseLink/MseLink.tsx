import { cn } from "@/utils";
import Link from "next/link";
import { PropsWithChildren } from "react";
import React from "react";

type TMesLink = React.AnchorHTMLAttributes<HTMLAnchorElement> & PropsWithChildren<{
  href: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}>;

const MseLink: React.FC<TMesLink> = ({ children, href, className, style, onClick, ...rest }) => {
  return (
    <Link href={href} className={cn(className)} style={style} prefetch={false} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
};
export default MseLink;
