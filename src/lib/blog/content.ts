/**
 * blog/content.ts — Blog içeriğinden düz metin çıkarma yardımcıları.
 *
 * Not: İnce içerik artık noindex'e ÇEKİLMEZ ve sitemap'ten DIŞLANMAZ.
 * Yayınlanmış tüm blog yazıları indexlenir + sitemap'e girer.
 * `estimateBlogWordCount` yalnızca schema `wordCount` sinyali için kullanılır.
 */

export function extractBlogText(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(extractBlogText).join(" ");

  if (typeof content !== "object") return "";
  const node = content as {
    text?: unknown;
    root?: unknown;
    children?: unknown;
    content?: unknown;
  };

  if (typeof node.text === "string") return node.text;
  if (node.root) return extractBlogText(node.root);
  if (Array.isArray(node.children)) return node.children.map(extractBlogText).join(" ");
  if (Array.isArray(node.content)) return node.content.map(extractBlogText).join(" ");

  return "";
}

export function estimateBlogWordCount(content: unknown): number {
  const text = extractBlogText(content);
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/** Kelime başına dakika — arayüz (`readTime`) ile `schema.timeRequired` aynı kaynağı kullanır. */
export function estimateReadingMinutes(content: unknown, wordsPerMinute = 200): number {
  const words = estimateBlogWordCount(content);
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// ── FAQPage çıkarımı ──────────────────────────────────────────────────────────

interface LexicalNode {
  type?: string;
  tag?: string;
  text?: string;
  children?: LexicalNode[];
  root?: LexicalNode;
}

function flattenTopLevel(content: unknown): LexicalNode[] {
  if (!content) return [];
  if (Array.isArray(content)) return content as LexicalNode[];
  if (typeof content !== "object") return [];
  const node = content as LexicalNode;
  if (node.root) return flattenTopLevel(node.root);
  if (Array.isArray(node.children)) return node.children;
  return [node];
}

function isHeading(node: LexicalNode): boolean {
  return typeof node.type === "string" && node.type.toLowerCase().includes("heading");
}

/**
 * Yazının içinden SSS çiftlerini çıkarır (FAQPage JSON-LD için).
 *
 * Kural: `?` ile biten başlıklar soru, onu izleyen (bir sonraki başlığa kadar
 * gelen) paragraf/lite metin cevaptır. Başlıksız/cevapsız çiftler atlanır;
 * en fazla `limit` çift döner (Google FAQPage için yeterli sinyal).
 */
export function extractBlogFaqs(
  content: unknown,
  limit = 6,
): Array<{ question: string; answer: string }> {
  const nodes = flattenTopLevel(content);
  const faqs: Array<{ question: string; answer: string }> = [];

  for (let i = 0; i < nodes.length && faqs.length < limit; i++) {
    const node = nodes[i];
    if (!node || !isHeading(node)) continue;

    const question = extractBlogText(node).trim();
    if (!question.endsWith("?")) continue;

    const answerParts: string[] = [];
    let end = i + 1;
    for (let j = i + 1; j < nodes.length; j++) {
      const next = nodes[j];
      if (!next) break;
      if (isHeading(next)) break;
      const text = extractBlogText(next).trim();
      if (text) answerParts.push(text);
      end = j;
    }
    const answer = answerParts.join(" ").trim();
    if (answer.length >= 40) {
      faqs.push({ question, answer });
      i = end; // cevap düğümlerini tekrar tarama
    }
  }

  return faqs;
}
