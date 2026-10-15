"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
  getBlogPostBySlugAction,
  getBlogAdjacentPostsAction,
} from "@/app/_actions/blog-actions";
import type { BlogPost } from "@/types/blog";
import type { ServicePageData } from "@/lib/database";
import {
  BlogHeader,
  BlogLoadingSkeleton,
  BlogNotFound,
  BlogActions,
} from "./components";
import type { AdjacentPosts } from "./components";
import RelatedPosts from "@/components/Blog/RelatedPosts";
import RelatedServices from "@/components/Blog/RelatedServices";
import { normalizeBlogSlug } from "@/lib/blog-slug";
import { estimateReadingMinutes } from "@/lib/blog-content";

// Okuma süresi tek kaynaktan (blog/content.ts) — schema.timeRequired ile birebir aynı.
const calculateReadingTime = (content: unknown): number => estimateReadingMinutes(content);

interface BlogPostInnerProps {
  slug?: string;
  initialData?: any;
  initialAdjacent?: AdjacentPosts;
  initialRelated?: BlogPost[];
  initialServices?: ServicePageData[];
}

function BlogPostInner({ slug: slugProp, initialData, initialAdjacent, initialRelated, initialServices }: BlogPostInnerProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isModerator = false;

  const slug =
    slugProp ||
    searchParams.get("slug") ||
    (pathname.startsWith("/blog/")
      ? pathname.slice("/blog/".length).split("?")[0]
      : null);

  const normalizedSlug = normalizeBlogSlug(slug);

  const hydratePost = (raw: any): BlogPost => ({
    ...raw,
    createdAt: new Date(raw.createdAt || raw.created_at),
    updatedAt: new Date(raw.updatedAt || raw.updated_at),
    publishedAt: raw.publishedAt
      ? new Date(raw.publishedAt)
      : raw.published_at
      ? new Date(raw.published_at)
      : null,
  });

  const [post, setPost] = useState<BlogPost | null>(() => {
    if (initialData) return hydratePost(initialData);
    return null;
  });
  const [loading, setLoading] = useState(!initialData);
  const [notFound, setNotFound] = useState(false);
  const [adjacent, setAdjacent] = useState<AdjacentPosts>(
    initialAdjacent ?? { prev: null, next: null }
  );

  useEffect(() => {
    if (!normalizedSlug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (initialData) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [data, adj] = await Promise.all([
          getBlogPostBySlugAction(normalizedSlug),
          getBlogAdjacentPostsAction(normalizedSlug),
        ]);
        if (cancelled) return;
        if (data) {
          setPost(data);
          setAdjacent(adj);
        } else {
          setNotFound(true);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedSlug, initialData]);

  if (loading) {
    return <BlogLoadingSkeleton />;
  }

  if (notFound || !post) {
    return <BlogNotFound />;
  }

  const formattedDate = post.publishedAt
    ? post.publishedAt.toLocaleDateString("tr-TR", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : post.createdAt.toLocaleDateString("tr-TR", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  const readTime = calculateReadingTime(post.content);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: post.title,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 relative Blog-post-page">
      <article className="max-w-4xl mx-auto relative z-10">
        <BlogHeader
          post={post}
          isModerator={isModerator}
          formattedDate={formattedDate}
          readTime={readTime}
          onShare={handleShare}
        />
        
        {/* Paylaşım Butonları ve Önceki / Sonraki Konu Kartları */}
        <BlogActions
          post={post}
          normalizedSlug={normalizedSlug!}
          adjacent={adjacent}
        />

        {/* İlgili Yazılar (Task 7 & GSC İç Bağlantı Onarımı) */}
        <RelatedPosts
          currentSlug={normalizedSlug!}
          tags={post.tags ?? []}
          limit={3}
          initialPosts={initialRelated}
        />

        {/* İlgili Hizmetler (Task 7) — NeonDB'den SSR iç linkleme */}
        <RelatedServices services={initialServices ?? []} tags={post.tags ?? []} limit={3} />
      </article>
    </div>
  );
}

export default function BlogPostClient({
  slug,
  initialData,
  initialAdjacent,
  initialRelated,
  initialServices,
}: {
  slug?: string;
  initialData?: any;
  initialAdjacent?: AdjacentPosts;
  initialRelated?: BlogPost[];
  initialServices?: ServicePageData[];
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
              style={{
                borderTopColor: "#a78bfa",
                borderRightColor: "#ddd6fe",
              }}
            />
          </div>
        </div>
      }
    >
      <BlogPostInner
        slug={slug}
        initialData={initialData}
        initialAdjacent={initialAdjacent}
        initialRelated={initialRelated}
        initialServices={initialServices}
      />
    </Suspense>
  );
}
