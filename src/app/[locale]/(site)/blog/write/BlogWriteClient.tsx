"use client";

import { useState, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils";
import { motion } from "motion/react";
import { PenLine, Save, Tag, X, Image as ImageIcon, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import TitleText from "@/components/Common/TitleText/TitleText";
import { createBlogPostAction } from "@/app/_actions/blog-actions";
import { ContentEditor, type SerializedEditorState } from "@/components/ContentEditor";
import { AuthContext } from "@/context/AuthContext";
import MseLink from "@/components/Ui/MseLink/MseLink";

// ── Sabitler ─────────────────────────────────────────────────────────────────

const INPUT_CLASS = cn(
  "w-full px-4 py-3 rounded-xl text-sm",
  "bg-white/[0.04] border border-white/[0.08]",
  "text-zinc-200 placeholder:text-zinc-600",
  "focus:outline-none focus:border-prism-violet/40 focus:ring-1 focus:ring-prism-violet/20",
  "transition-all duration-200"
);

// ── TagInput (DRY: aynı component her iki editörde de kullanılıyor) ───────────

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = value.trim().toLowerCase();
      if (tag && !tags.includes(tag) && tags.length < 12) onAdd(tag);
      setValue("");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs -mono bg-prism-violet/10 text-prism-violet border border-prism-violet/20"
          >
            {tag}
            <button type="button" onClick={() => onRemove(tag)} className="hover:text-prism-rose transition-colors" aria-label={`${tag} etiketini kaldır`}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Etiket ekle (Enter'a bas)"}
        className={INPUT_CLASS}
        maxLength={30}
      />
    </div>
  );
}

// ── Giriş gerektiren kapı ─────────────────────────────────────────────────────

function AuthGate({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  const { isAuthenticated } = useContext(AuthContext) ?? { isAuthenticated: false };
  const t = useTranslations("Blog");

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-prism-violet/30 border-t-prism-violet rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-5">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/[0.06]"
          style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(34,211,238,0.12))" }}>
          <LogIn className="w-6 h-6 text-prism-cyan" />
        </div>
        <div>
          <p className="text-white font-semibold mb-1">Giriş yapmanız gerekiyor</p>
          <p className="text-zinc-500 text-sm">Blog yazısı oluşturmak için hesabınıza giriş yapın.</p>
        </div>
        <MseLink
          href="/login?redirect=/blog/write"
          className="px-6 py-3 rounded-xl bg-prism-violet text-white text-sm font-medium hover:bg-prism-violet/90 transition-colors"
        >
          Giriş Yap
        </MseLink>
      </div>
    );
  }

  return <>{children}</>;
}

// ── Form ──────────────────────────────────────────────────────────────────────

