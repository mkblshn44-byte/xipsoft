/**
 * BlogDetailServer — Blog detay sayfasının sunucu tarafı gövdesi.
 *
 * Blog yazısını JSON-LD (BlogPosting + Breadcrumb) + Googlebot için görünmez
 * (sr-only) SSR içeriği + istemci şablonu (BlogPostClient) ile render eder;
 * böylece şablon tek kaynaktan beslenir (MIMARI.md).
 *
 * `canonicalPath` her zaman kanonik blog yolu olmalıdır (ör. `/blog/<slug>`).
 */

import { getAllActiveServices } from "@/lib/database";
import { BlogSchemaFromDb, breadcrumbSchema, faqSchema } from "@/lib/schema-helpers";
import JsonLd from "@/components/seo/JsonLd";
import {
  getBlogAdjacentPostsAction,
  getRelatedBlogPostsAction,
} from "@/app/_actions/blog-actions";
import { extractBlogText, estimateBlogWordCount, extractBlogFaqs, estimateReadingMinutes } from "@/lib/blog-content";
import { serializeDbBlog, type DbBlogRow } from "@/lib/blog-post-page";
import BlogPostClient from "./BlogPostClient";

// ── SSR içerik bileşeni (googlebot için) ─────────────────────────────────────

function BlogSSRContent({
  post,
  relatedPosts,
}: {
  post: DbBlogRow;
  relatedPosts?: Array<{ slug: string; title: string }>;
}) {
  const textContent = extractBlogText(post.content);
  const dateStr = (post.published_at ?? post.created_at)?.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article
      id="Blog-post-seo-content"
      itemScope
      itemType="https://schema.org/BlogPosting"
      className="sr-only"
    >
      <h1 itemProp="headline">{post.title}</h1>
      {post.description && <p itemProp="description">{post.description}</p>}
      {post.author_name && (
        <span itemProp="author" itemScope itemType="https://schema.org/Person">
          <span itemProp="name">{post.author_name}</span>
        </span>
      )}
      {dateStr && (
        <time itemProp="datePublished" dateTime={(post.published_at ?? post.created_at)?.toISOString()}>
          {dateStr}
        </time>
      )}
      <meta itemProp="dateModified" content={post.updated_at.toISOString()} />
      {Array.isArray(post.tags) && post.tags.length > 0 && (
        <ul>
          {post.tags.map((tag) => (
            <li key={tag} itemProp="keywords">{tag}</li>
          ))}
        </ul>
      )}
      {textContent && <div itemProp="articleBody">{textContent.substring(0, 3000)}</div>}

      {/* Googlebot için SSR seviyesinde doğal iç bağlantılar (internal linking) */}
      {relatedPosts && relatedPosts.length > 0 && (
        <nav aria-label="İlgili Rehberler">
          <h2>İlgili Rehberler</h2>
          <ul>
            {relatedPosts.map((r) => (
              <li key={r.slug}>
                <a href={`/blog/${r.slug}`}>{r.title} hakkında detaylı bilgiye göz atabilirsin.</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  );
}

// ── Ana sunucu bileşeni ───────────────────────────────────────────────────────

export default async function BlogDetailServer({
  row,
  canonicalPath,
}: {
  row: DbBlogRow;
  /** Kanonik blog yolu, örn. `/blog/<slug>`. */
  canonicalPath: string;
}) {
  const slug = row.slug;

  // Komşu postları ve ilgili rehberleri server'da çek (client waterfall'i önle,
  // SSR iç bağlantıları besle).
  const [adjacent, relatedPosts, serializedBlog, relatedServices] = await Promise.all([
    getBlogAdjacentPostsAction(slug),
    getRelatedBlogPostsAction(slug, row.tags ?? []),
    Promise.resolve(serializeDbBlog(row)),
    // İlgili hizmetler (iç linkleme) — statik map yerine NeonDB'den (MIMARI.md)
    getAllActiveServices(),
  ]);

  // E-E-A-T: yazar sosyal medya URL'lerini topla
  const authorSameAs: string[] = [];
  if (row.author_linkedin_url) authorSameAs.push(row.author_linkedin_url);
  if (row.author_github_url) authorSameAs.push(row.author_github_url);
  if (row.author_twitter_url) authorSameAs.push(row.author_twitter_url);

  const schema = BlogSchemaFromDb({
    title: row.title,
    description: row.description || row.title,
    url: canonicalPath,
    datePublished: (row.published_at ?? row.created_at)?.toISOString(),
    // dateModified — Content Freshness sinyali: updated_at her zaman mevcuttur
    dateModified: (row.updated_at as Date).toISOString(),
    author: row.author_name ?? undefined,
    authorNick: row.author_nick ?? undefined,
    authorBio: row.author_bio ?? undefined,
    authorSameAs: authorSameAs.length > 0 ? authorSameAs : undefined,
    authorExpertise: row.author_expertise_area ?? undefined,
    authorYearsExperience: row.author_years_experience ?? undefined,
    authorIsExpert: row.author_is_expert ?? undefined,
    keywords: Array.isArray(row.tags) ? row.tags : undefined,
    image: row.cover_image_url ?? undefined,
    // articleSection: ilk tag'ı bölüm olarak kullan — topical authority sinyali
    articleSection:
      Array.isArray(row.tags) && row.tags.length > 0 ? row.tags[0] : "Teknoloji",
    // wordCount: içerik derinliğini Google'a bildir — E-E-A-T sinyali
    wordCount: estimateBlogWordCount(row.content),
    citations: row.citations ?? undefined,
    // UX + Google: okuma süresi (aynı 200 kelime/dk kuralı arayüzle birebir)
    readingTimeMinutes: estimateReadingMinutes(row.content),
  });

  const breadcrumb = breadcrumbSchema([
    { name: "Ana Sayfa", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: row.title, url: canonicalPath },
  ]);

  // FAQPage (varsa): yazıdaki "?" başlıklarını SSS çiftine çevir
  const faqs = extractBlogFaqs(row.content);

  // ── JSON-LD: BlogPosting + BreadcrumbList + FAQPage ──────────────────────
  const jsonLd = [schema, breadcrumb, faqs.length > 0 ? faqSchema(faqs) : null];

  return (
    <>
      <JsonLd schemas={jsonLd} id={`blog-${slug}`} />
      <BlogSSRContent post={row} relatedPosts={relatedPosts} />
      <BlogPostClient
        slug={slug}
        initialData={serializedBlog}
        initialAdjacent={adjacent}
        initialRelated={relatedPosts}
        initialServices={relatedServices}
      />
    </>
  );
}
