"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import XipIcon from "@/components/Ui/Icon";
import { getRelatedBlogPostsAction } from "@/app/_actions/blog-actions";
import type { BlogPost } from "@/types/blog";
import LazyImage from "@/components/LazyImage";
import { cn } from "@/utils";
import MseLink from "@/components/Ui/MseLink/MseLink";

interface RelatedPostsProps {
  currentSlug: string;
  tags?: string[];
  limit?: number;
  className?: string;
  initialPosts?: BlogPost[];
}

export default function RelatedPosts({
  currentSlug,
  tags = [],
  limit = 3,
  className,
  initialPosts,
}: RelatedPostsProps) {
  const [posts, setPosts] = useState<BlogPost[]>(() => initialPosts || []);
  const [loading, setLoading] = useState(() => !initialPosts || initialPosts.length === 0);

  useEffect(() => {
    if (initialPosts && initialPosts.length > 0) {
      setPosts(initialPosts.slice(0, limit));
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getRelatedBlogPostsAction(currentSlug, tags);
        if (!cancelled) setPosts(data.slice(0, limit));
      } catch {
        /* noop */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentSlug, tags, limit, initialPosts]);

  if (!loading && posts.length === 0) return null;

  return (
    <section
      className={cn(
        "relative mt-16 pt-12 pb-4 border-t border-white/[0.06]",
        className
      )}
    >
      {/* SEO İç Bağlantı Bloğu — Doğal Başlık / Anahtar Kelime Anchor Metinleri */}
      {posts.length > 0 && (
        <aside className="mb-10 p-6 bg-slate-900/60 rounded-xl border border-slate-800/80 backdrop-blur-sm">
          <h3 className="text-lg md:text-xl font-semibold mb-3 text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            İlgili Rehberler ve Teknik Analizler
          </h3>
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.slug} className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 select-none">›</span>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium underline underline-offset-4 leading-relaxed"
                >
                  {post.title} hakkında detaylı bilgiye göz atabilirsin.
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-px w-10 bg-gradient-to-r from-prism-cyan to-transparent" />
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-prism-cyan">
              İlgili Yazılar
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight brand-gradient-text">
            Devamını okuyun
          </h2>
        </div>
        <MseLink
          href="/blog"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-prism-cyan transition-colors"
        >
          Tüm Yazılar <XipIcon name="arrow-right" glow="soft" className="w-3.5 h-3.5" />
        </MseLink>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading
          ? Array.from({ length: limit }).map((_, i) => (
              <RelatedSkeleton key={i} />
            ))
          : posts.map((post, i) => (
              <RelatedCard key={post.id} post={post} index={i} />
            ))}
      </div>
    </section>
  );
}

function RelatedSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] overflow-hidden animate-pulse">
      <div className="aspect-[16/9] bg-white/[0.04]" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-3/4 rounded bg-white/[0.05]" />
        <div className="h-3 w-full rounded bg-white/[0.03]" />
        <div className="h-3 w-5/6 rounded bg-white/[0.03]" />
        <div className="pt-2 flex gap-2">
          <div className="h-5 w-14 rounded-full bg-white/[0.04]" />
          <div className="h-5 w-14 rounded-full bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

function RelatedCard({ post, index }: { post: BlogPost; index: number }) {
  const date = post.publishedAt ?? post.createdAt;
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("tr-TR", { month: "short" });
  const year = date.getFullYear();

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group relative rounded-2xl overflow-hidden border border-white/[0.04] bg-white/[0.02] transition-all duration-500 hover:-translate-y-1 hover:border-prism-violet/30"
    >
      <Link
        href={`/blog/${post.slug}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-prism-cyan/50"
        aria-label={post.title}
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-prism-violet/10 via-prism-cyan/5 to-transparent">
          {post.coverImageURL ? (
            <LazyImage
              src={post.coverImageURL}
              urls={(post as any).coverImageUrls}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
              aspectRatio="16/9"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600">
              {post.title.slice(0, 24)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent" />
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[10px] font-mono text-zinc-300">
            <span className="px-2 py-1 rounded-md bg-obsidian/70 backdrop-blur border border-white/[0.06]">
              {day} {month} {year}
            </span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-bold text-sm md:text-[0.95rem] text-zinc-100 group-hover:text-white leading-snug line-clamp-2 mb-2">
            {post.title}
          </h3>
          {post.description && (
            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-4">
              {post.description}
            </p>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.04]"
                >
                  <XipIcon name="tag" glow="none" className="w-2.5 h-2.5 text-prism-violet/70" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.article>
  );
}
