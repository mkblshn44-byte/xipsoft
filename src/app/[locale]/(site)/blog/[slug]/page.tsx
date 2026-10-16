/**
 * Blog Detay Sayfası — /blog/[slug]
 * Kaynak: Doğrudan Veritabanı (blog_posts tablosu)
 *
 * Sadeleştirme Planı:
 * - Tek dosya Server Component mimarisi (ek alt sarmalayıcı bileşen yok)
 * - Doğrudan DB verisi, sıfır fallback katmanı
 * - Arama motoru uyumlu eksiksiz Metadata ve JSON-LD (BlogPosting + BreadcrumbList)
 * - LCP kapak görseli priority ve dinamik alt metni
 * - dateModified yalnızca gerçek güncelleme varsa eklenir (kozmetik güncelleme yok)
 */

import { FC } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock3,
  Tag,
  BookOpen,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Share2,
} from "lucide-react";
import { SITE_URL } from "@/config/brand.config";
import { getDbBlogBySlug } from "@/lib/blog-post-page";
import { normalizeBlogSlug } from "@/lib/blog-slug";
import { isConfiguredRemoteDomain } from "@/lib/image-utils";
import { getAllActiveServices } from "@/lib/database";
import {
  getBlogAdjacentPostsAction,
  getRelatedBlogPostsAction,
} from "@/app/_actions/blog-actions";
import {
  estimateReadingMinutes,
} from "@/lib/blog-content";
import { lexicalStateToHtml } from "@/utils/lexical-to-html";
import { injectInternalLinks } from "@/lib/seo/internal-linking";
import { breadcrumbSchema } from "@/lib/schema-helpers";
import JsonLd from "@/components/seo/JsonLd";
import RelatedPosts from "@/components/Blog/RelatedPosts";
import RelatedServices from "@/components/Blog/RelatedServices";

export const revalidate = 300;

type TBlogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Gerçek güncelleme tarihini belirler.
 * Yalnızca updated_at ile oluşturma/yayın tarihi arasında en az 1 dakika fark varsa geçerlidir.
 */
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

// ── Metadata ──────────────────────────────────────────────────────────────────

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
  const canonicalUrl = `${SITE_URL}/blog/${normalizedSlug}`;
  const coverImage = dbBlog.cover_image_url || `${SITE_URL}/media/blogseo.webp`;
  const coverImageAlt = dbBlog.cover_image_alt || dbBlog.title;
  const publishedTime = (dbBlog.published_at ?? dbBlog.created_at)?.toISOString();
  const modifiedTime = getRealDateModified(
    dbBlog.published_at ?? dbBlog.created_at,
    dbBlog.updated_at
  );
  const authorName = dbBlog.author_name;
  const tags = Array.isArray(dbBlog.tags) ? dbBlog.tags : [];

  return {
    title: {
      absolute: `${title} | XipSoft`,
    },
    description,
    keywords: tags.length > 0 ? tags : undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "article",
      locale: "tr_TR",
      siteName: "XipSoft",
      url: canonicalUrl,
      title,
      description,
      publishedTime,
      modifiedTime,
      authors: authorName ? [authorName] : undefined,
      tags,
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: coverImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [coverImage],
    },
    ...(dbBlog.author_name
      ? {
          authors: [
            {
              name: dbBlog.author_name,
              url: dbBlog.author_nick
                ? `${SITE_URL}/x/${dbBlog.author_nick}`
                : undefined,
            },
          ],
        }
      : {}),
  };
}

// ── Sosyal Paylaşım Butonu İkonları ──────────────────────────────────────────

const ShareIconWhatsApp = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
);

const ShareIconTwitter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const ShareIconLinkedIn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const ShareIconFacebook = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// ── Blog Detay Sayfası ────────────────────────────────────────────────────────

