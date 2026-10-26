/**
 * ContentTreeViews — içerik ağacı düğümlerinin ORGUN görünümü/metadata'sı.
 *
 * NEDEN AYRI DOSYA? Aynı `pages` düğümünü iki rota sunuyor:
 *   • kök catch-all `/[locale]/[...slug]`          → normal ağaç yolları
 *   • `/hizmetler/[...slug]`                       → hizmet/konum zinciri
 *     çözümsüz kaldığında (Kırık Link → Sayfa Aç) buraya düşer.
 *
 * Görünüm ve metadata tek kaynakta dursun diye buraya alındı; iki rotada
 * kopyalanırsa bir tarafın SEO çıktısı sessizce sapar (canonical/robots/
 * description farkı = GSC'de çift sinyal).
 */
import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo-helpers";
import JsonLd from "@/components/seo/JsonLd";
import { sanitizeRenderedHtml } from "@/lib/html-sanitize";
import {
  canonicalPathForNode,
  type ContentTreeResult,
  type ContentTreeNode,
} from "@/lib/content-tree";
import MarkdownContent from "@/components/Common/MarkdownContent/MarkdownContent";

function nodeDescription(node: ContentTreeNode): string {
  const direct = node.metaDescription?.trim();
  if (direct) return direct;
  const markdown = node.markdownContent?.trim();
  if (markdown) return markdown.replace(/[#*_>`]/g, "").slice(0, 158).trim();
  return `${node.title} — XipSoft`;
}

/**
 * Ağaç düğümünün metadata'sı. `hizmetler/[...slug]` fallback'inde de
 * kullanılır: kırık adres yayına alındığında sayfa DOĞRU canonical/robots ile
 * açılmalı, aksi halde rota `noindex` iskeleti basar ve yayın boşa gider.
 */
export function buildContentTreeMetadata(node: ContentTreeNode): Metadata {
  return buildPageMetadata({
    title: node.metaTitle?.trim() || node.title,
    description: nodeDescription(node),
    canonicalPath: canonicalPathForNode(node),
    titleAbsolute: Boolean(node.metaTitle?.includes("|")),
    indexable: node.isIndexable,
    robotsOverride: node.robots,
    image: node.ogImageUrl ?? undefined,
    imageAlt: node.title,
  });
}

export function CategoryView({
  node,
  childNodes,
}: {
  node: ContentTreeNode;
  childNodes: ContentTreeNode[];
}) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
        {node.h1Title?.trim() || node.title}
      </h1>
      {node.renderedHtml || node.markdownContent ? (
        <div className="prose prose-invert max-w-none mb-10">
          {node.renderedHtml ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizeRenderedHtml(node.renderedHtml) }} />
          ) : (
            <MarkdownContent content={node.markdownContent ?? ""} />
          )}
        </div>
      ) : null}

      {childNodes.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
          {childNodes.map((child) => (
            <li key={child.id}>
              <Link
                href={canonicalPathForNode(child)}
                className="group block h-full p-5 rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors leading-snug mb-2">
                  {child.title}
                </p>
                {child.metaDescription ? (
                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                    {child.metaDescription}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">Bu kategoride henüz yayınlanmış sayfa yok.</p>
      )}
    </section>
  );
}

export function PageView({ node }: { node: ContentTreeNode }) {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-8">
        {node.h1Title?.trim() || node.title}
      </h1>
      {node.renderedHtml ? (
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeRenderedHtml(node.renderedHtml) }}
        />
      ) : node.markdownContent ? (
        <div className="prose prose-invert max-w-none">
          <MarkdownContent content={node.markdownContent} />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Bu sayfanın içeriği henüz girilmemiş.</p>
      )}
    </article>
  );
}

/**
 * Çözülmüş düğümü render eder (kategori → çocuk listesi, sayfa → içerik).
 *
 * `pages.schema_markup` doluysa JSON-LD olarak burada basılır: şema verisi DB
 * odaklıdır, koda sayfa türüne göre gömülmez (Talimat §2 Structured Data).
 */
export function renderContentTree(result: ContentTreeResult): ReactElement {
  const { node, children } = result;
  return (
    <>
      <JsonLd schemas={node.schemaMarkup ?? []} id={`tree-${node.id}`} />
      {node.nodeType === "category" ? (
        <CategoryView node={node} childNodes={children} />
      ) : (
        <PageView node={node} />
      )}
    </>
  );
}
