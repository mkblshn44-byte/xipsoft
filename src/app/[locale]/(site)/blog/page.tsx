import { SITE_URL } from "@/config/brand.config";
import { Metadata } from "next";
import { buildPageMetadata, generateDynamicTitle } from "@/lib/seo-helpers";
import BlogPageClient from "./BlogPageClient";
import PageTransitionWrapper from "@/components/Animate/PageTransitionWrapper/PageTransitionWrapper";
import JsonLd from "@/components/seo/JsonLd";
import {
  getPublishedBlogPostsAction,
  getBlogCategoriesAction,
  getBlogTotalCountAction,
} from "@/app/_actions/blog-actions";
import { mapPostToBlogItem, type BlogItem } from "@/lib/blog/item";
import { blogListSchema } from "@/lib/schema/blog";
import {
  breadcrumbSchema,
  faqSchema
} from "@/lib/schema/site";
import { getPageFaqs, getPageMeta } from "@/lib/page-content";
import { normalizeBlogTag } from "@/lib/blog-tag";

// ISR - 1 saatte bir yenilenir; publish sonrasi revalidatePath('/Blog') ile de sifirlanir
export const revalidate = 3600;

type BlogListPageProps = {
  searchParams: Promise<{ tag?: string | string[] }>;
};

const BLOG_DESCRIPTION =
  "Web tasarım, yazılım, teknoloji ve dijital dünya üzerine makaleler ve güncel içgörüler.";
const BLOG_TITLE = "XipSoft Blog";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("blog");

  // Dinamik title: DB'den varsa kullan, yoksa sayfa türüne göre üret
  const dynamicTitle = meta?.title || generateDynamicTitle("blog-list");
  const description = meta?.description || BLOG_DESCRIPTION;

  // Canonical her zaman parametresiz ana URL'e işaret eder
  // (?q=, ?page= gibi parametreli URL'ler crawl budget israfı yaratır)
  return buildPageMetadata({
    title: dynamicTitle,
    titleAbsolute: true, // DB'den gelen veya dinamik ürettiğimiz başlık zaten marka suffix içeriyor
    description,
    keywords: meta?.keywords,
    canonicalPath: "/blog",
    image: `${SITE_URL}/media/bloghome.webp`,
    imageAlt: "XipSoft Blog",
    shareTitle: meta?.ogTitle || dynamicTitle,
    shareDescription: meta?.ogDescription || description,
  });
}

const BlogListPage = async ({ searchParams }: BlogListPageProps) => {
  const params = await searchParams;
  const initialCategory = normalizeBlogTag(params.tag);
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  const initialResult = hasDatabase
    ? await getPublishedBlogPostsAction(10, 0, initialCategory ?? undefined)
    : { data: [], hasMore: false, nextOffset: 0 };
  const categories = hasDatabase ? await getBlogCategoriesAction() : [];
  const totalCount = hasDatabase ? await getBlogTotalCountAction() : 0;

  const initialBlogs: BlogItem[] = initialResult.data.map(mapPostToBlogItem);

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
        initialCategory={initialCategory}
        initialLoadError={!hasDatabase || ("error" in initialResult && initialResult.error === true)}
        categories={categories}
        totalCount={totalCount}
        pageTitle={meta?.title || BLOG_TITLE}
        pageDescription={meta?.description || BLOG_DESCRIPTION}
      />
    </PageTransitionWrapper>
  );
};

export default BlogListPage;
