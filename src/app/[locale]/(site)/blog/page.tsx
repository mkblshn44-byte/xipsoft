import { APP_CONFIG, SITE_URL } from "@/config/brand.config";
import { Metadata } from "next";
import BlogPageClient from "./BlogPageClient";
import PageTransitionWrapper from "@/components/Animate/PageTransitionWrapper/PageTransitionWrapper";
import JsonLd from "@/components/seo/JsonLd";
import { getPublishedBlogPostsAction, getBlogCategoriesAction } from "@/app/_actions/blog-actions";
import type { BlogItem } from "./components/types";
import { blogListSchema, breadcrumbSchema, faqSchema } from "@/lib/schema-helpers";
import { getPageFaqs, getPageMeta } from "@/lib/page-content";

// ISR - 1 saatte bir yenilenir; publish sonrasi revalidatePath('/Blog') ile de sifirlanir
export const revalidate = 3600;

const BLOG_TITLE = "XipSoft Blog";
const BLOG_DESCRIPTION =
  "Web tasarım, yazılım, teknoloji ve dijital dünya üzerine makaleler ve güncel içgörüler.";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("blog");
  const title = meta?.title || BLOG_TITLE;
  const description = meta?.description || BLOG_DESCRIPTION;

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: meta?.keywords?.length ? meta.keywords : undefined,
    // Canonical her zaman parametresiz ana URL'e işaret eder
    // ?q=, ?page= gibi parametreli URL'ler crawl budget israfı yaratır
    alternates: {
      canonical: `${SITE_URL}/blog`,
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: `${SITE_URL}/blog`,
      siteName: APP_CONFIG.title,
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      images: [{ url: `${SITE_URL}/images/xipsoft-seo.png`, width: 1200, height: 630, alt: "XipSoft Blog" }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      images: [`${SITE_URL}/images/xipsoft-seo.png`],
    },
  };
}

const BlogListPage = async () => {
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  const initialResult = hasDatabase
    ? await getPublishedBlogPostsAction(10, 0)
    : { data: [], hasMore: false, nextOffset: 0 };
  const categories = hasDatabase ? await getBlogCategoriesAction() : [];

  const initialBlogs: BlogItem[] = initialResult.data.map((p) => ({
    _id: p.id,
    title: p.title,
    description: p.description,
    date: new Date(p.publishedAt ?? p.createdAt).toISOString(),
    slug: p.slug ? `/blog/${p.slug.replace(/^\/+/, "").replace(/^blog\//i, "")}` : "/blog",
    source: "firestore" as const,
    authorName: p.authorName ?? undefined,
    authorPhotoURL: p.authorAvatar ?? undefined,
    coverImageURL: p.coverImageURL ?? null,
    coverImageAlt: p.coverImageAlt ?? null,
    tags: p.tags ?? [],
  }));

  const meta = await getPageMeta("blog");
  const faqItems = await getPageFaqs("blog");

  // ── JSON-LD: Blog + BreadcrumbList + FAQPage ─────────────────────────────
  const jsonLd = [
    blogListSchema({
      name: meta?.jsonLd?.name || BLOG_TITLE,
      description: meta?.jsonLd?.description || BLOG_DESCRIPTION,
    }),
    breadcrumbSchema([
      { name: "Ana Sayfa", url: "/" },
      { name: "Blog", url: "/blog" },
    ]),
    faqItems.length > 0 ? faqSchema(faqItems) : null,
  ];

  return (
    <PageTransitionWrapper>
      <JsonLd schemas={jsonLd} id="blog-list" />
      <BlogPageClient
        Blogs={initialBlogs}
        hasMoreInitial={initialResult.hasMore}
        initialLoadError={!hasDatabase || ("error" in initialResult && initialResult.error === true)}
        categories={categories}
        pageTitle={meta?.title || BLOG_TITLE}
        pageDescription={meta?.description || BLOG_DESCRIPTION}
      />
    </PageTransitionWrapper>
  );
};

export default BlogListPage;
