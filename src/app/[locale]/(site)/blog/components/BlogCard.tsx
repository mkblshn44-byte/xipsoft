"use client";

import { cn } from "@/utils";
import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  Calendar,
  Clock3,
  Database,
  FileCodeCorner,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { BlogItem } from "./types";

/** Normal kartlarda sırayla dönen vurgu tonları (mor / cyan). */
const ACCENTS = ["#22d3ee", "#a78bfa", "#22d3ee", "#a78bfa"];

function normalizeBlogHrefValue(value?: string) {
  const raw = (value ?? "").trim();
  if (!raw) return "/blog";
  const normalized = raw.replace(/^\/+/, "").replace(/^blog\//i, "");
  return `/blog/${normalized}`;
}

export const BlogCard = ({
  Blog,
  index,
  isInView,
  isFeatured = false,
}: {
  Blog: BlogItem;
  index: number;
  isInView: boolean;
  isFeatured?: boolean;
}) => {
  const t = useTranslations("Blog");
  const accent = isFeatured ? "#a78bfa" : ACCENTS[index % ACCENTS.length];

  const formattedDate = Blog.date
    ? new Date(Blog.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const readTime = Math.max(
    1,
    Math.ceil((Blog.description?.length ?? 80) / 200)
  );

  const SourceIcon = Blog.source === "firestore" ? Database : FileCodeCorner;

  return (
    <motion.div
      className={cn(isFeatured && "md:col-span-2 lg:col-span-2")}
      initial={{ opacity: 0, y: 30, scale: 0.97, filter: "blur(4px)" }}
      animate={
        isInView
          ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
          : { opacity: 0, y: 30, scale: 0.97, filter: "blur(4px)" }
      }
      transition={{
        duration: 0.6,
        delay: 0.2 + index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        href={normalizeBlogHrefValue(Blog.slug)}
        className="block group h-full"
      >
        <div
          className={cn(
            "relative h-full rounded-2xl overflow-hidden",
            "card",
            "border border-white/[0.06]",
            "transition-all duration-500 ease-out",
            "hover:-translate-y-1.5 hover:border-white/[0.12]",
            "hover:shadow-[0_8px_40px_rgba(167,139,250,0.14),0_4px_16px_rgba(5,8,17,0.3)]"
          )}
        >
          {/* Üst vurgu çizgisi */}
          <div
            className="h-[2px] w-full"
            style={{
              background: `linear-gradient(90deg, ${accent}50, ${accent}20, transparent 80%)`,
            }}
          />

          {/* Sağ taraf ışıması */}
          <div
            className="absolute top-0 right-0 bottom-0 w-[140px] pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `linear-gradient(270deg, ${accent}08 0%, ${accent}04 40%, transparent 100%)`,
            }}
          />

          {/* Sol alt ışıması */}
          <div
            className="absolute bottom-0 left-0 w-[100px] h-[80px] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(ellipse at 0% 100%, ${accent}08 0%, transparent 70%)`,
            }}
          />

          {/* Hover vurgu halkası */}
          <div
            className="absolute -top-12 -right-12 w-32 h-32 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-700 rounded-full"
            style={{
              background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
            }}
          />

          {/* İçerik */}
          <div
            className={cn(
              "relative z-10 flex flex-col h-full",
              isFeatured ? "p-7 md:p-8" : "p-5 md:p-6"
            )}
          >
            {/* Meta satırı */}
            <div className="flex items-center flex-wrap gap-2.5 mb-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                <Calendar className="w-3 h-3" style={{ color: accent }} />
                {formattedDate}
              </span>

              <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />

              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-600">
                <Clock3 className="w-2.5 h-2.5" />
                {readTime} min
              </span>

              <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />

              <span
                className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md border"
                style={{
                  color: `${accent}90`,
                  background: `${accent}06`,
                  borderColor: `${accent}15`,
                }}
              >
                <SourceIcon className="w-2.5 h-2.5" />
                {Blog.source === "firestore" ? "Community" : "MDX"}
              </span>

              {isFeatured && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
                  style={{
                    background: `${accent}10`,
                    border: `1px solid ${accent}25`,
                    color: accent,
                  }}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  Latest
                </span>
              )}
            </div>

            <h2
              className={cn(
                "font-display font-bold tracking-tight text-zinc-100 mb-3",
                "group-hover:text-white transition-colors duration-300",
                isFeatured ? "text-xl md:text-2xl" : "text-base"
              )}
            >
              {Blog.title}
            </h2>

            {Blog.description && (
              <p
                className={cn(
                  "font-body text-sm text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors duration-500",
                  isFeatured ? "line-clamp-3 mb-6" : "line-clamp-2 mb-4"
                )}
              >
                {Blog.description}
              </p>
            )}

            <div
              className="h-px w-full mb-4 mt-auto"
              style={{
                background: `linear-gradient(90deg, ${accent}10, rgba(255,255,255,0.03), transparent)`,
              }}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {Blog.authorPhotoURL ? (
                  <Image
                    src={Blog.authorPhotoURL}
                    alt={Blog.authorName ?? ""}
                    width={20}
                    height={20}
                    unoptimized
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-white/[0.08]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold uppercase ring-1 ring-white/[0.08]"
                    style={{
                      background: `${accent}15`,
                      color: `${accent}cc`,
                    }}
                  >
                    {(Blog.authorName ?? Blog.source ?? "M").charAt(0)}
                  </span>
                )}

                {Blog.authorName && (
                  <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[100px]">
                    {Blog.authorName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span
                  className="font-mono text-xs transition-colors duration-300"
                  style={{ color: `${accent}90` }}
                >
                  <span className="">{t("readArticle")}</span>
                </span>
                <ArrowUpRight
                  className="w-3.5 h-3.5 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  style={{ color: accent }}
                />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default BlogCard;
