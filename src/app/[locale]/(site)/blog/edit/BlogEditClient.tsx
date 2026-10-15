"use client";

import { useState, useCallback, useEffect, useContext, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/utils";
import { motion } from "motion/react";
import { PenLine, Save, Tag, X, Image as ImageIcon, CheckCircle, LogIn } from "lucide-react";
import {
  getBlogPostAction,
  publishBlogPostAction,
  unpublishBlogPostAction,
  updateBlogPostAction,
} from "@/app/_actions/blog-actions";
import { useTranslations } from "next-intl";
import TitleText from "@/components/Common/TitleText/TitleText";
import { ContentEditor, type SerializedEditorState } from "@/components/ContentEditor";
import { AuthContext } from "@/context/AuthContext";
import MseLink from "@/components/Ui/MseLink/MseLink";
import type { BlogPost } from "@/types/blog";

// ── Sabitler ─────────────────────────────────────────────────────────────────

const INPUT_CLASS = cn(
  "w-full px-4 py-3 rounded-xl text-sm",
  "bg-white/[0.04] border border-white/[0.08]",
  "text-zinc-200 placeholder:text-zinc-600",
  "focus:outline-none focus:border-prism-violet/40 focus:ring-1 focus:ring-prism-violet/20",
  "transition-all duration-200"
);

// ── TagInput ──────────────────────────────────────────────────────────────────

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
          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs -mono bg-prism-violet/10 text-prism-violet border border-prism-violet/20">
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

// ── Form ──────────────────────────────────────────────────────────────────────

function BlogEditForm({ postId }: { postId: string }) {
  const router = useRouter();
  const t = useTranslations("Blog");
  const mm = "";
  const { user, isAdmin } = useContext(AuthContext) ?? { user: null, isAdmin: false };

  const [post, setPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [coverImageURL, setCoverImageURL] = useState<string | null>(null);
  const [coverImageAlt, setCoverImageAlt] = useState("");
  const [content, setContent] = useState<SerializedEditorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Post yükleme
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getBlogPostAction(postId)
      .then((loadedPost) => {
        if (cancelled) return;
        if (!loadedPost) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }
        setPost(loadedPost);
        setTitle(loadedPost.title);
        setDescription(loadedPost.description ?? "");
        setTags(loadedPost.tags ?? []);
        setCoverImageURL(loadedPost.coverImageURL ?? null);
        setCoverImageAlt(loadedPost.coverImageAlt ?? "");
        // Lexical SerializedEditorState veya null
        setContent(loadedPost.content ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Blog yazısı yüklenemedi.");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [postId]);

  const handleContentChange = useCallback((state: SerializedEditorState) => {
    setContent(state);
  }, []);

  // Girişsiz kullanıcı kontrolü (client-side hız için; server action da kontrol ediyor)
  const isOwner = post && user ? post.authorId === user.id : false;
  const canEdit = isOwner || isAdmin;

  const collectInput = () => ({
    title: title.trim(),
    description: description.trim(),
    content: content as any,
    tags,
    coverImageURL,
    coverImageAlt: coverImageAlt.trim() || null,
  });

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await updateBlogPostAction(postId, collectInput());
      if (!saved) throw new Error("Kaydedilemedi. Yetkiniz olmayabilir veya oturumunuz sona ermiş olabilir.");
      router.push("/blog/my-posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!canEdit || !post) return;
    setPublishing(true);
    setPublishError(null);
    try {
      // Önce mevcut değişiklikleri kaydet
      const saved = await updateBlogPostAction(postId, collectInput());
      if (!saved) throw new Error("Kaydedilemedi.");

      if (post.status === "published") {
        await unpublishBlogPostAction(postId);
      } else {
        await publishBlogPostAction(postId);
      }
      router.push("/blog/my-posts");
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setPublishing(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-prism-violet/30 border-t-prism-violet rounded-full animate-spin" />
      </div>
    );
  }

  // ── Yetkisiz ──────────────────────────────────────────────────────────────
  if (unauthorized || (post && !canEdit)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-5">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/[0.06]"
          style={{ background: "linear-gradient(135deg, rgba(251,113,133,0.12), rgba(167,139,250,0.12))" }}>
          <LogIn className="w-6 h-6 text-prism-rose" />
        </div>
        <div>
          <p className="text-white font-semibold mb-1">Erişim reddedildi</p>
          <p className="text-zinc-500 text-sm">Bu yazıyı düzenleme yetkiniz yok.</p>
        </div>
        <MseLink href="/blog/my-posts" className="px-6 py-3 rounded-xl bg-white/[0.06] text-zinc-300 text-sm font-medium hover:bg-white/[0.1] transition-colors border border-white/[0.08]">
          Bloglarıma dön
        </MseLink>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-obsidian pt-24 pb-20 px-5 relative">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.05] blur-[120px]"
          style={{ background: "radial-gradient(ellipse, #a78bfa 0%, #ddd6fe 40%, transparent 70%)" }} />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Başlık */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-prism-violet/20 to-prism-cyan/20 border border-white/[0.08]">
                <PenLine className="w-4.5 h-4.5 text-prism-cyan" />
              </div>
              <div>
                <TitleText tag="h1" variant="glass" className={cn("text-white", mm)}>
                  {t("editBlog")}
                </TitleText>
                <p className={cn("text-[11px] text-zinc-600 -mono", mm)}>
                  {post?.status === "published" ? t("published") : t("draft")} · {t("autoSaveNote")}
                </p>
              </div>
            </div>

            {post?.status === "published" && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] -mono uppercase tracking-wider bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                <CheckCircle className="w-3 h-3" />
                {t("published")}
              </span>
            )}
          </div>
        </motion.div>

        {/* Alanlar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
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
              className={cn(INPUT_CLASS, "text-lg -display")}
              maxLength={120}
            />
            <div className="flex justify-end mt-1">
              <span className={cn(
                "text-[10px] -mono",
                title.length > 60 ? "text-neon" : title.length >= 40 ? "text-accent-cyan" : "text-ink-dim"
              )}>
                {title.length}/60 {title.length > 60 ? "(SERP kesintisi riski)" : "(ideal 50-60)"}
              </span>
            </div>
          </div>

          {/* Meta açıklama */}
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
              className={cn(INPUT_CLASS, "resize-none")}
            />
            <div className="flex justify-end mt-1">
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
                  <span className="text-zinc-600 ml-1 normal-case not-italic">(Görsel arama motoru optimizasyonu)</span>
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

          {error && <p className="text-sm text-prism-rose bg-prism-rose/5 border border-prism-rose/20 rounded-xl px-4 py-3">{error}</p>}
          {publishError && <p className="text-sm text-prism-rose bg-prism-rose/5 border border-prism-rose/20 rounded-xl px-4 py-3">{publishError}</p>}

          {/* Butonlar */}
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              aria-label="Taslağı kaydet"
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium",
                "bg-prism-violet text-white hover:bg-prism-violet/90 transition-colors",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4" />
              <span className={mm}>{saving ? t("saving") : t("saveDraft")}</span>
            </button>

            <button
              type="button"
              onClick={handlePublishToggle}
              disabled={publishing || !title.trim()}
              aria-label={post?.status === "published" ? "Yayından kaldır" : "Yayımla"}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors",
                post?.status === "published"
                  ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  : "bg-neon-600 text-neon-bg hover:bg-neon-500",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <CheckCircle className="w-4 h-4" />
              <span className={mm}>
                {publishing ? "..." : post?.status === "published" ? t("unpublish") : t("publish")}
              </span>
            </button>

            {post?.status !== "published" && (
              <span className={cn("text-[11px] text-zinc-600 -mono", mm)}>{t("maxPostsPerDay")}</span>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── İç bileşen (Suspense sınırı içinde) ──────────────────────────────────────

function BlogEditInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-zinc-500">Post ID belirtilmedi.</p>
      </div>
    );
  }

  return <BlogEditForm postId={id} />;
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function BlogEditClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-prism-violet/30 border-t-prism-violet rounded-full animate-spin" />
        </div>
      }
    >
      <BlogEditInner />
    </Suspense>
  );
}
