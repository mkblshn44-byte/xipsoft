/**
 * ContentTreeViews — içerik ağacı düğümlerinin ORGUN görünümü/metadata'sı.
 *
 * The root catch-all is the single route for content-tree pages. Services use
 * their shared content renderer from that route; all other nodes use these
 * views and metadata.
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
import { ContactLeadForm } from "@/app/[locale]/(site)/contact-us/ContactPageClient";
import { getAllReferences } from "@/lib/db/references";

function nodeDescription(node: ContentTreeNode): string {
  const direct = node.metaDescription?.trim();
  if (direct) return direct;
  const markdown = node.markdownContent?.trim();
  if (markdown) return markdown.replace(/[#*_>`]/g, "").slice(0, 158).trim();
  return `${node.title} — XipSoft`;
}

/**
 * A content-tree node's metadata. A published tree page keeps its canonical,
 * robots, and description consistent with the URL resolved by the catch-all.
 */
export function buildContentTreeMetadata(node: ContentTreeNode): Metadata {
  return buildPageMetadata({
    title: node.metaTitle?.trim() || node.title,
    description: nodeDescription(node),
    canonicalPath: canonicalPathForNode(node),
    // DB iki yolla mutlak başlık söyleyebilir: açık kolon (`title_absolute`) ya da
    // meta_title'ına zaten tam marka suffix'i yazılmış olması.
    titleAbsolute: node.titleAbsolute || Boolean(node.metaTitle?.includes("|")),
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
  const faqs = node.i18n?.tr?.faqs ?? [];
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
      {node.fullPath === "contact-us" ? (
        <div className="mt-12">
          <ContactLeadForm />
        </div>
      ) : null}
      {faqs.length > 0 ? (
        <section className="mt-12 space-y-6" aria-labelledby="page-faq-title">
          <h2 id="page-faq-title" className="text-2xl font-bold text-zinc-100">
            Sıkça Sorulan Sorular
          </h2>
          {faqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="font-semibold text-zinc-200">{faq.question}</h3>
              <p className="mt-2 text-zinc-400">{faq.answer}</p>
            </div>
          ))}
        </section>
      ) : null}
    </article>
  );
}

/**
 * Çözülmüş düğümü render eder (kategori → çocuk listesi, sayfa → içerik).
 *
 * `pages.schema_markup` doluysa JSON-LD olarak burada basılır: şema verisi DB
 * odaklıdır, koda sayfa türüne göre gömülmez (Talimat §2 Structured Data).
 */
export async function renderContentTree(result: ContentTreeResult): Promise<ReactElement> {
  const { node, children } = result;
  const references = node.fullPath === "references" ? await getAllReferences(true) : [];
  return (
    <>
      <JsonLd schemas={node.schemaMarkup ?? []} id={`tree-${node.id}`} />
      {node.nodeType === "category" ? (
        <CategoryView node={node} childNodes={children} />
      ) : (
        <>
          <PageView node={node} />
          {references.length > 0 ? (
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16" aria-label="Projelerimiz">
              <ul className="grid gap-4 sm:grid-cols-2">
                {references.map((reference) => (
                  <li
                    key={reference.id}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
                  >
                    <h2 className="font-semibold text-zinc-100">
                      {reference.client_name || reference.title}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">{reference.category}</p>
                    {reference.description ? (
                      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                        {reference.description}
                      </p>
                    ) : null}
                    {reference.project_url || reference.client_website ? (
                      <a
                        href={reference.project_url || reference.client_website || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-block text-sm text-cyan-300 hover:text-cyan-200"
                      >
                        Projeyi Görüntüle
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
