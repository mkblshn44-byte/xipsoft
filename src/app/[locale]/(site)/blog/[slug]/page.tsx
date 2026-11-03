/**
 * — Blog Detay Sayfası — /blog/[slug]
 * Kaynak: Doğrudan Veritabanı (blog_posts tablosu)
 */

import { FC } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import XipIcon from "@/components/Ui/Icon";
import { SITE_URL } from "@/config/brand.config";
import { buildPageMetadata, generateDynamicTitle } from "@/lib/seo-helpers";
import { getDbBlogBySlug } from "@/lib/blog/detail";
import { normalizeBlogSlug } from "@/lib/blog-slug";
import { isConfiguredRemoteDomain } from "@/lib/image-utils";
import { getAllActiveServices } from "@/lib/db/services";
import {
  getBlogAdjacentPostsAction,
  getRelatedBlogPostsAction,
} from "@/app/_actions/blog-actions";
import {
  estimateReadingMinutes,
} from "@/lib/blog/content";
import { lexicalStateToHtml } from "@/utils/lexical-to-html";
import { sanitizeRenderedHtml } from "@/lib/html-sanitize";
import { injectInternalLinks } from "@/lib/seo/internal-linking";
import { breadcrumbSchema } from "@/lib/schema/site";
import JsonLd from "@/components/seo/JsonLd";
import RelatedPosts from "@/components/Blog/RelatedPosts";
import RelatedServices from "@/components/Blog/RelatedServices";
import BlogArticleTools from "@/components/Blog/BlogArticleTools";
import { pickRelatedServices } from "@/lib/blog/related-services";
import RatingWidget from "@/components/Blog/RatingWidget";
import CommentSection from "@/components/Blog/CommentSection";
import {
  getCommentsAction,
  getRatingSummaryAction,
} from "@/app/_actions/blog-comment-actions";
import { getServerActionContext } from "@/lib/api-guard";

export const revalidate = 300;

type TBlogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

function getRealDateModified(
  createdOrPublished: Date | string | null | undefined,
  updated: Date | string | null | undefined
): string | undefined {
  if (!updated || !createdOrPublished) return undefined;
  const baseMs = new Date(createdOrPublished).getTime();
  const updatedMs = new Date(updated).getTime();
  if (Math.abs(updatedMs - baseMs) > 60000) {
    return new Date(updated).toISOString();
  }
  return undefined;
}

export async function generateMetadata({
  params,
}: TBlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = normalizeBlogSlug(slug) ?? slug;

  const dbBlog = await getDbBlogBySlug(normalizedSlug);
  if (!dbBlog) {
    return {
      title: "Blog Yazısı Bulunamadı",
      robots: { index: false, follow: false },
    };
  }

  const title = dbBlog.title;
  const description =
    dbBlog.description ||
    `${dbBlog.title} hakkında detaylı bilgi ve teknik rehber.`;
  const coverImage = dbBlog.cover_image_url || `${SITE_URL}/media/blogseo.webp`;
  const coverImageAlt = dbBlog.cover_image_alt || dbBlog.title;
  const publishedTime = (dbBlog.published_at ?? dbBlog.created_at)?.toISOString();
  const modifiedTime = getRealDateModified(
    dbBlog.published_at ?? dbBlog.created_at,
    dbBlog.updated_at
  );
  const authorName = dbBlog.author_name;
  const tags = Array.isArray(dbBlog.tags) ? dbBlog.tags : [];

  const metadata = buildPageMetadata({
    // Dinamik title: Blog detay için özel kalıp kullan
    title: generateDynamicTitle("blog-detail", title, String(new Date().getFullYear())),
    titleAbsolute: true, // Dinamik ürettiğimiz başlık zaten marka suffix içeriyor
    description,
    keywords: tags,
    canonicalPath: `/blog/${dbBlog.slug}`,
    ogType: "article",
    image: coverImage,
    imageAlt: coverImageAlt,
    // OG/Twitter'da suffix'siz başlık açıklama görünür (eski davranış)
    shareTitle: title,
    shareDescription: description,
    ogExtras: {
      publishedTime,
      modifiedTime,
      authors: authorName ? [authorName] : undefined,
      tags,
    },
  });

  if (dbBlog.author_name) {
    metadata.authors = [
      {
        name: dbBlog.author_name,
        url: dbBlog.author_nick
          ? `${SITE_URL}/x/${dbBlog.author_nick}`
          : undefined,
      },
    ];
  }

  return metadata;
}

