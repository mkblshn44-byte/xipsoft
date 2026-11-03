"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import XipIcon from "@/components/Ui/Icon";
import { useTranslations } from "next-intl";
import Container from "@/components/Common/Container/Container";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/utils";
import { isConfiguredRemoteDomain } from "@/lib/image-utils";
import { mapPostToBlogItem, type BlogItem } from "@/lib/blog/item";
import {
  getPublishedBlogPostsAction,
  type BlogCategoryCount,
} from "@/app/_actions/blog-actions";

// ── Props ─────────────────────────────────────────────────────────────────────
interface BlogPageClientProps {
  Blogs: BlogItem[];
  pageTitle?: string;
  pageDescription?: string;
  hasMoreInitial?: boolean;
  initialLoadError?: boolean;
  categories?: BlogCategoryCount[];
  totalCount?: number;
  initialCategory?: string | null;
}

/** Kart bağlantısını normalize eder: her zaman `/blog/<slug>`. */
function normalizeBlogHrefValue(value?: string) {
  const raw = (value ?? "").trim();
  if (!raw) return "/blog";
  const normalized = raw.replace(/^\/+/, "").replace(/^blog\//i, "");
  return `/blog/${normalized}`;
}

/**
 * Kart tipografisi iki kademeye ayrılır: listenin başındaki "öne çıkan" yazı
 * ve devamındakiler. Sorun tek renk değil, hiyerarşinin yokluğuydu — her kart
 * aynı punto ve aynı kalınlıkta olunca liste düz bir duvar gibi okunuyor.
 */
const cardType = (featured: boolean) =>
  featured
    ? {
        cover: "h-72 md:h-96",
        title: "text-2xl md:text-4xl font-black tracking-tight leading-[1.15]",
        excerpt: "text-base md:text-lg font-normal leading-relaxed line-clamp-3",
        chip: "text-xs font-medium",
        body: "p-6 md:p-10 pb-16 md:pb-20 space-y-6",
      }
    : {
        cover: "h-52 md:h-64",
        title: "text-lg md:text-[22px] font-bold tracking-tight leading-snug",
        excerpt:
          "text-sm md:text-[15px] font-normal leading-relaxed line-clamp-2",
        chip: "text-[11px] font-medium uppercase tracking-wide",
        body: "p-5 md:p-7 pb-14 md:pb-16 space-y-4",
      };

const BlogCard = ({
  Blog,
  featured = false,
}: {
  Blog: BlogItem;
  featured?: boolean;
}) => {
  const type = cardType(featured);
  const formattedDate = Blog.date
    ? new Date(Blog.date).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const readTime = Blog.description
    ? Math.max(1, Math.ceil(Blog.description.length / 200))
    : null;

  const coverImg = Blog.coverImage || Blog.coverImageURL || null;
  const categoryTag =
    Blog.category || (Blog.tags && Blog.tags.length > 0 ? Blog.tags[0] : null);
  const viewsCount =
    typeof Blog.views === "number" && Blog.views > 0 ? Blog.views : null;

  return (
    <div className="w-full home-reveal">
      <Link href={normalizeBlogHrefValue(Blog.slug)} className="block group">
        <article
          className={cn(
            "relative w-full rounded-xl overflow-hidden",
            "border border-white/[0.08] bg-space-800/70 backdrop-blur-md",
            "transition-all duration-500 ease-out",
            "hover:border-purple-500/30 hover:bg-[#181d2c]/90"
          )}
        >
          {/* Üst Kısım: Geniş Kapak Görseli veya Gradient Arka Plan */}
          <div
            className={cn(
              "relative w-full overflow-hidden border-b border-white/[0.06] bg-space-900",
              type.cover
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-space-700/40 via-space-900 to-space-950" />
            {coverImg && (
              <Image
                src={coverImg}
                alt={Blog.coverImageAlt || Blog.title || ""}
                fill
                unoptimized={!isConfiguredRemoteDomain(coverImg)}
                className="object-cover opacity-30 group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 1024px) 100vw, 800px"
              />
            )}

            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-12 text-center bg-black/40">
              <h2
                className={cn(
                  "max-w-3xl text-white drop-shadow-lg transition-colors group-hover:text-purple-200",
                  type.title
                )}
              >
                {Blog.title}
              </h2>
              <div
                className={cn(
                  "relative w-full max-w-md aspect-[3.5/1]",
                  featured ? "mt-6" : "mt-4"
                )}
              >
                <Image
                  src="/media/blogseo.webp"
                  alt="XipSoft blog"
                  fill
                  sizes="(max-width: 768px) 80vw, 448px"
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          {/* Alt Kısım: Bilgi Satırları ve Açıklama */}
          <div className={cn("relative", type.body)}>
            <div
              className={cn(
                "flex flex-wrap items-center text-zinc-300",
                featured ? "gap-2.5" : "gap-2",
                type.chip
              )}
            >
              {formattedDate && (
                <span className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                  {formattedDate}
                </span>
              )}

              {categoryTag && (
                <span className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                  {categoryTag}
                </span>
              )}

              {readTime && (
                <span className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-400">
                  {readTime} dk. Okuma
                </span>
              )}

              {viewsCount !== null && (
                <span className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-400">
                  {viewsCount.toLocaleString("tr-TR")} Görüntülenme
                </span>
              )}
            </div>

            {Blog.description && (
              <p className={cn("text-zinc-400", type.excerpt)}>
                {Blog.description}
              </p>
            )}

            <div className="absolute right-0 bottom-0">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-tl-3xl bg-neon-500 group-hover:bg-neon-400 flex items-center justify-center transition-all shadow-lg">
                <XipIcon name="arrow-up-right" glow="soft" className="w-6 h-6 text-space-950" />
              </div>
            </div>
          </div>
        </article>
      </Link>
    </div>
  );
};

const EmptyState = ({
  hasFilter = false,
  onResetFilter,
}: {
  hasFilter?: boolean;
  onResetFilter?: () => void;
}) => {
  const t = useTranslations("Blog");

  return (
    <div className="relative bg-glass-card border border-edge rounded-2xl py-16 px-8 text-center overflow-hidden home-reveal">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(167, 139, 250,0.04) 0%, transparent 70%)",
        }}
      />
      <motion.div
        className="relative mx-auto mb-6 w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #a78bfa10, #a78bfa08)",
          border: "1px solid rgba(167, 139, 250,0.15)",
        }}
        animate={{
          boxShadow: [
            "0 0 0px rgba(167, 139, 250,0)",
            "0 0 30px rgba(167, 139, 250,0.12)",
            "0 0 0px rgba(167, 139, 250,0)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <XipIcon name="book-open" glow="strong" className="w-7 h-7 text-neon" />
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
          <XipIcon name="x" glow="soft" className="w-3.5 h-3.5" />
          Filtreleri Sıfırla
        </button>
      )}
    </div>
  );
};

