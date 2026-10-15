"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import Container from "@/components/Common/Container/Container";
import type { BlogItem } from "./components";
import { BlogCard } from "./components";
import {
  getPublishedBlogPostsAction,
  type BlogCategoryCount,
} from "@/app/_actions/blog-actions";

// ── Props ─────────────────────────────────────────────────────────────────────
interface BlogPageClientProps {
  /** Server'da (ISR) önceden çekilmiş ilk sayfa verisi — sıfır client DB çağrısı */
  Blogs: BlogItem[];
  /** DB'deki page_meta kaydından gelen sayfa başlığı ve açıklaması */
  pageTitle?: string;
  pageDescription?: string;
  /** Server'dan gelen "sonraki sayfa var mı" bilgisi */
  hasMoreInitial?: boolean;
  /** İlk sunucu isteğinde blog yazıları yüklenemedi */
  initialLoadError?: boolean;
  /** Server'da (ISR) türetilmiş kategori listesi (yazı etiketleri) */
  categories?: BlogCategoryCount[];
}

/** DB satırını liste kartı verisine çevirir (page.tsx ile aynı eşleme). */
function mapPostToBlogItem(post: {
  id: string;
  title: string;
  description: string;
  slug: string;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  authorName?: string | null;
  authorAvatar?: string | null;
  coverImageURL?: string | null;
  coverImageAlt?: string | null;
  tags?: string[];
}): BlogItem {
  return {
    _id: post.id,
    title: post.title,
    description: post.description,
    date: new Date(post.publishedAt ?? post.createdAt).toISOString(),
    slug: post.slug
      ? `/blog/${post.slug.replace(/^\/+/, "").replace(/^blog\//i, "")}`
      : "/blog",
    source: "firestore",
    authorName: post.authorName ?? undefined,
    authorPhotoURL: post.authorAvatar ?? undefined,
    coverImageURL: post.coverImageURL ?? null,
    coverImageAlt: post.coverImageAlt ?? null,
    tags: post.tags ?? [],
  };
}

/** Boş liste durumu — animasyonlu "henüz gönderi yok" kartı. */
const EmptyState = ({ isInView }: { isInView: boolean }) => {
  const t = useTranslations("Blog");

  return (
    <motion.div
      className="relative bg-glass-card border border-edge rounded-2xl py-20 px-8 text-center overflow-hidden"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(167,139,250,0.04) 0%, transparent 70%)",
        }}
      />
      <motion.div
        className="relative mx-auto mb-6 w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #a78bfa10, #22d3ee08)",
          border: "1px solid rgba(167,139,250,0.15)",
        }}
        animate={{
          boxShadow: [
            "0 0 0px rgba(167,139,250,0)",
            "0 0 30px rgba(167,139,250,0.12)",
            "0 0 0px rgba(167,139,250,0)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <PenLine className="w-7 h-7 text-neon" />
        </motion.div>
        <motion.div
          className="absolute w-full h-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: "linear-gradient(135deg, #22d3ee, #a78bfa)",
              boxShadow: "0 0 6px rgba(34,211,238,0.5)",
              top: -4,
              left: "50%",
              marginLeft: -3,
            }}
          />
        </motion.div>
      </motion.div>
      <h3 className="font-display text-xl font-bold text-zinc-300 mb-2">
        {t("noPostsTitle")}
      </h3>
      <p className="font-body text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
        {t("noPostsBody")}
      </p>
      <motion.div
        className="mt-8 mx-auto h-[1px] max-w-[120px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, #a78bfa40, transparent)",
        }}
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 1, delay: 0.6 }}
      />
    </motion.div>
  );
};

const BlogPageClient = ({
  Blogs,
  hasMoreInitial = false,
  initialLoadError = false,
}: BlogPageClientProps) => {
  const gridRef = useRef(null);
  const isInView = useInView(gridRef, { amount: 0.1, once: true });
  const [clientLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(hasMoreInitial);
  const [blogs, setBlogs] = useState<BlogItem[]>(Blogs);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const t = useTranslations("Blog");

  useEffect(() => {
    setIsAuthenticated(document.cookie.includes("xipsoft_logged_in=1"));
  }, []);

  async function loadMore() {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const result = await getPublishedBlogPostsAction(10, blogs.length);
      setBlogs((current) => [
        ...current,
        ...result.data.map(mapPostToBlogItem),
      ]);
      setHasMore(result.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }

  const showLoading = clientLoading && blogs.length === 0;
  const [featured, ...rest] = blogs;

  return (
    <div className="relative min-h-[60vh]">
      <header className="relative">
        <Container withPadding>
          <div className="pt-10 pb-8 md:pt-14 md:pb-10">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-ink mb-3">
              {t("title")}
            </h1>
            <p className="text-ink-muted max-w-xl leading-relaxed">
              {t("subtitle")}
            </p>
            {isAuthenticated && (
              <div className="mt-5">
                <Link
                  href="/blog/write"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-ink-secondary hover:text-neon-fg border border-edge bg-glass-card backdrop-blur-md transition-colors"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  {t("writeBlog")}
                </Link>
              </div>
            )}
          </div>
        </Container>
      </header>

      <section
        ref={gridRef}
        className="relative z-10 pb-20"
        aria-label="Blog yazıları listesi"
      >
        <Container withPadding>
          {showLoading ? (
            <motion.div
              className="flex items-center justify-center py-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-5 h-5 border border-neon/20 border-t-neon rounded-full animate-spin" />
                <span className="text-[11px] text-ink-dim font-mono uppercase tracking-widest">
                  Yükleniyor...
                </span>
              </div>
            </motion.div>
          ) : initialLoadError && blogs.length === 0 ? (
            <div className="rounded-2xl border border-neon/30 bg-neon/5 p-6 text-ink-secondary">
              <p className="text-lg font-semibold text-ink mb-2">
                Blog verisi geçici olarak kullanılamıyor.
              </p>
              <p className="text-sm text-ink-muted">
                Vercel ortamında veritabanı bağlantısı tanımlanmamış. Bu sayfa
                için gerekli ortam değişkenleri ekledikten sonra site otomatik
                olarak blog içeriklerini yükleyecektir.
              </p>
            </div>
          ) : blogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <BlogCard
                Blog={featured}
                index={0}
                isInView={isInView}
                isFeatured={blogs.length > 1}
              />
              {rest.map((blog, i) => (
                <BlogCard
                  key={blog._id}
                  Blog={blog}
                  index={i + 1}
                  isInView={isInView}
                />
              ))}
            </div>
          ) : (
            <EmptyState isInView={isInView} />
          )}

          {hasMore && (
            <motion.div
              className="flex justify-center mt-12"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.4 }}
            >
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm text-ink-muted hover:text-neon-fg border border-edge bg-glass-card transition-all backdrop-blur-md hover:border-edge-neon disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <>
                    <div className="w-4 h-4 border border-neon/20 border-t-neon rounded-full animate-spin" />
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    Daha Fazla
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </Container>
      </section>
    </div>
  );
};

export default BlogPageClient;