const BlogDetailPage: FC<TBlogDetailPageProps> = async (props) => {
  const { slug } = await props.params;
  const normalizedSlug = normalizeBlogSlug(slug) ?? slug;

  if (!process.env.DATABASE_URL) {
    notFound();
  }

  const dbBlog = await getDbBlogBySlug(normalizedSlug);
  if (!dbBlog) notFound();
  if (dbBlog.slug !== slug) {
    permanentRedirect(`/blog/${dbBlog.slug}`);
  }

  const [adjacent, relatedPosts, relatedServices] = await Promise.all([
    getBlogAdjacentPostsAction(normalizedSlug),
    getRelatedBlogPostsAction(normalizedSlug, dbBlog.tags ?? []),
    getAllActiveServices(),
  ]);

  const postId = Number(dbBlog.id);
  const hasNumericId = Number.isInteger(postId) && postId > 0;

  const [comments, ratingSummary, authCtx] = await Promise.all([
    hasNumericId
      ? getCommentsAction(postId, 0)
      : Promise.resolve({ comments: [], total: 0, hasMore: false, nextOffset: 0 }),
    hasNumericId
      ? getRatingSummaryAction(postId)
      : Promise.resolve({ average: 0, rounded: 0, count: 0, userRating: null }),
    getServerActionContext(),
  ]);

  const pageUrl = `${SITE_URL}/blog/${normalizedSlug}`;
  const publishedIso = (dbBlog.published_at ?? dbBlog.created_at)?.toISOString();
  const modifiedIso = getRealDateModified(
    dbBlog.published_at ?? dbBlog.created_at,
    dbBlog.updated_at
  );
  const modifiedLabel = modifiedIso
    ? new Date(modifiedIso).toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : undefined;

  const formattedDate = (dbBlog.published_at ?? dbBlog.created_at)
    ? new Date(dbBlog.published_at ?? dbBlog.created_at!).toLocaleDateString(
        "tr-TR",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      )
    : "";

  const readTime = estimateReadingMinutes(dbBlog.content);
  const rawHtml = dbBlog.content ? lexicalStateToHtml(dbBlog.content) : "";
  const contentHtml = sanitizeRenderedHtml(
    injectInternalLinks(rawHtml, { currentSlug: normalizedSlug })
  );

  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${pageUrl}#blogposting`,
    headline: dbBlog.title,
    ...(dbBlog.description ? { description: dbBlog.description } : {}),
    url: pageUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
    },
    datePublished: publishedIso,
    ...(modifiedIso ? { dateModified: modifiedIso } : {}),
    ...(dbBlog.author_name
      ? {
          author: {
            "@type": "Person",
            name: dbBlog.author_name,
            ...(dbBlog.author_nick
              ? { url: `${SITE_URL}/x/${dbBlog.author_nick}` }
              : {}),
          },
        }
      : {}),
    ...(dbBlog.cover_image_url ? { image: dbBlog.cover_image_url } : {}),
    ...(Array.isArray(dbBlog.tags) && dbBlog.tags.length > 0
      ? { keywords: dbBlog.tags }
      : {}),
  };

  const breadcrumbs = breadcrumbSchema([
    { name: "Ana Sayfa", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: dbBlog.title, url: `/blog/${normalizedSlug}` },
  ]);

  const jsonLd = [blogPostingSchema, breadcrumbs];

  return (
    <>
      <JsonLd schemas={jsonLd} id={`blog-${normalizedSlug}`} />

      <div className="site-ambient-led min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 relative blog-post-page">
        <article className="max-w-4xl mx-auto relative z-10">
          {/* Top Bar / Geri Dönüş Linki */}
          <nav aria-label="Sayfa yolu" className="mb-4 text-xs text-zinc-500">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link href="/">Ana Sayfa</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/blog">Blog</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-zinc-300">{dbBlog.title}</li>
            </ol>
          </nav>
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider text-zinc-300 hover:text-white transition-all duration-300 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
            >
              <XipIcon name="arrow-left" className="w-3.5 h-3.5" />
              Tüm Yazılar
            </Link>
          </div>

          <BlogArticleTools title={dbBlog.title} url={pageUrl}>
          {/* Başlık ve Üst Bilgi Kartı */}
          <header className="relative mb-8 rounded-2xl overflow-hidden bg-white/[0.02] backdrop-blur-md border border-white/[0.08] p-6 md:p-8">
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(167, 139, 250,0.10), rgba(18, 20, 28,0.08), transparent)",
              }}
            />

            {/* Meta Satırı */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-medium">
                <XipIcon name="book-open" className="w-3.5 h-3.5" />
                Makale
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                <XipIcon name="calendar" className="w-3 h-3 text-zinc-500" />
                {formattedDate}
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                <XipIcon name="clock" className="w-3 h-3 text-zinc-500" />
                {readTime} dk okuma
              </span>
              {modifiedIso && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-mono text-violet-300">
                  Güncellendi {modifiedLabel}
                </span>
              )}
            </div>

            {/* H1 Başlık */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
              {dbBlog.title}
            </h1>

            {/* Özet / Açıklama */}
            {dbBlog.description && (
              <p className="text-base sm:text-lg text-zinc-400 leading-relaxed mb-6">
                {dbBlog.description}
              </p>
            )}

            {/* Etiketler */}
            {Array.isArray(dbBlog.tags) && dbBlog.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <XipIcon name="tag" className="w-3.5 h-3.5 text-zinc-500 mr-1" />
                {dbBlog.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.06]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Yazar Bilgisi */}
            {dbBlog.author_name && (
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-3">
                {dbBlog.author_avatar ? (
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/10">
                    <Image
                      src={dbBlog.author_avatar}
                      alt={dbBlog.author_name}
                      fill
                      unoptimized={!isConfiguredRemoteDomain(dbBlog.author_avatar)}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono font-bold text-white bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10">
                    {dbBlog.author_name[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  {dbBlog.author_nick ? (
                    <Link
                      href={`/x/${dbBlog.author_nick}`}
                      className="text-xs font-medium text-white hover:text-cyan-400 transition-colors"
                    >
                      {dbBlog.author_name}
                    </Link>
                  ) : (
                    <p className="text-xs font-medium text-white">
                      {dbBlog.author_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            )}
          </header>

          {/* Ana Makale İçeriği (SSR Doğal HTML Render) */}
          <div className="prose prose-invert max-w-none mb-12 blog-content-body">
            <div
              dangerouslySetInnerHTML={{ __html: contentHtml }}
              className="text-zinc-300 leading-relaxed space-y-4"
            />
          </div>
          </BlogArticleTools>

          {/* Önceki ve Sonraki Yazı Bağlantıları */}
            {(adjacent.prev || adjacent.next) && (
              <nav
                aria-label="Önceki ve Sonraki Yazılar"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {adjacent.prev ? (
                  <Link
                    href={`/blog/${adjacent.prev.slug}`}
                    className="group p-4 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all flex flex-col justify-between"
                  >
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-zinc-500 group-hover:text-cyan-400 transition-colors mb-2">
                      <XipIcon name="chevron-left" className="w-3.5 h-3.5" /> Önceki Yazı
                    </span>
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white line-clamp-2 transition-colors">
                      {adjacent.prev.title}
                    </span>
                  </Link>
                ) : (
                  <div />
                )}

                {adjacent.next && (
                  <Link
                    href={`/blog/${adjacent.next.slug}`}
                    className="group p-4 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all flex flex-col justify-between text-right"
                  >
                    <span className="inline-flex items-center justify-end gap-1 text-[11px] font-mono uppercase tracking-wider text-zinc-500 group-hover:text-cyan-400 transition-colors mb-2">
                      Sonraki Yazı <XipIcon name="chevron-right" className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white line-clamp-2 transition-colors">
                      {adjacent.next.title}
                    </span>
                  </Link>
                )}
              </nav>
            )}
          {/* İlgili Blog Yazıları */}
          <RelatedPosts
            currentSlug={normalizedSlug}
            tags={dbBlog.tags ?? []}
            limit={3}
            initialPosts={relatedPosts}
          />

          {/* İlgili Hizmetler — seçim SUNUCUDA yapılır; istemciye yalnızca
              3 kartlık veri gider (önceden tüm hizmet listesi ~100 KB
              serialize ediliyordu). */}
          <RelatedServices
            services={pickRelatedServices(relatedServices ?? [], {
              currentSlug: normalizedSlug,
              tags: dbBlog.tags ?? [],
              limit: 3,
            })}
            limit={3}
          />

          {/* Puanlama + Yorumlar */}
          {hasNumericId && (
            <>
              <RatingWidget postId={postId} initial={ratingSummary} />

              <CommentSection
                postId={postId}
                initial={comments}
                currentUser={{
                  name:
                    authCtx.isAuthenticated && authCtx.userEmail
                      ? authCtx.userEmail.split("@")[0] ?? ""
                      : "",
                  email: authCtx.userEmail ?? "",
                  isAuthenticated: authCtx.isAuthenticated,
                }}
              />
            </>
          )}
        </article>
      </div>
    </>
  );
};

export default BlogDetailPage;