const BlogDetailPage: FC<TBlogDetailPageProps> = async (props) => {
  const { slug } = await props.params;
  const normalizedSlug = normalizeBlogSlug(slug) ?? slug;

  if (!process.env.DATABASE_URL) {
    notFound();
  }

  const dbBlog = await getDbBlogBySlug(normalizedSlug);
  if (!dbBlog) notFound();
  if (dbBlog.slug !== normalizedSlug) {
    permanentRedirect(`/blog/${dbBlog.slug}`);
  }

  // Komşu yazıları, ilgili yazıları ve ilgili hizmetleri paralel yükle
  const [adjacent, relatedPosts, relatedServices] = await Promise.all([
    getBlogAdjacentPostsAction(normalizedSlug),
    getRelatedBlogPostsAction(normalizedSlug, dbBlog.tags ?? []),
    getAllActiveServices(),
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
  const contentHtml = injectInternalLinks(rawHtml, { currentSlug: normalizedSlug });

  // ── JSON-LD: BlogPosting + BreadcrumbList ───────────────────────────────
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

  // Paylaşım URL'leri
  const shareTitle = encodeURIComponent(dbBlog.title);
  const shareUrl = encodeURIComponent(pageUrl);

  const coverImage = dbBlog.cover_image_url;
  const coverImageAlt = dbBlog.cover_image_alt || dbBlog.title;

  return (
    <>
      <JsonLd schemas={jsonLd} id={`blog-${normalizedSlug}`} />

      <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 relative blog-post-page">
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
              <ArrowLeft className="w-3.5 h-3.5" />
              Tüm Yazılar
            </Link>
          </div>

          {/* LCP Kapak Görseli (varsa priority ve dinamik alt ile yüklenir) */}
          {coverImage && (
            <div className="mb-8 rounded-2xl overflow-hidden border border-white/[0.08] relative aspect-[16/9] max-h-[440px] bg-slate-900/40">
              <Image
                src={coverImage}
                alt={coverImageAlt}
                fill
                priority
                unoptimized={!isConfiguredRemoteDomain(coverImage)}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
                className="object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
            </div>
          )}

          {/* Başlık ve Üst Bilgi Kartı */}
          <header className="relative mb-8 rounded-2xl overflow-hidden bg-white/[0.02] backdrop-blur-md border border-white/[0.08] p-6 md:p-8">
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(167,139,250,0.4), rgba(34,211,238,0.4), transparent)",
              }}
            />

            {/* Meta Satırı */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-medium">
                <BookOpen className="w-3.5 h-3.5" />
                Makale
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
                <Tag className="w-3.5 h-3.5 text-zinc-500 mr-1" />
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

          {/* Paylaşım ve Aksiyonlar Bölümü */}
          <div className="mt-12 pt-8 border-t border-white/[0.06] space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <h3 className="text-sm font-semibold text-white mb-0.5 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  Bu yazıyı faydalı buldunuz mu?
                </h3>
                <p className="text-xs text-zinc-400">
                  Sosyal ağlarınızda paylaşarak bilginin yayılmasına destek olabilirsiniz.
                </p>
              </div>

              {/* Sosyal Paylaşım Linkleri */}
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`https://api.whatsapp.com/send?text=${shareTitle}%20${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp'ta Paylaş"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/40 transition-colors"
                >
                  <ShareIconWhatsApp />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X'te Paylaş"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-zinc-800 border border-white/10 hover:border-white/30 transition-colors"
                >
                  <ShareIconTwitter />
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn'de Paylaş"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-sky-600/20 border border-white/10 hover:border-sky-500/40 transition-colors"
                >
                  <ShareIconLinkedIn />
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook'ta Paylaş"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/40 transition-colors"
                >
                  <ShareIconFacebook />
                </a>
              </div>
            </div>

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
                      <ChevronLeft className="w-3.5 h-3.5" /> Önceki Yazı
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
                      Sonraki Yazı <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white line-clamp-2 transition-colors">
                      {adjacent.next.title}
                    </span>
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* İlgili Blog Yazıları */}
          <RelatedPosts
            currentSlug={normalizedSlug}
            tags={dbBlog.tags ?? []}
            limit={3}
            initialPosts={relatedPosts}
          />

          {/* İlgili Hizmetler */}
          <RelatedServices
            services={relatedServices ?? []}
            tags={dbBlog.tags ?? []}
            limit={3}
          />
        </article>
      </div>
    </>
  );
};

export default BlogDetailPage;
