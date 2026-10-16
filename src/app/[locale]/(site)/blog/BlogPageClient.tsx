"use client";

import { motion, useInView } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Search, Tag, X, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Container from "@/components/Common/Container/Container";
import Link from "next/link";
import type { BlogItem } from "./components/types";
import { BlogCard } from "./components/BlogCard";
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
    coverImage: post.coverImageURL ?? null,
    coverImageURL: post.coverImageURL ?? null,
    coverImageAlt: post.coverImageAlt ?? null,
    category: post.tags?.[0] ?? undefined,
    views: (post as any).viewCount ?? (post as any).views ?? 0,
    tags: post.tags ?? [],
  };
}

/** Boş liste durumu — animasyonlu "henüz gönderi yok" kartı. */
const EmptyState = ({
  isInView,
  hasFilter = false,
  onResetFilter,
}: {
  isInView: boolean;
  hasFilter?: boolean;
  onResetFilter?: () => void;
}) => {
  const t = useTranslations("Blog");

  return (
    <motion.div
      className="relative bg-glass-card border border-edge rounded-2xl py-16 px-8 text-center overflow-hidden"
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
        <BookOpen className="w-7 h-7 text-neon" />
      </motion.div>
      <h3 className="font-display text-xl font-bold text-zinc-300 mb-2">
        {hasFilter ? "Sonuç Bulunamadı" : t("noPostsTitle")}
      </h3>
      <p className="font-body text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed mb-6">
        {hasFilter
          ? "Arama kriterlerinize veya seçili kategoriye uygun blog yazısı bulunamadı."
          : t("noPostsBody")}
      </p>
      {hasFilter && onResetFilter && (
        <button
          type="button"
          onClick={onResetFilter}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-mono uppercase tracking-wider text-cyan-300 bg-cyan-950/40 border border-cyan-800/50 hover:bg-cyan-900/40 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Filtreleri Sıfırla
        </button>
      )}
    </motion.div>
  );
};

