/**
 * Blog Bileşenleri ve Şablonları Ortak Tipleri
 */

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

export type AdjacentPosts = {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
};
