"use client";

import { useState, useEffect, useCallback, useContext } from "react";
import { cn } from "@/utils";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  PenLine,
  Trash2,
  CheckCircle,
  Clock,
  Plus,
  ChevronRight,
  CalendarDays,
  LogIn,
} from "lucide-react";
import MseLink from "@/components/Ui/MseLink/MseLink";
import { getUserBlogPostsAction, deleteBlogPostAction } from "@/app/_actions/blog-actions";
import type { BlogPost } from "@/types/blog";
import { useTranslations } from "next-intl";
import TitleText from "@/components/Common/TitleText/TitleText";
import { AuthContext } from "@/context/AuthContext";

function PostsList() {
  const { user } = useContext(AuthContext) ?? { user: null };
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const t = useTranslations("Blog");
  const mm = "";

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const result = await getUserBlogPostsAction();
        if (cancelled) return;
        setPosts(result.data);
        setOffset(result.nextOffset);
        setHasMore(result.hasMore);
      } catch (err) {
        console.error("Failed to load posts:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !user) return;
    setLoadingMore(true);
    try {
      const result = await getUserBlogPostsAction(6, offset);
      setPosts((prev) => [...prev, ...result.data]);
      setOffset(result.nextOffset);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this Blog? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteBlogPostAction(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // handled
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: "#a78bfa", borderRightColor: "#ddd6fe" }}
          />
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: [0.22, 1, 0.36, 1] }}
        className="text-center py-24"
      >
        <div
          className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/[0.06]"
          style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.08), rgba(34,211,238,0.08))" }}
        >
          <FileText className="w-7 h-7 text-zinc-500" />
        </div>
        <p className={cn("text-zinc-400 text-sm mb-6", mm)}>{t("noPostsTitle")}</p>
        <MseLink
          href="/blog/write"
          className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-colors duration-300 overflow-hidden"
        >
          <span
            className="absolute inset-0 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              padding: "1.5px",
              background: "linear-gradient(135deg, #ddd6fe, #a78bfa, #a78bfa)",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />
          <span
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(167,139,250,0.06), rgba(251,113,133,0.06))" }}
          />
          <Plus className="relative z-10 w-4 h-4" />
          <span className={cn("relative z-10", mm)}>{t("writeBlog")}</span>
        </MseLink>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Post count label */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] -mono uppercase tracking-widest text-zinc-600">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-white/[0.04] to-transparent" />
      </div>

      <div className="space-y-2.5">
        <AnimatePresence>
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
              transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "group relative flex items-stretch rounded-2xl overflow-hidden",
                "bg-white/[0.015] border border-white/[0.05]",
                "hover:bg-white/[0.035] hover:border-white/[0.1]",
                "transition-all duration-300"
              )}
            >
              {/* Left accent bar */}
              <div
                className="w-[3px] shrink-0"
                style={{
                  background: post.status === "published"
                    ? "linear-gradient(to bottom, #ddd6fe, #ddd6fe)"
                    : "linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                }}
              />

              {/* Card content */}
              <div className="flex items-center gap-4 p-4 flex-1 min-w-0">
                {/* Status icon with ring */}
                <div
                  className={cn(
                    "relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    "border transition-colors duration-300",
                    post.status === "published"
                      ? "bg-accent-cyan/[0.06] border-accent-cyan/15 group-hover:border-accent-cyan/25"
                      : "bg-white/[0.03] border-white/[0.06] group-hover:border-white/[0.1]"
                  )}
                >
                  {post.status === "published" ? (
                    <CheckCircle className="w-4.5 h-4.5 text-accent-cyan" />
                  ) : (
                    <Clock className="w-4.5 h-4.5 text-zinc-500" />
                  )}
                </div>

                {/* Post info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors duration-300">
                    {post.title || "Untitled"}
                  </h3>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    {/* Status badge */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] -mono uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                        post.status === "published"
                          ? "text-accent-cyan/80 bg-accent-cyan/[0.08] border border-accent-cyan/10"
                          : "text-zinc-500 bg-white/[0.03] border border-white/[0.04]"
                      )}
                    >
                      <span className={cn(
                        "w-1 h-1 rounded-full",
                        post.status === "published" ? "bg-accent-cyan" : "bg-zinc-600"
                      )} />
                      {post.status === "published" ? t("publish") : t("saveDraft")}
                    </span>

                    {/* Separator dot */}
                    <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />

                    {/* Date with micro icon */}
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600 -mono">
                      <CalendarDays className="w-2.5 h-2.5" />
                      {post.updatedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-30 group-hover:opacity-100 transition-opacity duration-300">
                  <MseLink
                    href={`/blog/edit?id=${post.id}`}
                    className="p-2 rounded-xl text-zinc-400 hover:text-prism-cyan hover:bg-prism-cyan/[0.08] transition-all duration-200"
                  >
                    <PenLine className="w-4 h-4" />
                  </MseLink>
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    disabled={deleting === post.id}
                    className="p-2 rounded-xl text-zinc-400 hover:text-prism-rose hover:bg-prism-rose/[0.08] transition-all duration-200 disabled:opacity-30"
                  >
                    {deleting === post.id ? (
                      <div className="w-4 h-4 border-2 border-prism-rose/30 border-t-prism-rose rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                  <MseLink
                    href={`/blog/edit?id=${post.id}`}
                    className="p-1.5 rounded-xl text-zinc-600 group-hover:text-zinc-400 transition-colors duration-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </MseLink>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center mt-10">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={cn(
              "inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full text-sm font-medium",
              "bg-white/[0.03] border border-white/[0.06]",
              "text-zinc-400 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.06]",
              "transition-all duration-300",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {loadingMore ? (
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
            ) : (
              <span className="-mono text-xs uppercase tracking-wider">{t("loadMore") || "Load more"}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MyPostsClient() {
  const t = useTranslations("Blog");
  const mm = "";
  const { isAuthenticated, loading: authLoading } = useContext(AuthContext) ?? { isAuthenticated: false, loading: false };

  // Giriş yapılmamışsa yönlendir
  if (authLoading) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-prism-violet/30 border-t-prism-violet rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center gap-6 text-center px-5">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/[0.06]"
          style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(34,211,238,0.12))" }}>
          <LogIn className="w-6 h-6 text-prism-cyan" />
        </div>
        <div>
          <p className="text-white font-semibold mb-1">Giriş yapmanız gerekiyor</p>
          <p className="text-zinc-500 text-sm">Bloglarınızı görmek için hesabınıza giriş yapın.</p>
        </div>
        <MseLink
          href="/login?redirect=/blog/my-posts"
          className="px-6 py-3 rounded-xl bg-prism-violet text-white text-sm font-medium hover:bg-prism-violet/90 transition-colors"
        >
          Giriş Yap
        </MseLink>
      </div>
    );
  }

  return (
    <div>
      <div className="min-h-screen bg-obsidian pt-24 pb-20 px-5 relative">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.05] blur-[120px]"
            style={{
              background:
                "radial-gradient(ellipse, #a78bfa 0%, #ddd6fe 40%, transparent 70%)",
            }}
          />
        </div>

        <div className="max-w-2xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-between mb-10"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.06]"
                style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(34,211,238,0.12))" }}
              >
                <FileText className="w-5 h-5 text-prism-cyan" />
              </div>
              <div>
                <TitleText tag="h1" variant="glass" className={cn("text-white", mm)}>
                  {t("myBlogs")}
                </TitleText>
              </div>
            </div>

            <MseLink
              href="/blog/write"
              className="group relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-colors duration-300 overflow-hidden"
            >
              <span
                className="absolute inset-0 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  padding: "1.5px",
                  background: "linear-gradient(135deg, #ddd6fe, #a78bfa, #a78bfa)",
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />
              <span
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(167,139,250,0.06), rgba(251,113,133,0.06))" }}
              />
              <Plus className="relative z-10 w-4 h-4" />
              <span className={cn("relative z-10", mm)}>{t("newBlog")}</span>
            </MseLink>
          </motion.div>

          <PostsList />
        </div>
      </div>
    </div>
  );
}