const BlogPageClient = ({
  Blogs,
  pageTitle,
  pageDescription,
  hasMoreInitial = false,
  initialLoadError = false,
  categories = [],
}: BlogPageClientProps) => {
  const gridRef = useRef(null);
  const isInView = useInView(gridRef, { amount: 0.1, once: true });
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(hasMoreInitial);
  const [blogs, setBlogs] = useState<BlogItem[]>(Blogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const t = useTranslations("Blog");

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

  // Arama ve kategori filtreleme
  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (blog.title?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ?? false) ||
        (blog.description?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ?? false);

      const matchesCategory =
        !selectedCategory ||
        (blog.tags?.some(
          (tag) => tag.toLowerCase() === selectedCategory.toLowerCase()
        ) ?? false);

      return matchesSearch && matchesCategory;
    });
  }, [blogs, searchQuery, selectedCategory]);

  const hasActiveFilter = Boolean(searchQuery.trim() || selectedCategory);

  const handleResetFilter = () => {
    setSearchQuery("");
    setSelectedCategory(null);
  };

  const [featured, ...rest] = filteredBlogs;

  return (
    <div className="relative min-h-[60vh]">
      {/* Header */}
      <header className="relative">
        <Container withPadding>
          <div className="pt-10 pb-8 md:pt-14 md:pb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 mb-4">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{t("label")}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-3">
              {pageTitle || t("title")}
            </h1>
            <p className="text-zinc-400 max-w-2xl leading-relaxed text-sm md:text-base">
              {pageDescription || t("subtitle")}
            </p>
          </div>
        </Container>
      </header>

      {/* Main Content Area */}
      <section
        ref={gridRef}
        className="relative z-10 pb-20"
        aria-label="Blog yazıları listesi"
      >
        <Container withPadding>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sol: Blog Kartları */}
            <div className="lg:col-span-8 xl:col-span-9">
              {/* Aktif Filtre Bilgisi */}
              {hasActiveFilter && (
                <div className="flex items-center justify-between gap-3 mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-300">
                    <span className="text-zinc-500 font-mono">Filtreler:</span>
                    {selectedCategory && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-violet-950/50 border border-violet-800/50 text-violet-300 font-mono">
                        <Tag className="w-3 h-3" />
                        {selectedCategory}
                        <button
                          type="button"
                          onClick={() => setSelectedCategory(null)}
                          className="ml-1 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {searchQuery.trim() && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-950/50 border border-cyan-800/50 text-cyan-300 font-mono">
                        <Search className="w-3 h-3" />
                        &ldquo;{searchQuery}&rdquo;
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="ml-1 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    <span className="text-zinc-500 font-mono">
                      ({filteredBlogs.length} yazı)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    className="text-xs font-mono text-zinc-400 hover:text-white underline underline-offset-4"
                  >
                    Temizle
                  </button>
                </div>
              )}

              {/* Hata Durumu */}
              {initialLoadError && blogs.length === 0 ? (
                <div className="rounded-2xl border border-neon/30 bg-neon/5 p-6 text-zinc-300">
                  <p className="text-lg font-semibold text-white mb-2">
                    Blog verisi geçici olarak kullanılamıyor.
                  </p>
                  <p className="text-sm text-zinc-400">
                    Veritabanı bağlantısı sağlanamadı. Lütfen daha sonra tekrar deneyin.
                  </p>
                </div>
              ) : filteredBlogs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {!hasActiveFilter && featured ? (
                    <>
                      <BlogCard
                        Blog={featured}
                        index={0}
                        isInView={isInView}
                        isFeatured={filteredBlogs.length > 1}
                      />
                      {rest.map((blog, i) => (
                        <BlogCard
                          key={blog._id}
                          Blog={blog}
                          index={i + 1}
                          isInView={isInView}
                        />
                      ))}
                    </>
                  ) : (
                    filteredBlogs.map((blog, i) => (
                      <BlogCard
                        key={blog._id}
                        Blog={blog}
                        index={i}
                        isInView={isInView}
                      />
                    ))
                  )}
                </div>
              ) : (
                <EmptyState
                  isInView={isInView}
                  hasFilter={hasActiveFilter}
                  onResetFilter={handleResetFilter}
                />
              )}

              {/* Daha Fazla Yükle Butonu (Filtre yoksa) */}
              {!hasActiveFilter && hasMore && (
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
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm text-zinc-300 hover:text-white border border-white/10 bg-white/[0.03] transition-all backdrop-blur-md hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? (
                      <>
                        <div className="w-4 h-4 border border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
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
            </div>

            {/* Sağ Sidebar: Arama & Kategori Filtreleri */}
            <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
              {/* Arama Kutusu */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  Yazılarda Ara
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Başlık veya içerik ara..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Kategoriler / Konular */}
              {categories.length > 0 && (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-violet-400" />
                    {t("categories")}
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-colors text-left ${
                        selectedCategory === null
                          ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                          : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                      }`}
                    >
                      <span>{t("allCategories")}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400">
                        {blogs.length}
                      </span>
                    </button>
                    {categories.map((cat) => {
                      const isSelected =
                        selectedCategory?.toLowerCase() === cat.name.toLowerCase();
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() =>
                            setSelectedCategory(isSelected ? null : cat.name)
                          }
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-colors text-left ${
                            isSelected
                              ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
                              : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                          }`}
                        >
                          <span className="truncate max-w-[150px]">#{cat.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400">
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Teklif / Proje CTA Kutusu */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-950/30 via-slate-900/40 to-cyan-950/20 border border-white/[0.08] backdrop-blur-md">
                <h4 className="text-sm font-bold text-white mb-1.5">
                  Projeniz için hazır mısınız?
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  XipSoft mühendislik ekibiyle hayalinizdeki web veya mobil uygulamayı hayata geçirin.
                </p>
                <Link
                  href="/teklif"
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider text-white bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition-all shadow-lg shadow-violet-500/10"
                >
                  Teklif Alın
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default BlogPageClient;