const BlogPageClient = ({
  Blogs,
  pageTitle,
  pageDescription,
  hasMoreInitial = false,
  initialLoadError = false,
  categories = [],
  totalCount,
  initialCategory = null,
}: BlogPageClientProps) => {
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(hasMoreInitial);
  const [blogs, setBlogs] = useState<BlogItem[]>(Blogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory
  );
  // Arama artık sunucu tarafında (DB) yapılır: yalnızca o an yüklenmiş 10 yazı
  // içinde aramak, 1000+ yazılı blogda neredeyse her kelimede "sonuç yok"
  // gösteriyordu. `serverResults` doluysa liste onun üzerinden render edilir.
  const [serverResults, setServerResults] = useState<BlogItem[] | null>(null);
  const [searching, setSearching] = useState(false);

  const t = useTranslations("Blog");

  // Arama terimi (veya kategori) değişince DB'den ara — 300ms debounce.
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query && !selectedCategory) {
      if (initialCategory) {
        let alive = true;
        setSearching(true);
        void getPublishedBlogPostsAction(10, 0)
          .then((result) => {
            if (!alive) return;
            setBlogs(result.data.map(mapPostToBlogItem));
            setHasMore(result.hasMore);
            setServerResults(null);
          })
          .catch(() => {
            if (alive) setBlogs([]);
          })
          .finally(() => {
            if (alive) setSearching(false);
          });
        return () => {
          alive = false;
        };
      }
      setServerResults(null);
      setSearching(false);
      return;
    }

    let alive = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await getPublishedBlogPostsAction(
          50,
          0,
          selectedCategory ?? undefined,
          query
        );
        if (alive) {
          setServerResults(result.data.map(mapPostToBlogItem));
          setHasMore(result.hasMore);
        }
      } catch {
        if (alive) setServerResults([]);
      } finally {
        if (alive) setSearching(false);
      }
    }, 300);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedCategory, initialCategory]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const hasFilter = Boolean(searchQuery.trim() || selectedCategory);
      const offset = hasFilter ? serverResults?.length ?? 0 : blogs.length;
      const result = await getPublishedBlogPostsAction(
        10,
        offset,
        selectedCategory ?? undefined,
        searchQuery.trim() || undefined
      );
      const nextBlogs = result.data.map(mapPostToBlogItem);
      if (hasFilter) {
        setServerResults((current) => [...(current ?? []), ...nextBlogs]);
      } else {
        setBlogs((current) => [...current, ...nextBlogs]);
      }
      setHasMore(result.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }

  // Arama sunucuda yapıldığı için burada yalnızca kategori süzülür.
  // (Arama metnini burada tekrar uygulamak, sunucunun `tags` üzerinden
  // bulduğu sonuçları yanlışlıkla eler.)
  const filteredBlogs = useMemo(() => {
    const base = serverResults ?? blogs;
    return base.filter((blog) => {
      if (!selectedCategory) return true;
      return (
        blog.tags?.some(
          (tag) => tag.toLowerCase() === selectedCategory.toLowerCase()
        ) ?? false
      );
    });
  }, [serverResults, blogs, selectedCategory]);

  const hasActiveFilter = Boolean(searchQuery.trim() || selectedCategory);

  const handleResetFilter = () => {
    setSearchQuery("");
    setSelectedCategory(null);
  };

  return (
    <div className="site-ambient-led relative min-h-[60vh]">
      {/* Header - Daha Sade ve Modern */}
      <header className="relative">
        <Container withPadding>
          <div className="pt-10 pb-8 md:pt-14 md:pb-12">
            <h1 className="mb-4 text-3xl md:text-5xl font-black tracking-tight text-white">
              Teknoloji & Yazılım Rehberi
            </h1>
            <p className="text-zinc-400 max-w-xl text-sm md:text-base leading-relaxed">
              Yazılım mimarisi, otomasyon ve güncel teknolojiler üzerine derinlemesine içerikler.
            </p>
          </div>
        </Container>
      </header>

      {/* Main Content Area */}
      <section className="relative z-10 pb-24 md:pb-28" aria-label="Blog yazıları listesi">
        <Container withPadding>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 xl:gap-12">
            {/* Sol: Blog Kartları */}
            <div className="lg:col-span-8 xl:col-span-9">
              {hasActiveFilter && (
                <div className="flex items-center justify-between gap-3 mb-8 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-300">
                    <span className="text-zinc-500 font-mono">Filtreler:</span>
                    {selectedCategory && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-violet-950/50 border border-violet-800/50 text-violet-300 font-mono">
                        <XipIcon name="tag" glow="none" className="w-3 h-3" />
                        {selectedCategory}
                        <button
                          type="button"
                          onClick={() => setSelectedCategory(null)}
                          className="ml-1 hover:text-white"
                        >
                          <XipIcon name="x" glow="soft" className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {searchQuery.trim() && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-950/50 border border-cyan-800/50 text-cyan-300 font-mono">
                        <XipIcon name="search" glow="none" className="w-3 h-3" />
                        &ldquo;{searchQuery}&rdquo;
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="ml-1 hover:text-white"
                        >
                          <XipIcon name="x" glow="soft" className="w-3 h-3" />
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
                <div className="flex flex-col gap-9 md:gap-14">
                  {filteredBlogs.map((blog, index) => (
                    <BlogCard
                      key={blog._id}
                      Blog={blog}
                      featured={index === 0}
                    />
                  ))}
                </div>
              ) : searching ? (
                <div className="flex items-center justify-center gap-3 py-16 text-zinc-400 home-reveal">
                  <div className="w-5 h-5 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
                  <span className="text-sm font-mono">Aranıyor...</span>
                </div>
              ) : (
                <EmptyState
                  hasFilter={hasActiveFilter}
                  onResetFilter={handleResetFilter}
                />
              )}

              {!hasActiveFilter && hasMore && (
                <div className="flex justify-center mt-14 md:mt-16 home-reveal">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm text-zinc-300 hover:text-white border border-white/10 bg-white/[0.03] transition-all backdrop-blur-md hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? (
                      <>
                        <div className="w-4 h-4 border border-purple-400/20 border-t-purple-400 rounded-full animate-spin" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        Daha Fazla
                        <XipIcon name="arrow-up-right" glow="soft" className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Sağ Sidebar: Modernleştirilmiş Arama & Kategori Filtreleri */}
            <aside className="lg:col-span-4 xl:col-span-3 space-y-8">
              {/* Modern Arama Kutusu */}
              <div className="p-5 rounded-2xl bg-space-800/60 border border-white/[0.08] backdrop-blur-xl shadow-xl">
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300 mb-3 flex items-center gap-2">
                  <XipIcon name="search" glow="soft" className="w-3.5 h-3.5 text-purple-400" />
                  Yazılarda Ara
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Anahtar kelime yazın..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-black/50 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <XipIcon name="x" glow="soft" className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Modern Kategoriler Listesi */}
              {categories.length > 0 && (
                <div className="p-5 rounded-2xl bg-space-800/60 border border-white/[0.08] backdrop-blur-xl shadow-xl">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300 mb-3 flex items-center gap-2">
                    <XipIcon name="tag" glow="soft" className="w-3.5 h-3.5 text-purple-400" />
                    {t("categories")}
                  </h3>
                  <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-all text-left ${
                        selectedCategory === null
                          ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm"
                          : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="font-medium">{t("allCategories")}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400">
                        {(totalCount ?? blogs.length).toLocaleString("tr-TR")}
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
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-all text-left ${
                            isSelected
                              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm"
                              : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                          }`}
                        >
                          <span className="truncate max-w-[150px]">#{cat.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400">
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default BlogPageClient;
