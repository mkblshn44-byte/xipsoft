import type { SerializedEditorState, SerializedLexicalNode, SerializedTextNode } from "lexical";
import { sanitizeRenderedHtml } from "@/lib/html-sanitize";

interface LexicalNode extends SerializedLexicalNode {
  type: string;
  children?: LexicalNode[];
  content?: LexicalNode[];
  text?: string;
  format?: number;
  style?: string;
  mode?: string;
  tag?: string;
  url?: string;
  rel?: string;
  target?: string;
  indent?: number;
  direction?: string;
  alignment?: string;
  listType?: string;
  start?: number;
  checked?: boolean;
  language?: string;
  caption?: string;
  src?: string;
  altText?: string;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  showCaption?: boolean;
  srcPlatforms?: string;
  id?: string;
  className?: string;
  attrs?: Record<string, any>;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

function escapeHtml(text: string): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function applyTextFormat(format: number | undefined, text: string): string {
  if (!format || format === 0) return escapeHtml(text);
  let result = escapeHtml(text);
  if (format & 1) result = `<strong class="font-semibold text-white">${result}</strong>`;
  if (format & 2) result = `<em>${result}</em>`;
  if (format & 8) result = `<u>${result}</u>`;
  if (format & 16) result = `<code class="px-1.5 py-0.5 rounded bg-white/[0.08] text-amber-300 font-mono text-xs">${result}</code>`;
  if (format & 32) result = `<sub>${result}</sub>`;
  if (format & 64) result = `<sup>${result}</sup>`;
  return result;
}

/** Blog gövdesindeki paragraf sınıfı — iki üretim yolu da BUNU kullanır. */
const PARAGRAPH_CLASS = "text-zinc-300 text-base sm:text-lg leading-relaxed mb-6";

/** Bu eşiğin altındaki blok bölünmez (kısa paragraflara dokunulmaz). */
const FLAT_BLOCK_MIN_CHARS = 700;
/** Bölünen blokta tek paragraf için hedef uzunluk. */
const FLAT_BLOCK_TARGET_CHARS = 450;

/**
 * Aralarında boş satır OLMAYAN uzun metni cümle sonlarından paragraflara böler.
 *
 * NEDEN? AI üretimi yazılar tek bir Lexical paragrafı (4-5 bin karakter, hiç
 * `\n\n` yok) olarak kaydedilebiliyor. Bölünmezse sayfa boşluksuz bir metin
 * duvarı oluyor — okunabilirlik ve tarama davranışı ciddi düşüyor.
 * Cümle sonundan kestiği için anlam bütünlüğü korunur.
 */
function splitFlatBlock(text: string): string[] {
  if (text.length < FLAT_BLOCK_MIN_CHARS) return [text];
  const sentences = text.match(/[^.!?…]+(?:[.!?…]+["')\]]?\s+|$)/g);
  if (!sentences || sentences.length < 3) return [text];

  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > FLAT_BLOCK_TARGET_CHARS) {
      parts.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) parts.push(current.trim());
  return parts.length > 1 ? parts : [text];
}

function parseMarkdownToHtml(md: string): string {
  if (!md) return "";
  let html = md;

  // Convert markdown headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-zinc-100 mt-8 mb-3 pt-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-zinc-100 mt-10 mb-4 pt-2 border-b border-white/[0.04] pb-2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-zinc-100 mt-10 mb-4">$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-white">$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gim, '<pre class="my-6 p-4 rounded-xl bg-black/50 border border-white/[0.08] overflow-x-auto font-mono text-sm text-zinc-200 leading-relaxed"><code>$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/gim, '<code class="px-1.5 py-0.5 rounded bg-white/[0.08] text-amber-300 font-mono text-xs">$1</code>');

  // Unordered list items
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-5 list-disc text-zinc-300 mb-2 leading-relaxed">$1</li>');

  // Split into paragraphs with clean spacing
  const rawParagraphs = html.split(/(?:\r?\n){2,}/);
  return rawParagraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<li") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<table")
      ) {
        return trimmed;
      }
      return splitFlatBlock(trimmed)
        .map((part) => `<p class="${PARAGRAPH_CLASS}">${part.replace(/\r?\n/g, "<br/>")}</p>`)
        .join("\n\n");
    })
    .join("\n\n");
}

