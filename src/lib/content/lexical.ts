/**
 * Lexical SerializedEditorState üreticisi.
 *
 * Bot'tan gelen düz metin / HTML'i Lexical'ın beklediği JSON formatına dönüştürür.
 * lexicalStateToHtml() { root: { type:"root", children:[...], ... } } formatını bekler.
 * Her paragraf ayrı bir "paragraph" node'u olarak eklenir.
 */

interface LexicalTextNode {
  type: "text";
  version: 1;
  text: string;
  format: 0;
  mode: "normal";
  style: "";
  detail: 0;
}

interface LexicalParagraphNode {
  type: "paragraph";
  version: 1;
  children: LexicalTextNode[];
  direction: "ltr";
  format: "";
  indent: 0;
  textFormat: 0;
  textStyle: "";
}

interface LexicalRoot {
  type: "root";
  version: 1;
  children: LexicalParagraphNode[];
  direction: "ltr";
  format: "";
  indent: 0;
}

interface LexicalEditorState {
  root: LexicalRoot;
}

/**
 * Düz metin veya HTML string'ini Lexical SerializedEditorState'e çevirir.
 * HTML tag'leri soyulur, paragraflar boş satırlara göre bölünür.
 */
export function buildLexicalState(rawContent: string): LexicalEditorState {
  // HTML tag'lerini soy, HTML entity'lerini decode et
  const plainText = rawContent
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();

  // Paragrafları boş satırlara (veya tek satır sonuna) göre böl, boş olanları at
  const paragraphs = plainText
    .split(/\n{2,}/)
    .flatMap((block) => block.split("\n"))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // En az bir paragraf olsun
  const lines = paragraphs.length > 0 ? paragraphs : [""];

  const children: LexicalParagraphNode[] = lines.map((line) => ({
    type: "paragraph",
    version: 1,
    direction: "ltr",
    format: "",
    indent: 0,
    textFormat: 0,
    textStyle: "",
    children: [
      {
        type: "text",
        version: 1,
        text: line,
        format: 0,
        mode: "normal",
        style: "",
        detail: 0,
      },
    ],
  }));

  return {
    root: {
      type: "root",
      version: 1,
      direction: "ltr",
      format: "",
      indent: 0,
      children,
    },
  };
}
