"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Plus, Eye, EyeOff, RefreshCw, Archive, PenLine, Trash2, RotateCcw, Search
} from "lucide-react";
import {
  getBlogPosts, deleteBlogPost, restoreBlogPostAction,
  hardDeleteBlogPostAction, getDeletedBlogPostsAction,
  createBlogPost, updateBlogPost, getBlogCountsAction,
} from "@/app/_actions/admin-blog-actions";
import type { Post, DeletedPost, Tab, BlogFormState } from "./components/types";
import { EMPTY_FORM } from "./components/types";

const PAGE_SIZE = 50;

export default function AdminBlogClient() {
  const [tab, setTab] = useState<Tab>("published");
  const [posts, setPosts] = useState<Post[]>([]);
  const [deleted, setDeleted] = useState<DeletedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ published: 0, draft: 0, trash: 0 });
  const [form, setForm] = useState<BlogFormState>(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Arama kutusunu debounce et (sunucu taraflı arama) ve sayfayı başa al.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Sekme değişince sayfayı başa al.
  useEffect(() => { setPage(0); }, [tab]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const activeStatus = tab === "published" || tab === "draft" ? tab : undefined;
    const [active, trash, countRes] = await Promise.all([
      getBlogPosts(PAGE_SIZE, page * PAGE_SIZE, {
        status: activeStatus,
        search: debouncedSearch.trim() || undefined,
      }),
      getDeletedBlogPostsAction(),
      getBlogCountsAction(),
    ]);
    if (active.success) setPosts((active.posts ?? []) as Post[]);
    setTotal(active.total ?? 0);
    if (trash.success) setDeleted((trash.posts ?? []) as DeletedPost[]);
    if (countRes.success) setCounts(countRes.counts);
    setLoading(false);
  }, [tab, page, debouncedSearch]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleDelete = async (id: number) => {
    if (!confirm("Çöp kutusuna taşınsın mı?")) return;
    await deleteBlogPost(id);
    await loadPosts();
  };

  const handleToggleStatus = async (post: Post) => {
    setTogglingId(post.id);
    const newStatus = post.status === "published" ? "draft" : "published";
    await updateBlogPost(post.id, { status: newStatus });
    await loadPosts();
    setTogglingId(null);
  };

  const handleRestore = async (id: number) => {
    await restoreBlogPostAction(id);
    await loadPosts();
  };

  const handleHardDelete = async (id: number) => {
    if (!confirm("Kalıcı silinsin mi? Geri alınamaz.")) return;
    await hardDeleteBlogPostAction(id);
    await loadPosts();
  };

  const handleEdit = (post: Post) => {
    setEditId(post.id);
    const postAny = post as any;
    const existingCitations = Array.isArray(postAny.citations) && postAny.citations.length > 0
      ? postAny.citations.map((c: any) => `${c.url}|${c.title || ""}|${c.source || ""}`).join("\n")
      : "";
    setForm({
      title: post.title,
      description: post.description ?? "",
      content: typeof (post as any).content === "string" ? (post as any).content : JSON.stringify((post as any).content ?? ""),
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
      cover_image_url: post.cover_image_url ?? "",
      cover_image_alt: postAny.cover_image_alt ?? "",
      citations: existingCitations,
      status: post.status,
      slug: post.slug,
    });
    setTab("new");
  };

  const handleNewPost = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setTab("new");
    setFormError(null);
    setFormSuccess(null);
  };

  const TITLE_MAX = 60;
  const META_MAX = 160;
  const titleLen = form.title.length;
  const metaLen = (form.description || "").length;
  const isTitleOver = titleLen > TITLE_MAX;
  const isMetaOver = metaLen > META_MAX;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // SEO karakter sınırları UYARI niteliğindedir; mevcut (uzun) içeriklerin
    // düzenlenip kaydedilmesini engellememesi için kaydı bloklamaz.
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    const tagsArray = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    let contentValue: any = form.content;
    try { contentValue = JSON.parse(form.content); } catch {}

    // Citations parse: her satır URL|Başlık|Kaynak formatında
    const citations = form.citations
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [url, title, source] = line.split("|").map((s) => (s ?? "").trim());
        if (!url) return null;
        return {
          url,
          title: title || url,
          ...(source ? { source } : {}),
        };
      })
      .filter(Boolean) as Array<{ url: string; title: string; source?: string }>;

    // Kapak görseli varsa alt text zorunlu (SEO erişilebilirlik + Task 9 tamamlayıcı)
    if (form.cover_image_url && !form.cover_image_alt.trim()) {
      setFormError("Kapak görseli yüklendiğinde ALT metin zorunludur (erişilebilirlik).");
      setSubmitting(false);
      return;
    }

    try {
      if (editId !== null) {
        const res = await updateBlogPost(editId, {
          title: form.title, description: form.description, content: contentValue,
          status: form.status, tags: tagsArray, cover_image_url: form.cover_image_url || undefined,
          cover_image_alt: form.cover_image_alt.trim() || undefined,
          citations,
          slug: form.slug || undefined,
        });
        if (!res.success) throw new Error(res.error ?? "Güncelleme başarısız");
        setFormSuccess("Yazı güncellendi.");
      } else {
        const res = await createBlogPost({
          title: form.title, description: form.description, content: contentValue,
          status: form.status, tags: tagsArray,
          cover_image_url: form.cover_image_url || undefined,
          cover_image_alt: form.cover_image_alt.trim() || undefined,
          citations,
          slug: form.slug || form.title,
        });
        if (!res.success) throw new Error(res.error ?? "Oluşturma başarısız");
        setFormSuccess("Yazı oluşturuldu.");
        setForm(EMPTY_FORM);
        setEditId(null);
      }
      await loadPosts();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "published", label: `Yayında (${counts.published})`, icon: <Eye className="w-3.5 h-3.5" /> },
    { key: "draft", label: `Taslak (${counts.draft})`, icon: <EyeOff className="w-3.5 h-3.5" /> },
    { key: "trash", label: `Çöp (${counts.trash})`, icon: <Archive className="w-3.5 h-3.5" /> },
    { key: "new", label: editId ? "Düzenle" : "Yeni", icon: <Plus className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-gray-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Blog Yönetimi</h1>
            <p className="text-xs text-gray-500">Yazıları oluştur, düzenle ve yönet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadPosts} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={handleNewPost} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-xs text-gray-900 hover:bg-gray-100 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Yeni Yazı
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "new" && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={`Başlık *  (${TITLE_MAX} kr. sınırı)`}>
              <div className="relative">
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Yazı başlığı" className={`input pr-20 ${isTitleOver ? "!border-red-400 !ring-red-200" : ""}`} />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono tabular-nums ${isTitleOver ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                  {titleLen}/{TITLE_MAX}
                </span>
              </div>
            </Field>
            <Field label="Slug">
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="otomatik-oluşturulur" className="input" />
              {editId !== null && (
                <span className="mt-1 block text-[10px] text-amber-600 font-medium">
                  Slug değişikliği otomatik 301 yönlendirme oluşturur.
                </span>
              )}
            </Field>
          </div>
          <Field label={`Açıklama (SEO)  (${META_MAX} kr. sınırı)`}>
            <div className="relative">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Kısa açıklama" className={`input resize-none pb-6 ${isMetaOver ? "!border-red-400 !ring-red-200" : ""}`} />
              <span className={`absolute right-3 bottom-2 text-[11px] font-mono tabular-nums ${isMetaOver ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                {metaLen}/{META_MAX}
              </span>
            </div>
          </Field>
          <Field label="İçerik *">
            <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={10} placeholder="Yazı içeriği" className="input font-mono resize-y" />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Etiketler">
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="nextjs, react" className="input" />
            </Field>
            <Field label="Kapak görseli URL">
              <input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={`Kapak Görseli ALT Metin ${form.cover_image_url ? "* (zorunlu)" : "(önerilen)"}`}>
              <input
                value={form.cover_image_alt}
                onChange={(e) => setForm({ ...form, cover_image_alt: e.target.value })}
                placeholder="Görsel içeriğini kısaca tarif edin (erişilebilirlik)"
                maxLength={160}
                className={`input ${form.cover_image_url && !form.cover_image_alt.trim() ? "!border-amber-400 !ring-amber-200" : ""}`}
              />
            </Field>
            <Field label="Kaynakça (Citations) — Her satır: URL|Başlık|Kaynak">
              <textarea
                value={form.citations}
                onChange={(e) => setForm({ ...form, citations: e.target.value })}
                rows={4}
                placeholder={"https://example.com/study|Açık Kaynak Raporu|Example Corp\nhttps://tr.wikipedia.org/x|Konun Kaynağı|Wikipedia"}
                className="input font-mono text-[11px] resize-y"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                E-E-A-T için dış güvenilir kaynaklar. Her satır <code className="bg-gray-100 px-1 rounded">URL|Başlık|Kaynak</code> formatında.
              </p>
            </Field>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500">Durum:</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" })} className="input w-auto">
                <option value="draft">Taslak</option>
                <option value="published">Yayınla</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setTab("published"); setEditId(null); setForm(EMPTY_FORM); }} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-900">İptal</button>
              <button type="submit" disabled={submitting} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-100 text-xs text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <PenLine className="w-3.5 h-3.5" /> {submitting ? "Kaydediliyor..." : editId ? "Güncelle" : "Oluştur"}
              </button>
            </div>
          </div>
          {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
          {formSuccess && <p className="text-xs text-gray-700 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">{formSuccess}</p>}
        </form>
      )}

      {(tab === "published" || tab === "draft") && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Başlık veya slug ara..." className="input pl-9" />
          </div>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Başlık</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Durum</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Etiketler</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Tarih</th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{loading ? "Yükleniyor..." : "Yazı bulunamadı"}</td></tr>
                )}
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="text-gray-900 font-medium truncate max-w-[240px]">{post.title}</p>
                      <p className="text-gray-400 font-mono">/{post.slug}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${post.status === "published" ? "bg-gray-100 text-gray-900" : "bg-gray-50 text-gray-500"}`}>
                        {post.status === "published" ? "Yayında" : "Taslak"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(post.tags) ? post.tags : []).slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{new Date(post.created_at).toLocaleDateString("tr-TR")}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleStatus(post)}
                          disabled={togglingId === post.id}
                          title={post.status === "published" ? "Taslağa çek" : "Yayınla"}
                          className={`p-1.5 rounded text-xs font-medium transition-colors ${
                            post.status === "published"
                              ? "text-emerald-600 hover:text-white hover:bg-emerald-600"
                              : "text-gray-400 hover:text-white hover:bg-gray-600"
                          } disabled:opacity-40`}
                        >
                          {togglingId === post.id ? (
                            <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : post.status === "published" ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button onClick={() => handleEdit(post)} className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100"><PenLine className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total} kayıt
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                <span className="text-xs text-gray-500 tabular-nums">
                  {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= total || loading}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "trash" && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Başlık</th>
                <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Silinme</th>
                <th className="px-4 py-2.5 text-right text-gray-500 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deleted.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Çöp kutusu boş</td></tr>
              )}
              {deleted.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="text-gray-900 font-medium truncate max-w-[240px]">{post.title}</p>
                    <p className="text-gray-400 font-mono">/{post.slug}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(post.deleted_at).toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleRestore(post.id)} className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100"><RotateCcw className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleHardDelete(post.id)} className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
