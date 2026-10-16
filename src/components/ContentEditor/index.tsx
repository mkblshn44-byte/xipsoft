"use client";

import { useCallback, useEffect, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode, QuoteNode, $isHeadingNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { $getRoot, $createParagraphNode, $createTextNode, EditorState, type SerializedEditorState, $isElementNode } from "lexical";
import { FORMAT_TEXT_COMMAND, UNDO_COMMAND, REDO_COMMAND } from "lexical";
import { AlertTriangle, X } from "lucide-react";
import {
  Bold, Italic, Underline, Code, List, ListOrdered,
  Heading2, Heading3, Quote, Undo, Redo, Link,
} from "lucide-react";
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $getSelection, $isRangeSelection } from "lexical";
import { cn } from "@/utils";

export { type SerializedEditorState };

interface ContentEditorProps {
  value: SerializedEditorState | null;
  onChange: (state: SerializedEditorState) => void;
  placeholder?: string;
}

// ── Tema ──────────────────────────────────────────────────────────────────────

const editorTheme = {
  root: "lexical-root",
  paragraph: "lexical-paragraph",
  heading: {
    h1: "lexical-h1",
    h2: "lexical-h2",
    h3: "lexical-h3",
  },
  list: {
    ul: "lexical-ul",
    ol: "lexical-ol",
    listitem: "lexical-li",
  },
  quote: "lexical-quote",
  code: "lexical-code",
  link: "lexical-link",
  text: {
    bold: "lexical-bold",
    italic: "lexical-italic",
    underline: "lexical-underline",
    code: "lexical-text-code",
    strikethrough: "lexical-strikethrough",
  },
};

// ── Başlangıç state yükleyici ─────────────────────────────────────────────────

