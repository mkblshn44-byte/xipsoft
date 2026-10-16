"use client";

import { cn } from "@/utils";
import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Calendar, Clock3, Eye } from "lucide-react";
import type { BlogItem } from "./types";

/** Normal kartlarda sırayla dönen vurgu tonları (mor / cyan). */
const ACCENTS = ["#22d3ee", "#a78bfa", "#22d3ee", "#a78bfa"];

function normalizeBlogHrefValue(value?: string) {
  const raw = (value ?? "").trim();
  if (!raw) return "/blog";
  const normalized = raw.replace(/^\/+/, "").replace(/^blog\//i, "");
  return `/blog/${normalized}`;
}

function isConfiguredRemoteDomain(url?: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return (
      host === "res.cloudinary.com" ||
      host.endsWith("xipsoft.net") ||
      url.startsWith("/")
    );
  } catch {
    return false;
  }
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
  const accent = isFeatured ? "#a78bfa" : ACCENTS[index % ACCENTS.length];

  const formattedDate = Blog.date
    ? new Date(Blog.date).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const readTime = Math.max(
    1,
    Math.ceil((Blog.description?.length ?? 80) / 200)
  );

  const coverImg = Blog.coverImage || Blog.coverImageURL;
  const categoryTag = Blog.category || (Blog.tags && Blog.tags.length > 0 ? Blog.tags[0] : undefined);

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
          {/* Üst Vurgu Çizgisi */}
          <div
            className="h-[2px] w-full"
            style={{
              background: `linear-gradient(90deg, ${accent}50, ${accent}20, transparent 80%)`,
            }}
          />

          {/* Kapak Görseli Alanı (Görseldeki Tasarıma Uygun) */}
          {coverImg && (
            <div className="relative w-full h-48 md:h-64 overflow-hidden border-b border-white/[0.06] bg-slate-900/50">
              <Image
                src={coverImg}
                alt={Blog.title || ""}
                fill
                unoptimized={!isConfiguredRemoteDomain(coverImg)}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority={isFeatured}
                sizes="(max-width: 768px) 100vw, 600px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-transparent to-transparent opacity-80" />
            </div>
          )}

          {/* İçerik Alanı */}
          <div
            className={cn(
              "relative z-10 flex flex-col h-full bg-[#050811]/60 backdrop-blur-md",
              isFeatured ? "p-7 md:p-8" : "p-5 md:p-6"
            )}
          >
            {/* Meta Etiketleri Satırı (Tarih, Kategori, Okuma, Görüntülenme) */}
            <div className="flex items-center flex-wrap gap-2 mb-4">
              {formattedDate && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
                  <Calendar className="w-3 h-3" style={{ color: accent }} />
                  {formattedDate}
                </span>
              )}

              {categoryTag && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-300 bg-white/[0.06] px-2.5 py-1 rounded-full border border-white/[0.08]">
                  #{categoryTag}
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
                <Clock3 className="w-3 h-3 text-zinc-400" />
                {readTime} dk. Okuma
              </span>

              {typeof Blog.views === "number" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
                  <Eye className="w-3 h-3 text-zinc-400" />
                  {Blog.views.toLocaleString("tr-TR")} Görüntülenme
                </span>
              )}
            </div>

            {/* Başlık */}
            <h2
              className={cn(
                "font-display font-bold tracking-tight text-zinc-100 mb-3",
                "group-hover:text-white transition-colors duration-300",
                isFeatured ? "text-xl md:text-2xl" : "text-lg"
              )}
            >
              {Blog.title}
            </h2>

            {/* Açıklama */}
            {Blog.description && (
              <p
                className={cn(
                  "font-body text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors duration-500",
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

            {/* Alt Bilgi & Yazar / Okuma Butonu */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {Blog.authorPhotoURL ? (
                  <Image
                    src={Blog.authorPhotoURL}
                    alt={Blog.authorName ?? ""}
                    width={22}
                    height={22}
                    unoptimized
                    className="w-[22px] h-[22px] rounded-full object-cover ring-1 ring-white/[0.08]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold uppercase ring-1 ring-white/[0.08]"
                    style={{
                      background: `${accent}15`,
                      color: `${accent}cc`,
                    }}
                  >
                    {(Blog.authorName ?? Blog.source ?? "M").charAt(0)}
                  </span>
                )}

                {Blog.authorName && (
                  <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[120px]">
                    {Blog.authorName}
                  </span>
                )}
              </div>

              <div
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{
                  background: `${accent}15`,
                  border: `1px solid ${accent}30`,
                }}
              >
                <ArrowUpRight
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
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
