import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/utils";
import XipIcon from "@/components/Ui/Icon";

interface GlassServiceCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href?: string;
  accentColor?: string;
  eyebrow?: string;
  badge?: string;
  features?: string[];
  tags?: string[];
  footer?: ReactNode;
  className?: string;
}

export default function GlassServiceCard({
  title,
  description,
  icon,
  href,
  accentColor = "#a78bfa",
  eyebrow,
  badge,
  features,
  tags,
  footer,
  className,
}: GlassServiceCardProps) {
  return (
    <article
      className={cn(
        "group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.10] bg-gradient-to-br from-white/[0.06] via-slate-950/80 to-slate-950/95 p-6 sm:p-7 transition-all duration-500 hover:-translate-y-1 hover:border-white/[0.20]",
        className
      )}
      style={{
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 36px rgba(5, 8, 17,0.22), 0 0 40px ${accentColor}0d`,
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-50 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accentColor}20, transparent 62%)`,
        }}
      />

      {(eyebrow || badge) && (
        <div className="mb-5 flex min-h-6 items-center justify-between gap-3">
          {eyebrow ? (
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500">
              {eyebrow}
            </span>
          ) : <span />}
          {badge && (
            <span
              className="rounded-full border px-2.5 py-1 text-[10px] font-semibold"
              style={{
                color: accentColor,
                borderColor: `${accentColor}40`,
                background: `${accentColor}12`,
              }}
            >
              {badge}
            </span>
          )}
        </div>
      )}

      <div className="mb-5 flex justify-center">
        <div
          className="icon-backlight flex h-20 w-20 items-center justify-center rounded-2xl border transition-all duration-500 group-hover:scale-105 sm:h-24 sm:w-24"
          style={{
            background: `linear-gradient(135deg, ${accentColor}28, ${accentColor}08)`,
            borderColor: `${accentColor}45`,
            boxShadow: `0 0 30px ${accentColor}18`,
          }}
        >
          {icon}
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-base font-extrabold uppercase tracking-wide text-white transition-colors group-hover:text-violet-100 sm:text-lg">
          {href ? (
            <Link href={href} className="focus-visible:outline-none focus-visible:underline">
              {title}
            </Link>
          ) : title}
        </h3>
        {description && <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>}
      </div>

      {features && features.length > 0 && (
        <ul className="mt-6 space-y-2.5 border-t border-white/[0.07] pt-5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-300">
              <span
                aria-hidden="true"
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}80` }}
              />
              {feature}
            </li>
          ))}
        </ul>
      )}

      {tags && tags.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex justify-center pt-6">
        {footer ?? (href && (
          <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            style={{
              borderColor: `${accentColor}99`,
              color: accentColor,
              boxShadow: `0 0 20px ${accentColor}30`,
            }}
          >
            Keşfet <XipIcon name="arrow-right" className="h-3.5 w-3.5" glow="none" />
          </Link>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-8 right-8 h-px opacity-50 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}90, transparent)` }}
      />
    </article>
  );
}
