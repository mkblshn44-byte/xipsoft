/**
 * Blog Detay Sayfası — /blog/[slug]
 * Kaynak: DB (Blog_posts tablosu)
 *
 * Sunucu gövdesi `BlogDetailServer`'a, veri + metadata ise `blog-post-page`
 * katmanına taşındı (MIMARI.md — tek şablon).
 */

import { FC } from "react";
import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  buildBlogPostMetadata,
  getDbBlogBySlug,
  normalizeBlogSlug,
  resolvePublishedBlogPost,
} from "@/lib/blog-post-page";
import BlogDetailServer from "@/app/[locale]/(site)/blog/post/BlogDetailServer";

export const revalidate = 300;

// ÖNEMLİ (Vercel 500 hatası): Boş `generateStaticParams()` döndürmek Next.js 15
// + Vercel ortamında on-demand ISR üretimini 500 "Internal Server Error" ile
// çökertiyor (yerelde `next build && next start` çalışsa bile). İlgili hatalar:
//   - https://github.com/vercel/next.js/discussions/85166
//   - https://github.com/vercel/next.js/discussions/81155
// Bu yüzden boş `generateStaticParams`/`dynamicParams` kaldırıldı; rota
// Blog verisi unstable_cache + Redis ile önbelleklenir.

type TBlogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: TBlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = normalizeBlogSlug(slug) ?? slug;

  const dbBlog = await getDbBlogBySlug(normalizedSlug);
  if (!dbBlog) {
    return { title: "Blog Yazısı Bulunamadı", robots: { index: false, follow: false } };
  }

  return buildBlogPostMetadata(dbBlog, { canonicalPath: `/blog/${normalizedSlug}` });
}

// ── Ana Sayfa Bileşeni ────────────────────────────────────────────────────────

function BlogUnavailableState() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <div className="rounded-2xl border border-neon/30 bg-neon/5 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-neon-300 mb-3">Blog geçici olarak kapalı</p>
        <h1 className="text-3xl font-bold text-white mb-3">İçerik veritabanı bağlantısı aktif değil.</h1>
        <p className="text-zinc-300 leading-relaxed">
          Vercel ortam değişkenlerinde DATABASE_URL tanımlı değilse blog içeriği yüklenmez. Bu sorunu çözdükten sonra içerikler otomatik olarak görünecektir.
        </p>
      </div>
    </div>
  );
}

const BlogDetailPage: FC<TBlogDetailPageProps> = async (props) => {
  const { slug } = await props.params;
  const normalizedSlug = normalizeBlogSlug(slug) ?? slug;

  if (!process.env.DATABASE_URL) {
    return <BlogUnavailableState />;
  }

  const dbBlog = await getDbBlogBySlug(normalizedSlug);

  // DB'de yoksa gerçek 404 döndür — google soft 404 algılamasın.
  // Ancak sonunda "-<sayı>" taşıyan eski URL'ler aslında mevcut bir yazının
  // varyantıdır (ör. "konu-1" → "konu-1776...-3251"). Bunları 301 ile kanonik
  // yazıya yönlendirerek GSC'deki 404'leri "Yönlendirmeli sayfa"ya çeviriyoruz.
  if (!dbBlog) {
    const resolved = await resolvePublishedBlogPost(normalizedSlug);
    if (resolved && resolved.slug !== normalizedSlug) {
      permanentRedirect(`/blog/${resolved.slug}`);
    }
    notFound();
  }

  return <BlogDetailServer row={dbBlog} canonicalPath={`/blog/${normalizedSlug}`} />;
};

export default BlogDetailPage;
