"use client";

import { useCallback, useEffect, useState } from "react";
import { HelpCircle, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import {
  deleteSiteFaq,
  listSiteFaqs,
  saveSiteFaq,
  setSiteFaqActive,
} from "@/app/_actions/admin-site-faq-actions";

type SiteFaq = {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  order_index: number;
};

type FaqForm = {
  question: string;
  answer: string;
  isActive: boolean;
};

const EMPTY_FORM: FaqForm = { question: "", answer: "", isActive: true };

export default function SiteFaqClient() {
  const [faqs, setFaqs] = useState<SiteFaq[]>([]);
  const [form, setForm] = useState<FaqForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadFaqs = useCallback(async () => {
    setLoading(true);
    const result = await listSiteFaqs();
    if (result.success) setFaqs(result.faqs as SiteFaq[]);
    else setError(result.error ?? "SSS kayıtları yüklenemedi");
    setLoading(false);
  }, []);

  useEffect(() => { void loadFaqs(); }, [loadFaqs]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const result = await saveSiteFaq({
      id: editingId ?? undefined,
      question: form.question,
      answer: form.answer,
      isActive: form.isActive,
    });
    if (!result.success) {
      setError(result.error ?? "SSS kaydedilemedi");
    } else {
      setNotice(editingId ? "SSS güncellendi." : "SSS eklendi.");
      resetForm();
      await loadFaqs();
    }
    setSaving(false);
  };

  const edit = (faq: SiteFaq) => {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, isActive: faq.is_active });
    setError(null);
    setNotice(null);
  };

  const toggleActive = async (faq: SiteFaq) => {
    const result = await setSiteFaqActive(faq.id, !faq.is_active);
    if (!result.success) setError(result.error ?? "Durum güncellenemedi");
    else await loadFaqs();
  };

  const remove = async (faq: SiteFaq) => {
    if (!window.confirm(`"${faq.question}" SSS kaydı silinsin mi?`)) return;
    const result = await deleteSiteFaq(faq.id);
    if (!result.success) {
      setError(result.error ?? "SSS silinemedi");
    } else {
      setNotice("SSS silindi.");
      if (editingId === faq.id) resetForm();
      await loadFaqs();
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-5 w-5 text-gray-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Site SSS</h1>
            <p className="text-xs text-gray-500">Hizmetler sayfasında gösterilen genel sıkça sorulan sorular</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadFaqs()}
          disabled={loading}
          title="Listeyi yenile"
          aria-label="Listeyi yenile"
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">{notice}</p>}

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-xs font-medium text-gray-700">
          Soru
          <input
            required
            value={form.question}
            maxLength={300}
            onChange={(event) => setForm({ ...form, question: event.target.value })}
            placeholder="Örn: Projeler ne kadar sürede teslim edilir?"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-gray-500"
          />
        </label>
        <label className="block text-xs font-medium text-gray-700">
          Yanıt
          <textarea
            required
            value={form.answer}
            rows={4}
            maxLength={5000}
            onChange={(event) => setForm({ ...form, answer: event.target.value })}
            placeholder="Sorunun yanıtı"
            className="mt-1 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-gray-500"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              className="h-3.5 w-3.5"
            />
            Aktif (sitede göster)
          </label>
          <div className="flex gap-2">
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50">
                İptal
              </button>
            )}
            <button disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50">
              {editingId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {editingId ? "Kaydet" : "Ekle"}
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800">Kayıtlı sorular</h2>
          <span className="text-xs text-gray-500">{faqs.length} kayıt</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Soru</th>
                <th className="px-4 py-3 text-left font-medium">Yanıt</th>
                <th className="px-4 py-3 text-left font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {faqs.length === 0 && !loading ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">SSS kaydı bulunamadı</td></tr>
              ) : faqs.map((faq) => (
                <tr key={faq.id} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 font-medium text-gray-800">{faq.question}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <span className="line-clamp-2 block max-w-[420px]">{faq.answer}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggleActive(faq)}
                      aria-pressed={faq.is_active}
                      className={`rounded px-2 py-1 text-[10px] font-medium ${faq.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {faq.is_active ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => edit(faq)} title="Düzenle" aria-label={`${faq.question} sorusunu düzenle`} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => void remove(faq)} title="Sil" aria-label={`${faq.question} sorusunu sil`} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