function LoadInitialPlugin({ value }: { value: SerializedEditorState | null }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!value) return;
    try {
      const editorState = editor.parseEditorState(value as any);
      // Boş root kontrolü
      if (editorState.isEmpty()) return;
      editor.setEditorState(editorState);
    } catch {
      // Geçersiz state — yoksay
    }
    // Sadece ilk mount'ta çalışsın
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ── Araç çubuğu ───────────────────────────────────────────────────────────────

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const formatHeading = useCallback(
    (level: "h2" | "h3") => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(level));
        }
      });
    },
    [editor]
  );

  const formatQuote = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  }, [editor]);

  const btn = (
    onClick: () => void,
    icon: React.ReactNode,
    title: string
  ) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // focus kaybını önle
        onClick();
      }}
      title={title}
      aria-label={title}
      className={cn(
        "p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08]",
        "transition-all duration-150"
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-white/[0.06]">
      {btn(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"), <Bold className="w-3.5 h-3.5" />, "Kalın (Ctrl+B)")}
      {btn(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"), <Italic className="w-3.5 h-3.5" />, "İtalik (Ctrl+I)")}
      {btn(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline"), <Underline className="w-3.5 h-3.5" />, "Altı çizili (Ctrl+U)")}
      {btn(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code"), <Code className="w-3.5 h-3.5" />, "Satır içi kod")}

      <div className="w-px h-4 bg-white/[0.08] mx-1" />

      {btn(() => formatHeading("h2"), <Heading2 className="w-3.5 h-3.5" />, "Başlık 2")}
      {btn(() => formatHeading("h3"), <Heading3 className="w-3.5 h-3.5" />, "Başlık 3")}
      {btn(formatQuote, <Quote className="w-3.5 h-3.5" />, "Alıntı")}

      <div className="w-px h-4 bg-white/[0.08] mx-1" />

      {btn(
        () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
        <List className="w-3.5 h-3.5" />,
        "Madde işaretli liste"
      )}
      {btn(
        () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
        <ListOrdered className="w-3.5 h-3.5" />,
        "Numaralı liste"
      )}

      <div className="w-px h-4 bg-white/[0.08] mx-1" />

      {btn(() => editor.dispatchCommand(UNDO_COMMAND, undefined), <Undo className="w-3.5 h-3.5" />, "Geri al (Ctrl+Z)")}
      {btn(() => editor.dispatchCommand(REDO_COMMAND, undefined), <Redo className="w-3.5 h-3.5" />, "Yinele (Ctrl+Y)")}
    </div>
  );
}

// ── SEO heading kontrol plugin (Task 12) ──────────────────────────────────
// Kurallar:
//  1. H1 olmaz — varsa otomatik H2'ye çevrilir + uyarı gösterilir.
//  2. H2 → H4 (veya H3 → H5) gibi seviye atlamaları uyarı ile bildirilir.
//  3. Hata, editor üstünde close butonlu bir banner ile gösterilir.

type HeadingWarn = { code: "H1_FORBIDDEN" | "LEVEL_SKIP"; message: string };

function HeadingLevelEnforcerPlugin({
  onWarnings,
}: {
  onWarnings?: (w: HeadingWarn[]) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeListener = editor.registerUpdateListener(({ dirtyElements, prevEditorState, tags }) => {
      // Performans: sadece structure değiştiğinde kontrol et
      if (dirtyElements.size === 0 && !tags.has("history-stack")) return;

      editor.getEditorState().read(() => {
        const root = $getRoot();
        if (!root || !$isElementNode(root)) return;

        const warnings: HeadingWarn[] = [];
        const fixes: Array<{ node: any; toLevel: "h2" | "h3" }> = [];
        let prevLevel = 1; // H1 kabul edilmiyor; sayfa H1 = post.title, yani headingler H2'den başlar.

        for (const child of root.getChildren()) {
          if ($isHeadingNode(child)) {
            const tag = (child as any).getTag() as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
            const level = Number(tag.slice(1));

            if (level === 1) {
              warnings.push({ code: "H1_FORBIDDEN", message: "H1 başlık kullanılamaz — yazı başlığı otomatik H1'dir. H2 kullanıldı." });
              fixes.push({ node: child, toLevel: "h2" });
              continue;
            }

            const diff = level - prevLevel;
            if (diff > 1 && prevLevel >= 2) {
              const expected = `H${prevLevel + 1}`;
              warnings.push({
                code: "LEVEL_SKIP",
                message: `Başlık seviyesi atlandı: H${prevLevel} → H${level} (${expected} olmalı).`,
              });
            }
            prevLevel = level;
          }
        }

        // Mutasyonlar — yazma moduna al
        if (fixes.length > 0) {
          editor.update(() => {
            for (const fix of fixes) {
              try {
                (fix.node as HeadingNode).setTag(fix.toLevel);
              } catch {}
            }
          }, { discrete: true });
        }

        onWarnings?.(warnings);
      });
    });
    return removeListener;
  }, [editor, onWarnings]);

  return null;
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export function ContentEditor({ value, onChange, placeholder }: ContentEditorProps) {
  const [warnings, setWarnings] = useState<HeadingWarn[]>([]);

  const initialConfig = {
    namespace: "XipSoftEditor",
    theme: editorTheme,
    onError: (error: Error) => {
      console.error("[ContentEditor]", error);
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      AutoLinkNode,
      CodeNode,
      CodeHighlightNode,
    ],
  };

  const handleChange = useCallback(
    (editorState: EditorState) => {
      const json = editorState.toJSON() as unknown as SerializedEditorState;
      onChange(json);
    },
    [onChange]
  );

  return (
    <>
      {/* SEO heading uyarı banner */}
      {warnings.length > 0 && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-200/90 leading-snug">
                <span className="font-semibold text-amber-300 uppercase tracking-wider mr-1.5">{w.code}</span>
                {w.message}
              </p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setWarnings([])}
            className="p-1 rounded-md text-amber-300/70 hover:text-amber-200 hover:bg-amber-500/10 transition-colors shrink-0"
            aria-label="Uyarıları kapat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Lexical editor stilleri */}
      <style>{`
        .lexical-root {
          min-height: 300px;
          padding: 1rem 1.25rem;
          outline: none;
          color: rgb(228 228 231); /* zinc-200 */
          font-size: 0.875rem;
          line-height: 1.75;
          caret-color: #a78bfa;
        }
        .lexical-paragraph { margin: 0 0 0.75rem 0; }
        .lexical-paragraph:last-child { margin-bottom: 0; }
        .lexical-h1 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.5rem; color: white; }
        .lexical-h2 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; color: rgb(212 212 216); }
        .lexical-h3 { font-size: 1.1rem; font-weight: 600; margin: 0.875rem 0 0.4rem; color: rgb(212 212 216); }
        .lexical-ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .lexical-ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .lexical-li { margin: 0.2rem 0; }
        .lexical-quote {
          border-left: 3px solid #a78bfa;
          padding: 0.4rem 1rem;
          margin: 0.75rem 0;
          color: rgb(161 161 170);
          background: rgba(167,139,250,0.05);
          border-radius: 0 0.5rem 0.5rem 0;
        }
        .lexical-code {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          font-family: ui-monospace, monospace;
          font-size: 0.8rem;
          display: block;
          overflow-x: auto;
          margin: 0.5rem 0;
        }
        .lexical-link { color: #ddd6fe; text-decoration: underline; cursor: pointer; }
        .lexical-bold { font-weight: 700; }
        .lexical-italic { font-style: italic; }
        .lexical-underline { text-decoration: underline; }
        .lexical-text-code {
          background: rgba(255,255,255,0.08);
          border-radius: 0.25rem;
          padding: 0.1rem 0.35rem;
          font-family: ui-monospace, monospace;
          font-size: 0.8em;
          color: #ddd6fe;
        }
        .lexical-strikethrough { text-decoration: line-through; }
      `}</style>

      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative rounded-xl border border-white/[0.08] bg-white/[0.01] focus-within:border-prism-violet/30 transition-colors">
          <ToolbarPlugin />

          <div className="relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="lexical-root resize-none focus:outline-none"
                  aria-label="Blog içeriği"
                />
              }
              placeholder={
                <div className="absolute top-4 left-5 text-zinc-600 text-sm pointer-events-none select-none">
                  {placeholder ?? "Blog içeriğinizi buraya yazın... (/ ile komutlar)"}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>

          <HistoryPlugin />
          <AutoFocusPlugin />
          <ListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
          <HeadingLevelEnforcerPlugin onWarnings={setWarnings} />
          <LoadInitialPlugin value={value} />
        </div>
      </LexicalComposer>
    </>
  );
}
