/**
 * Blog liste öğeleri — ortak tip + dönüşüm.
 *
 * `mapPostToBlogItem` hem sunucu sayfasında (`blog/page.tsx`, ISR ilk veri)
 * hem de istemci bileşeninde (`BlogPageClient`, "Daha Fazla" yüklemesi)
 * kullanılır. Bu yüzden bu modül `pg` gibi sunucu-only bir bağımlılık
 * İÇERMEZ; `import type` ile yalnızca tip çeker, tarayıcı bundle'ına kod
 * sızdırmaz.
 */

import type { BlogPost } from "@/types/blog";

/** Liste kartının ihtiyaç duyduğu hafif blog öğesi. */
export type BlogItem = {
  _id: string;
  title?: string;
  description?: string;
  date?: string;
  slug?: string;
  source?: "static" | "firestore";
  authorName?: string;
  authorPhotoURL?: string;
  /** Kapak görseli — Cloudinary/CDN URL'i (opsiyonel) */
  coverImage?: string | null;
  coverImageURL?: string | null;
  /** Kapak görseli alt metni (SEO/erişilebilirlik) */
  coverImageAlt?: string | null;
  /** Kategori bilgisi (etiketlerden ilki veya özel alan) */
  category?: string;
  /** Görüntülenme sayısı */
  views?: number;
  /** Yazı etiketleri — kart üzerinde rozet olarak gösterilir */
  tags?: string[];
};

/**
 * DB satırını (BlogPost) liste kartı verisine çevirir. Satır içi kopya
 * `blog/page.tsx` ve `BlogPageClient.tsx`'te tekrar etmesin diye tek yer.
 */
export function mapPostToBlogItem(post: BlogPost): BlogItem {
  const withViews = post as BlogPost & {
    viewCount?: number | null;
    views?: number | null;
  };

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
    views: withViews.viewCount ?? withViews.views ?? 0,
    tags: post.tags ?? [],
  };
}
