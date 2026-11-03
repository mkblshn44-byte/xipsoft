/**
 * schema/blog.ts — Blog yazısı (BlogPosting) JSON-LD üreticisi.
 */

import { SITE_URL } from "@/lib/site-url";
import { DEFAULT_OG_IMAGE_URL } from "@/config/brand.config";
import { SCHEMA_CONTEXT, SOCIAL_PROFILES } from "./shared";

export function BlogSchemaFromDb(post: {
  title: string;
  description: string;
  abstract?: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  authorNick?: string;
  authorBio?: string | null;
  /** E-E-A-T: yazarın LinkedIn / sosyal medya URL'leri */
  authorSameAs?: string[];
  authorExpertise?: string;
  authorYearsExperience?: number;
  authorIsExpert?: boolean;
  image?: string;
  keywords?: string[];
  /** articleSection: "Teknoloji", "Güvenlik" gibi — E-E-A-T topical sinyali */
  articleSection?: string;
  /** wordCount: tahmini kelime sayısı — Google içerik derinliğini değerlendirir */
  wordCount?: number;
  /** Task 13: E-E-A-T dış kaynakça (citations) — BlogPosting.citation dizisi */
  citations?: Array<{ url: string; title: string; source?: string }> | null;
  /** Okuma süresi (dakika) → `timeRequired` (ISO 8601 PT..M) — UX/Google sinyali */
  readingTimeMinutes?: number;
}) {
  const pageUrl = `${SITE_URL}${post.url}`;
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BlogPosting",
    "@id": `${pageUrl}#blogposting`,
    headline: post.title,
    description: post.description,
    abstract: post.abstract || post.description,
    url: pageUrl,
    datePublished: post.datePublished,
    // dateModified: Google Content Freshness sinyali — updated_at ile dolduruluyor
    ...(post.dateModified && { dateModified: post.dateModified }),
    ...(post.articleSection && { articleSection: post.articleSection }),
    ...(post.wordCount && post.wordCount > 0 && { wordCount: post.wordCount }),
    ...(post.readingTimeMinutes && post.readingTimeMinutes > 0 && {
      timeRequired: `PT${post.readingTimeMinutes}M`,
    }),
    ...(Array.isArray(post.keywords) && post.keywords.length > 0 && { keywords: post.keywords }),
    author: post.author
      ? {
          "@type": "Person",
          "@id": post.authorNick ? `${SITE_URL}/x/${post.authorNick}#person` : `${pageUrl}#author`,
          name: post.author,
          ...(post.authorBio && { description: post.authorBio }),
          ...(post.authorNick && { url: `${SITE_URL}/x/${post.authorNick}` }),
          // E-E-A-T: yazar sameAs — LinkedIn, GitHub gibi profiller yazar otoritesini güçlendirir
          ...(Array.isArray(post.authorSameAs) && post.authorSameAs.length > 0 && { sameAs: post.authorSameAs }),
          // E-E-A-T: yazar uzmanlık bilgileri
          ...(post.authorExpertise && { knowsAbout: post.authorExpertise }),
          ...(post.authorYearsExperience && post.authorYearsExperience > 0 && {
            "schema:knowsAbout": {
              "@type": "Thing",
              name: post.authorExpertise || "Software Development",
              description: `${post.authorYearsExperience}+ years experience`
            }
          }),
          ...(post.authorIsExpert && {
            "schema:hasOccupation": {
              "@type": "Occupation",
              name: post.authorExpertise || "Software Engineer",
              description: "Expert in the field"
            }
          }),
        }
      : undefined,
    image: post.image || DEFAULT_OG_IMAGE_URL,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${pageUrl}#webpage` },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "XipSoft Yazılım ve Teknoloji Sistemleri",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE_URL },
      sameAs: SOCIAL_PROFILES,
    },
    isPartOf: { "@id": `${SITE_URL}/blog#blog` },
    // Task 13: E-E-A-T citations — her bir dış kaynak CreativeWork olarak şemaya eklenir
    ...(Array.isArray(post.citations) && post.citations.length > 0 && {
      citation: post.citations.map((c, i) => ({
        "@type": "CreativeWork",
        "@id": `${pageUrl}#citation-${i + 1}`,
        name: c.title || c.url,
        url: c.url,
        ...(c.source ? { publisher: { "@type": "Organization", name: c.source } } : {}),
      })),
    }),
  };
}

/**
 * Blog liste sayfası (`/blog`) `Blog` koleksiyon düğümü.
 *
 * `@id` değeri `BlogPosting.isPartOf` ile aynıdır
 * (`${SITE_URL}/blog#blog`) — böylece her yazı, liste düğümüne bağlanır ve
 * JSON-LD grafiğinde kırık referans kalmaz.
 */
export function blogListSchema(opts: { name: string; description: string; url?: string }) {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Blog",
    "@id": `${SITE_URL}/blog#blog`,
    name: opts.name,
    description: opts.description,
    url: opts.url ?? `${SITE_URL}/blog`,
    inLanguage: "tr-TR",
    publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization` },
  };
}
