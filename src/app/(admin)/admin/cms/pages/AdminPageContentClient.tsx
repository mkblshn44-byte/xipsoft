"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import {
  deleteManagedPageFaq,
  listManagedPageFaqs,
  listManagedPageMetadata,
  saveManagedPageFaq,
  updateManagedPageMetadata,
} from "@/app/_actions/admin-page-content-actions";
import type { HomeHeroCopy } from "@/types/common";

type PageRecord = {
  id: string;
  title: string;
  category: string;
  metadata: Record<string, unknown> | null;
};

type FaqRecord = { id: string; question: string; answer: string; is_active: boolean };

type FormState = {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  jsonLd: string;
  hero: HomeHeroCopy;
};

const EMPTY_HERO: HomeHeroCopy = {
  titleLine1: "", titleLine2: "", titleLine3: "", subtitle: "",
  subtitleHighlight: "", subtitleEnd: "", ctaPrimary: "", ctaSecondary: "",
  statYears: "", statProjects: "", statClients: "", statServices: "",
};

const DEFAULT_HERO: HomeHeroCopy = {
  titleLine1: "Yazılım ve Teknoloji",
  titleLine2: "Sistemleri",
  titleLine3: "ile Geleceği İnşa Et",
  subtitle: "Modern web, mobil ve siber Güvenlik çözümleriyle",
  subtitleHighlight: "işletmenizi dijital dünyada",
  subtitleEnd: "bir adım öne taşıyoruz.",
  ctaPrimary: "Ücretsiz Teklif Al",
  ctaSecondary: "Hizmetlerimiz",
  statYears: "Yıl Tecrübe",
  statProjects: "Proje",
  statClients: "Müşteri",
  statServices: "Hizmet Alanı",
};

const HERO_FIELDS: Array<{ key: keyof HomeHeroCopy; label: string }> = [
  { key: "titleLine1", label: "Başlık satırı 1" },
  { key: "titleLine2", label: "Başlık satırı 2" },
  { key: "titleLine3", label: "Başlık satırı 3" },
  { key: "subtitle", label: "Alt başlık başlangıcı" },
  { key: "subtitleHighlight", label: "Vurgulu alt başlık" },
  { key: "subtitleEnd", label: "Alt başlık sonu" },
  { key: "ctaPrimary", label: "Birincil buton" },
  { key: "ctaSecondary", label: "İkincil buton" },
  { key: "statYears", label: "Tecrübe istatistiği" },
  { key: "statProjects", label: "Proje istatistiği" },
  { key: "statClients", label: "Müşteri istatistiği" },
  { key: "statServices", label: "Hizmet istatistiği" },
];

function toForm(page: PageRecord): FormState {
  const metadata = page.metadata ?? {};
  const hero = metadata.hero && typeof metadata.hero === "object"
    ? metadata.hero as Partial<HomeHeroCopy>
    : {};
  const jsonLd = metadata.jsonLd && typeof metadata.jsonLd === "object"
    ? metadata.jsonLd
    : {};
  return {
    title: page.title ?? "",
    description: typeof metadata.description === "string" ? metadata.description : "",
    keywords: Array.isArray(metadata.keywords) ? metadata.keywords.join(", ") : "",
    ogTitle: typeof metadata.ogTitle === "string" ? metadata.ogTitle : "",
    ogDescription: typeof metadata.ogDescription === "string" ? metadata.ogDescription : "",
    jsonLd: JSON.stringify(jsonLd, null, 2),
    hero: { ...DEFAULT_HERO, ...hero },
  };
}

