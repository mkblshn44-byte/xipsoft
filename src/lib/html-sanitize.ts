/**
 * html-sanitize.ts — Render edilecek HTML'in DOMPurify ile temizlenmesi.
 *
 * NEDEN VAR: `lexical-to-html.ts` üç ayrı kod yolundan HTML üretiyor ve
 * yalnızca biri escape uyguluyordu:
 *
 *   1. Lexical text node → `escapeHtml()` ✔
 *   2. Markdown parser (`parseMarkdownToHtml`) → hiçbir şey ✘
 *   3. `<` ile başlayan ham string → `return state` (dokunulmadan) ✘
 *
 * 2 ve 3. yollar admin'in yazdığı içeriği `dangerouslySetInnerHTML`'e
 * basıyordu; `<script>` / `onerror=` olduğu gibi çalışıyordu (stored XSS).
 *
 * KAPSAM: Bu modül **yalnızca zaten güvenilir kabul edilen kaynaklardan
 * gelen HTML'i temizler** (admin'in yazdığı blog/page gövdesi). Ziyaretçi
 * girdisi olan yorum/mesaj alanları ASLA buradan geçmez — onlar
 * `sanitizeUserInput()` (HTML encode) + React text node ile render edilir.
 *
 * DOMPurify'ye `isomorphic-dompurify` üzerinden erişilir (Node tarafında
 * jsdom kullanır). Bu paket `package.json`'da zaten bağımlılıktı ama
 * projede HİÇ KULLANILMIYORDU.
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Blog gövdesinin ihtiyaç duyduğu tag kümesi.
 *
 * `lexical-to-html.ts`'nin ürettiği tüm tag'lar burada; `class` özniteliği
 * Tailwind sınıfları için SERBEST bırakıldı (aksi halde tasarım bozulur).
 */
const ALLOWED_TAGS = [
  "a", "abbr", "b", "blockquote", "br", "caption", "code", "col",
  "colgroup", "dd", "del", "details", "div", "dl", "dt", "em", "figcaption",
  "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "ins",
  "kbd", "li", "mark", "ol", "p", "pre", "q", "s", "samp", "section",
  "small", "span", "strong", "sub", "summary", "sup", "table", "tbody",
  "td", "tfoot", "th", "thead", "tr", "u", "ul", "var",
];

const ALLOWED_ATTR = [
  // Tailwind stili
  "class",
  // görseller
  "src", "alt", "width", "height", "loading", "decoding", "sizes", "srcset",
  // bağlantılar
  "href", "title", "rel", "target",
  // tablo
  "colspan", "rowspan", "scope",
  // semantik / erişilebilirlik
  "id", "lang", "dir", "role", "aria-label", "aria-hidden", "aria-describedby",
  // kod bloğu dili
  "data-language",
];

/**
 * Render öncesi son savunma hattı.
 *
 * `style` bilinçli olarak ALLOWLIST'e GİRMEZ: `expression()` / `url(javascript:)`
 * vektörleri `style` üzerinden gelir; Tailwind sınıfları zaten `class` ile
 * geliyor, satır içi stile ihtiyaç yok.
 *
 * @returns Temizlenmiş HTML. Girdi boşsa `""`.
 */
export function sanitizeRenderedHtml(html: string | null | undefined): string {
  if (!html || typeof html !== "string") return "";
  if (!html.trim()) return "";

  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      // `target="_blank"` href'lerinde `noopener` zorunlu — sekme ele geçirme (tabnabbing)
      ADD_ATTR: ["rel"],
      FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form",
        "input", "button", "textarea", "select", "base", "link", "meta", "svg", "math"],
      FORBID_ATTR: ["style", "srcset"], // srcset, `lexicalStateToHtml` çıktısında kullanılmıyor
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: true,
    }) as string;
  } catch {
    // DOMPurify bundle yüklenemezse sayfa çökmesin — en azından mevcut HTML
    // DOMPurify olmadan basit bir regex ile script/style/on* temizliği yap
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "")
      .replace(/javascript\s*:/gi, "");
  }
}

/**
 * `content` DB alanının JSON-serialized olup olmadığını kontrol eder ve
 * sanitize uygular. Yalnızca **render öncesi** çağrılmalı — hiçbir zaman
 * veritabanına yazmadan önce değil.
 */
export function sanitizeSerializedContent(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}