function BlogWriteForm() {
  const router = useRouter();
  const t = useTranslations("Blog");
  const mm = "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [coverImageURL, setCoverImageURL] = useState<string | null>(null);
  const [coverImageAlt, setCoverImageAlt] = useState("");
  const [content, setContent] = useState<SerializedEditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validasyon
  const titleTrimmed = title.trim();
  const descTrimmed = description.trim();
  const titleError = titleTrimmed.length > 0 && titleTrimmed.length < 3 ? "Başlık en az 3 karakter olmalı" : null;
  const descError = descTrimmed.length > 320 ? "Açıklama en fazla 320 karakter olabilir" : null;
  const canSave = titleTrimmed.length >= 3 && !descError && !saving;

  const handleContentChange = useCallback((state: SerializedEditorState) => {
    setContent(state);
  }, []);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const id = await createBlogPostAction({
        title: titleTrimmed,
        description: descTrimmed,
        content: content as any,
        tags,
        coverImageURL,
        coverImageAlt: coverImageAlt.trim() || null,
      });
      if (!id) throw new Error("Blog yazısı kaydedilemedi. Oturumunuz sona ermiş olabilir.");
      router.push(`/blog/edit?id=${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian pt-24 pb-20 px-5 relative">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.05] blur-[120px]"
          style={{ background: "radial-gradient(ellipse, #a78bfa 0%, #ddd6fe 40%, transparent 70%)" }} />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Başlık */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-prism-violet/20 to-prism-cyan/20 border border-white/[0.08]">
              <PenLine className="w-4.5 h-4.5 text-prism-cyan" />
            </div>
            <TitleText tag="h1" variant="glass" className={cn("text-white", mm)}>
              {t("writeNewBlog")}
            </TitleText>
          </div>
        </motion.div>

        {/* Form alanları */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-5">
          {/* Başlık */}
          <div>
            <label className={cn("block text-xs -mono text-zinc-500 uppercase tracking-wider mb-2", mm)}>
              {t("formTitle")} <span className="text-prism-rose">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("formTitlePlaceholder")}
              className={cn(INPUT_CLASS, "text-lg -display", titleError && "border-prism-rose/50")}
              maxLength={120}
            />
            <div className="flex justify-between mt-1">
              {titleError ? <p className="text-xs text-prism-rose">{titleError}</p> : <span />}
              <span className={cn(
                "text-[10px] -mono",
                title.length > 60 ? "text-neon" : title.length >= 40 ? "text-accent-cyan" : "text-ink-dim"
              )}>
                {title.length}/60 {title.length > 60 ? "(SERP kesintisi riski)" : "(ideal 50-60)"}
              </span>
            </div>
          </div>

          {/* Meta açıklama (SEO) */}
          <div>
            <label className={cn("block text-xs -mono text-zinc-500 uppercase tracking-wider mb-2", mm)}>
              {t("formDescription")}
              <span className="text-zinc-600 ml-1 normal-case not-italic">(SEO meta açıklaması)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("formDescriptionPlaceholder")}
              rows={2}
              maxLength={320}
              className={cn(INPUT_CLASS, "resize-none", descError && "border-prism-rose/50")}
            />
            <div className="flex justify-between mt-1">
              {descError ? <p className="text-xs text-prism-rose">{descError}</p> : <span />}
              <span className={cn(
                "text-[10px] -mono",
                description.length > 160 ? "text-neon" : description.length >= 120 ? "text-accent-cyan" : "text-ink-dim"
              )}>
                {description.length}/160 {description.length > 160 ? "(SERP kesintisi riski)" : "(ideal 120-160)"}
              </span>
            </div>
          </div>

          {/* Kapak görseli ve Alt Metni (Görsel SEO) */}
          <div className="space-y-3">
            <div>
              <label className={cn("block text-xs -mono text-zinc-500 uppercase tracking-wider mb-2", mm)}>
                <ImageIcon className="w-3 h-3 inline mr-1" />
                {t("formCoverImage")}
              </label>
              <input
                type="url"
                value={coverImageURL ?? ""}
                onChange={(e) => setCoverImageURL(e.target.value || null)}
                placeholder={t("formCoverImagePlaceholder")}
                className={INPUT_CLASS}
              />
            </div>
            {coverImageURL && (
              <div>
                <label className={cn("block text-xs -mono text-zinc-500 uppercase tracking-wider mb-1", mm)}>
                  Görsel Alt Metni (SEO Açıklaması)
                  <span className="text-zinc-600 ml-1 normal-case not-italic">(Arama motoru görsel indeksi için)</span>
                </label>
                <input
                  type="text"
                  value={coverImageAlt}
                  onChange={(e) => setCoverImageAlt(e.target.value)}
                  placeholder="Görseli anlatan kısa ve açıklayıcı metin..."
                  className={INPUT_CLASS}
                  maxLength={120}
                />
              </div>
            )}
          </div>

          {/* Etiketler */}
          <div>
            <label className={cn("block text-xs -mono text-zinc-500 uppercase tracking-wider mb-2", mm)}>
              <Tag className="w-3 h-3 inline mr-1" />
              {t("formTags")}
              <span className="text-zinc-600 ml-1 normal-case not-italic">(max 12)</span>
            </label>
            <TagInput
              tags={tags}
              onAdd={(tag) => setTags([...tags, tag])}
              onRemove={(tag) => setTags(tags.filter((tg) => tg !== tag))}
              placeholder={t("formTagsPlaceholder")}
            />
          </div>

          {/* İçerik editörü */}
          <div>
            <label className={cn("block text-xs -mono text-zinc-500 uppercase tracking-wider mb-3", mm)}>
              {t("formContent")}
            </label>
            <ContentEditor
              value={content}
              onChange={handleContentChange}
              placeholder={t("formContentPlaceholder")}
            />
          </div>

          {/* Hata */}
          {error && (
            <p className="text-sm text-prism-rose bg-prism-rose/5 border border-prism-rose/20 rounded-xl px-4 py-3">{error}</p>
          )}

          {/* Aksiyonlar */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              aria-label="Taslağı kaydet"
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium",
                "bg-prism-violet text-white hover:bg-prism-violet/90 transition-colors duration-200",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4" />
              <span className={mm}>{saving ? t("saving") : t("saveDraft")}</span>
            </button>
            <span className="text-[11px] text-zinc-600 -mono">{t("autoSaveNote")}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function BlogWriteClient() {
  const { loading } = useContext(AuthContext) ?? { loading: false };
  return (
    <AuthGate loading={loading ?? false}>
      <BlogWriteForm />
    </AuthGate>
  );
}