export default function AdminPageContentClient() {
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [faqs, setFaqs] = useState<FaqRecord[]>([]);
  const [faqDraft, setFaqDraft] = useState<{ id?: string; question: string; answer: string }>({ question: "", answer: "" });
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadPages = useCallback(async () => {
    setLoading(true);
    const result = await listManagedPageMetadata();
    if (!result.success) {
      setError(result.error ?? "Sayfa içerikleri alınamadı");
      setPages([]);
    } else {
      const records = result.pages as PageRecord[];
      setPages(records);
      setSelectedId((current) => current || records[0]?.id || "");
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadPages(); }, [loadPages]);

  const selected = pages.find((page) => page.id === selectedId);
  useEffect(() => {
    setForm(selected ? toForm(selected) : null);
  }, [selected]);

  const loadFaqs = useCallback(async (category: string) => {
    const result = await listManagedPageFaqs(category);
    if (result.success) setFaqs(result.faqs as FaqRecord[]);
    else setError(result.error ?? "SSS kayıtları alınamadı");
  }, []);

  useEffect(() => {
    if (!selected) {
      setFaqs([]);
      return;
    }
    setFaqDraft({ question: "", answer: "" });
    void loadFaqs(selected.category);
  }, [selected, loadFaqs]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !form) return;
    let jsonLd: Record<string, string>;
    try {
      jsonLd = JSON.parse(form.jsonLd || "{}");
      if (!jsonLd || Array.isArray(jsonLd) || typeof jsonLd !== "object") throw new Error();
    } catch {
      setError("JSON-LD geçerli bir JSON nesnesi olmalıdır.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const result = await updateManagedPageMetadata({
      id: selected.id,
      title: form.title,
      description: form.description,
      keywords: form.keywords.split(","),
      ogTitle: form.ogTitle,
      ogDescription: form.ogDescription,
      jsonLd,
      hero: form.hero,
    });
    if (!result.success) setError(result.error ?? "Kaydetme başarısız");
    else {
      setNotice("Sayfa içeriği güncellendi.");
      await loadPages();
    }
    setSaving(false);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
  };

  const saveFaq = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const result = await saveManagedPageFaq({ ...faqDraft, category: selected.category });
    if (!result.success) setError(result.error ?? "SSS kaydedilemedi");
    else {
      setFaqDraft({ question: "", answer: "" });
      setError(null);
      setNotice("SSS kaydı güncellendi.");
      await loadFaqs(selected.category);
    }
  };

  const removeFaq = async (faq: FaqRecord) => {
    if (!selected || !window.confirm("Bu SSS kaydı silinsin mi?")) return;
    const result = await deleteManagedPageFaq(faq.id, selected.category);
    if (!result.success) setError(result.error ?? "SSS silinemedi");
    else {
      setNotice("SSS kaydı silindi.");
      await loadFaqs(selected.category);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sayfa İçerikleri</h1>
            <p className="text-xs text-gray-500">SEO metaverileri ve ana sayfa hero içeriği</p>
          </div>
        </div>
        <button type="button" onClick={() => void loadPages()} disabled={loading} title="Yenile" aria-label="Yenile" className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">{notice}</p>}

      {!loading && pages.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">Yönetilebilir sayfa metaverisi bulunamadı.</p>
      ) : selected && form ? (
        <>
          <label className="block max-w-sm text-xs font-medium text-gray-700">Sayfa
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs">
              {pages.map((page) => <option key={page.id} value={page.id}>{page.category} · {page.title}</option>)}
            </select>
          </label>

          <form onSubmit={save} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-medium text-gray-700">Sayfa başlığı
                <input required maxLength={200} value={form.title} onChange={(event) => update("title", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
              </label>
              <label className="text-xs font-medium text-gray-700">Meta açıklaması
                <textarea maxLength={500} rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
              </label>
              <label className="text-xs font-medium text-gray-700">Anahtar kelimeler
                <input value={form.keywords} onChange={(event) => update("keywords", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
              </label>
              <label className="text-xs font-medium text-gray-700">Open Graph başlığı
                <input value={form.ogTitle} onChange={(event) => update("ogTitle", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
              </label>
              <label className="text-xs font-medium text-gray-700 md:col-span-2">Open Graph açıklaması
                <textarea rows={2} value={form.ogDescription} onChange={(event) => update("ogDescription", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
              </label>
              <label className="text-xs font-medium text-gray-700 md:col-span-2">JSON-LD alanları
                <textarea rows={5} value={form.jsonLd} onChange={(event) => update("jsonLd", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 p-3 font-mono text-xs" />
              </label>
            </div>

            {selected.category === "home" && (
              <fieldset className="space-y-3 border-t border-gray-100 pt-4">
                <legend className="text-sm font-semibold text-gray-800">Ana sayfa hero metinleri</legend>
                <div className="grid gap-3 md:grid-cols-2">
                  {HERO_FIELDS.map(({ key, label }) => (
                    <label key={key} className="text-xs font-medium text-gray-700">{label}
                      <input value={form.hero[key]} onChange={(event) => update("hero", { ...form.hero, [key]: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="flex justify-end">
              <button disabled={saving} className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>

          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Sayfa SSS içerikleri</h2>
              <span className="text-xs text-gray-500">{faqs.length} kayıt</span>
            </div>
            <div className="divide-y divide-gray-100">
              {faqs.map((faq) => (
                <div key={faq.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{faq.question}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-gray-500">{faq.answer}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" title="Düzenle" aria-label="SSS düzenle" onClick={() => setFaqDraft({ id: faq.id, question: faq.question, answer: faq.answer })} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" title="Sil" aria-label="SSS sil" onClick={() => void removeFaq(faq)} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
              {faqs.length === 0 && <p className="py-5 text-center text-xs text-gray-400">Bu sayfa için SSS kaydı yok.</p>}
            </div>
            <form onSubmit={saveFaq} className="grid gap-3 border-t border-gray-100 pt-4">
              <label className="text-xs font-medium text-gray-700">Soru
                <input required maxLength={300} value={faqDraft.question} onChange={(event) => setFaqDraft({ ...faqDraft, question: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
              </label>
              <label className="text-xs font-medium text-gray-700">Yanıt
                <textarea required maxLength={5000} rows={3} value={faqDraft.answer} onChange={(event) => setFaqDraft({ ...faqDraft, answer: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
              </label>
              <div className="flex justify-end gap-2">
                {faqDraft.id && <button type="button" onClick={() => setFaqDraft({ question: "", answer: "" })} title="Düzenlemeyi iptal et" aria-label="Düzenlemeyi iptal et" className="rounded-lg border border-gray-200 p-2 text-gray-500"><X className="h-4 w-4" /></button>}
                <button className="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700">
                  {faqDraft.id ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {faqDraft.id ? "SSS kaydet" : "SSS ekle"}
                </button>
              </div>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}