function renderNode(node: LexicalNode): string {
  if (!node) return "";

  // 1. Text node
  if (node.type === "text") {
    const rawText = node.text ?? "";
    
    // If text contains multiple paragraphs separated by \n\n, format them with markdown parser
    if (rawText.includes("\n\n") || rawText.includes("\r\n\r\n")) {
      return parseMarkdownToHtml(rawText);
    }

    const textNode = node as SerializedTextNode;
    let res = (node as any).marks
      ? escapeHtml(textNode.text ?? "")
      : applyTextFormat(textNode.format, textNode.text ?? "");

    if ((node as any).marks && Array.isArray((node as any).marks)) {
      for (const mark of (node as any).marks) {
        if (mark.type === "bold" || mark.type === "strong") res = `<strong class="font-semibold text-white">${res}</strong>`;
        if (mark.type === "italic" || mark.type === "em") res = `<em>${res}</em>`;
        if (mark.type === "code") res = `<code class="px-1.5 py-0.5 rounded bg-white/[0.08] text-amber-300 font-mono text-xs">${res}</code>`;
        if (mark.type === "link") {
          const href = escapeHtml(mark.attrs?.href || "#");
          res = `<a href="${href}" class="text-cyan-400 underline hover:text-white" target="_blank" rel="noopener noreferrer">${res}</a>`;
        }
      }
    }
    return res;
  }

  const childNodes: LexicalNode[] = node.children ?? node.content ?? [];
  
  // If paragraph contains single text node with newlines
  if (node.type === "paragraph" && childNodes.length === 1) {
    const firstChild = childNodes[0];
    if (firstChild && firstChild.type === "text" && !(firstChild as any).marks) {
      const txt = firstChild.text ?? "";
      if (txt.includes("\n\n") || txt.includes("\r\n\r\n")) {
        return parseMarkdownToHtml(txt);
      }
      // Tek blok hâlinde gelen uzun metin: cümle sonlarından paragraflara böl.
      const flat = splitFlatBlock(txt);
      if (flat.length > 1) {
        const attrs = buildAttrs(node);
        const format = (firstChild as SerializedTextNode).format;
        return flat
          .map((part) => `<p class="${PARAGRAPH_CLASS}"${attrs}>${applyTextFormat(format, part)}</p>`)
          .join("\n\n");
      }
    }
  }

  const children = childNodes.map(renderNode).join("");

  switch (node.type) {
    case "linebreak":
      return "<br />";

    case "paragraph": {
      const attrs = buildAttrs(node);
      return `<p class="${PARAGRAPH_CLASS}"${attrs}>${children || "<br/>"}</p>`;
    }

    case "heading": {
      const level = (node as any).attrs?.level ?? (node as any).tag?.replace("h", "") ?? 2;
      const sizeClass = level === 1 ? "text-3xl" : level === 2 ? "text-2xl" : "text-xl";
      return `<h${level} class="${sizeClass} font-bold text-zinc-100 mt-10 mb-4 pt-2 border-b border-white/[0.04] pb-2">${children}</h${level}>`;
    }

    case "bulletList":
    case "list": {
      const listType = (node as any).listType ?? (node as any).type === "bulletList" ? "bullet" : "number";
      const tag = listType === "number" || (node as any).type === "orderedList" ? "ol" : "ul";
      const listClass = tag === "ol" ? "list-decimal" : "list-disc";
      return `<${tag} class="space-y-2 mb-6 ml-5 ${listClass} text-zinc-300">${children}</${tag}>`;
    }

    case "orderedList":
      return `<ol class="space-y-2 mb-6 ml-5 list-decimal text-zinc-300">${children}</ol>`;

    case "listItem":
    case "listitem":
      return `<li class="leading-relaxed mb-2">${children}</li>`;

    case "quote":
    case "blockquote":
      return `<blockquote class="border-l-2 border-purple-500/60 pl-4 py-2 my-6 text-zinc-300 italic bg-white/[0.02] rounded-r-xl leading-relaxed">${children}</blockquote>`;

    case "codeBlock":
    case "code": {
      const language = (node as any).attrs?.language ?? (node as any).language ?? "";
      const langAttr = language ? ` class="language-${escapeHtml(language)}"` : "";
      return `<pre class="my-6 p-4 rounded-xl bg-black/50 border border-white/[0.08] overflow-x-auto font-mono text-sm text-zinc-200 leading-relaxed"><code${langAttr}>${children}</code></pre>`;
    }

    case "horizontalrule":
    case "horizontalRule":
      return '<hr class="my-8 border-white/[0.08]" />';

    case "link": {
      const url = (node as any).url ?? (node as any).attrs?.href ?? "#";
      const rel = (node as any).rel ? ` rel="${(node as any).rel}"` : ' rel="noopener noreferrer"';
      const target = (node as any).target ? ` target="${(node as any).target}"` : ' target="_blank"';
      return `<a href="${escapeHtml(url)}"${rel}${target} class="text-cyan-400 underline hover:text-white">${children}</a>`;
    }

    case "image": {
      const src = (node as any).src ?? (node as any).attrs?.src ?? "";
      const altText = (node as any).altText ?? (node as any).attrs?.alt ?? "";
      let imgAttrs = ` src="${escapeHtml(src)}" alt="${escapeHtml(altText)}" class="rounded-xl my-6 w-full max-h-[500px] object-cover"`;
      return `<figure><img${imgAttrs} /></figure>`;
    }

    default:
      return children;
  }
}

