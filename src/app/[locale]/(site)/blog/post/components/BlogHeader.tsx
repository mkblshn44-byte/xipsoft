"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { cn } from "@/utils";
import {
  Calendar,
  ArrowLeft,
  Tag,
  Clock3,
  BookOpen,
  Share2,
  PenLine,
} from "lucide-react";
import MseLink from "@/components/Ui/MseLink/MseLink";
import LazyImage from "@/components/LazyImage";
import type { BlogHeaderProps } from "./types";
import { lexicalStateToHtml } from "@/utils/lexical-to-html";
import { injectInternalLinks } from "@/lib/seo/internal-linking";
import { FeaturedSnippet, extractFeaturedSnippet } from "@/components/seo/FeaturedSnippet";
import { ContentFreshnessBadge } from "@/components/seo/ContentFreshnessBadge";
import { TableOfContents, shouldShowTOC } from "@/components/seo/TableOfContents";

export function BlogHeader({
  post,
  isModerator,
  formattedDate,
  readTime,
  onShare,
}: BlogHeaderProps) {
  const badgeLabel = "Makale";
  const BadgeIcon = BookOpen;
  const backHref = "/blog";
  const backLabel = "Tüm Yazılar";
  const basePath = "/blog";
  const authorLabel = "Yazar";

  const rawHtml = post.content ? lexicalStateToHtml(post.content) : "";
  const contentHtml = injectInternalLinks(rawHtml, { currentSlug: post.slug });
  const contentText = post.content ? JSON.stringify(post.content) : "";
  const showTOC = shouldShowTOC(contentText);

  return (
    <>
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <MseLink
          href={backHref}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-zinc-200 hover:text-white transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.08) 100%)",
            backdropFilter: "blur(18px) saturate(1.6)",
            WebkitBackdropFilter: "blur(18px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider font-mono">{backLabel}</span>
        </MseLink>
        <div className="flex items-center gap-2">
          {isModerator && post && (
            <MseLink
              href={`/blog/edit?id=${post.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider text-neon hover:text-neon-300 bg-neon/10 hover:bg-neon/20 border border-neon/20 transition-all duration-200"
            >
              <PenLine className="w-3 h-3" />
              Düzenle
            </MseLink>
          )}
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-mono uppercase tracking-wider text-zinc-200 hover:text-white transition-all duration-300 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.08) 100%)",
              backdropFilter: "blur(18px) saturate(1.6)",
              WebkitBackdropFilter: "blur(18px) saturate(1.6)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <Share2 className="w-3 h-3" />
            Paylaş
          </button>
        </div>
      </motion.div>

      {/* Cover image */}
      {post.coverImageURL && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl overflow-hidden border border-white/[0.06] relative"
        >
          <LazyImage
            src={post.coverImageURL}
            urls={(post as any).coverImageUrls}
            alt={post.coverImageAlt || post.title}
            className="w-full max-h-[420px] object-cover"
            sizes="(max-width: 480px) 480px, (max-width: 900px) 900px, 1200px"
            priority
            aspectRatio="16/9"
          />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-obsidian/80 to-transparent" />
        </motion.div>
      )}

      {/* Header Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative mb-8 rounded-2xl overflow-hidden bg-white/[0.02] backdrop-blur-md border border-white/[0.08] p-6 md:p-8"
      >
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(167,139,250,0.3), rgba(34,211,238,0.3), transparent)",
          }}
        />

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-medium">
            <BadgeIcon className="w-3.5 h-3.5" />
            {badgeLabel}
          </span>
          <span className="w-1 h-1 rounded-full bg-zinc-600" />
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
            <Calendar className="w-3 h-3 text-zinc-500" />
            {formattedDate}
          </span>
          <span className="w-1 h-1 rounded-full bg-zinc-600" />
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
            <Clock3 className="w-3 h-3 text-zinc-500" />
            {readTime} dk okuma
          </span>
          {/* Content Freshness Badge */}
          <ContentFreshnessBadge
            updatedAt={post.updatedAt}
            createdAt={post.createdAt}
            variant="compact"
            className="ml-auto"
          />
        </div>

        {/* Title — Modern, readable typography */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight leading-snug mb-4 font-sans normal-case">
          {post.title}
        </h1>

        {post.description && (
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed mb-6 font-normal">
            {post.description}
          </p>
        )}

        {/* Featured Snippet Optimization - SEO Enhancement */}
        {post.description && (
          <FeaturedSnippet
            question={post.title}
            answer={extractFeaturedSnippet(post.description)}
            className="mb-6"
          />
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6" role="list" aria-label="Etiketler">
            {post.tags.map((tag) => (
              /* Topical Authority: tag'lar /blog?tag=... sayfasına linklenince
                 Google aynı konudaki yazılar arası ilişkiyi anlar */
              <MseLink
                key={tag}
                href={`${basePath}?tag=${encodeURIComponent(tag)}`}
                role="listitem"
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono",
                  "bg-white/[0.03] border border-white/[0.06] text-zinc-400",
                  "hover:border-neon/30 hover:text-neon-300 transition-colors"
                )}
              >
                <Tag className="w-3 h-3 text-neon/70" />
                {tag}
              </MseLink>
            ))}
          </div>
        )}

        <div className="h-px w-full bg-white/[0.06] mb-5" />

        {/* Author info — E-E-A-T: yazar profil sayfasına link veriliyor */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full p-[1.5px] shrink-0"
            style={{
              background: "linear-gradient(135deg, #ddd6fe, #a78bfa, #a78bfa)",
            }}
          >
            <span className="block w-full h-full rounded-full overflow-hidden bg-zinc-900">
              {post.authorAvatar ? (
                <Image
                  src={post.authorAvatar}
                  alt={post.authorName ?? ""}
                  width={40}
                  height={40}
                  unoptimized
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center bg-neon/20 text-sm font-bold text-neon-300 uppercase">
                  {(post.authorName ?? "X").charAt(0)}
                </span>
              )}
            </span>
          </div>
          <div>
            {/* E-E-A-T: yazar adı /x/[nick] profiline linklenirse Google yazar otoritesini tanır */}
            {post.authorNick ? (
              <MseLink
                href={`/x/${post.authorNick}`}
                className="text-sm font-semibold text-zinc-200 hover:text-neon-300 transition-colors"
                rel="author"
              >
                {post.authorName || "XipSoft Ekibi"}
              </MseLink>
            ) : (
              <p className="text-sm font-semibold text-zinc-200">
                {post.authorName || "XipSoft Ekibi"}
              </p>
            )}
            <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
              {authorLabel}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Content Card — Full article body */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative rounded-2xl overflow-hidden bg-white/[0.015] backdrop-blur-md border border-white/[0.08] p-6 md:p-10 mb-12 shadow-xl"
      >
        {/* Table of Contents for long-form content */}
        {showTOC && (
          <div className="mb-8">
            <TableOfContents content={contentText} className="max-w-xs" />
          </div>
        )}

        {contentHtml ? (
          <div
            className="prose prose-invert prose-zinc max-w-none text-zinc-300 text-base sm:text-lg leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <div className="rounded-xl bg-white/[0.01] border border-white/[0.04] p-8 text-zinc-400 text-sm text-center">
            İçerik yükleniyor veya bulunamadı.
          </div>
        )}
      </motion.div>
    </>
  );
}
