/**
 * Blog liste kartı verisi.
 *
 * `title`, `date`, `slug` opsiyoneldir: veri DB'den gelir. DB yoksa veya
 * kayıt bulunamazsa bu alanlar boş kalır — kart tasarımı (şablon) yine de
 * render edilir, yalnızca metinler görünmez.
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
  coverImageURL?: string | null;
  /** Kapak görseli alt metni (SEO/erişilebilirlik) */
  coverImageAlt?: string | null;
  /** Yazı etiketleri — kart üzerinde rozet olarak gösterilir */
  tags?: string[];
};