function buildAttrs(node: LexicalNode): string {
  const attrs: string[] = [];
  if ((node as any).indent) {
    attrs.push(` style="padding-left: ${(node as any).indent * 20}px"`);
  }
  if ((node as any).direction && (node as any).direction !== "ltr") {
    attrs.push(` dir="${(node as any).direction}"`);
  }
  if ((node as any).alignment) {
    attrs.push(` style="text-align: ${(node as any).alignment}"`);
  }
  return attrs.join("");
}

/**
 * Lexical / TipTap durumundan HTML üretir.
 *
 * ⚠ GÜVENLİK: Dönen HTML `dangerouslySetInnerHTML` ile basıldığı için
 * ÜRETİLEN HER YOL DOMPurify'den geçirilir (`sanitizeRenderedHtml`).
 * Markdown ve ham-string yolları daha önce hiçbir şey kaçırmıyordu;
 * bkz. `src/lib/html-sanitize.ts` içindeki açıklama.
 */
export function lexicalStateToHtml(state: any): string {
  return sanitizeRenderedHtml(renderContentToHtml(state));
}

/** `lexicalStateToHtml`'in sanitize EDİLMEMİŞ çalışma gövdesi. */
function renderContentToHtml(state: any): string {
  if (!state) return "";

  // String format (JSON string or Markdown or HTML)
  if (typeof state === "string") {
    const trimmed = state.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return renderContentToHtml(parsed);
      } catch {
        return parseMarkdownToHtml(state);
      }
    }
    if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
      return state;
    }
    return parseMarkdownToHtml(state);
  }

  // Object format
  if (typeof state === "object") {
    // 1. TipTap / ProseMirror: { type: "doc", content: [...] }
    if (state.type === "doc" && Array.isArray(state.content)) {
      return state.content.map(renderNode).join("");
    }

    // 2. Lexical format: { root: { children: [...] } }
    if (state.root && Array.isArray(state.root.children)) {
      return state.root.children.map(renderNode).join("");
    }

    // 3. Simple text: { text: "..." }
    if (typeof state.text === "string") {
      return parseMarkdownToHtml(state.text);
    }

    // 4. Array of nodes
    if (Array.isArray(state)) {
      return state.map(renderNode).join("");
    }
  }

  return "";
}

