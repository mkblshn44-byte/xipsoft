"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Link2, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import {
  createRedirect,
  deleteRedirect,
  listRedirects,
  updateRedirect,
} from "@/app/_actions/admin-redirect-actions";

type RedirectRecord = {
  id: string;
  source_path: string;
  target_path: string;
  status_code: 301 | 302 | 307 | 308;
  is_active: boolean;
  created_at: string;
};

const EMPTY_FORM: {
  sourcePath: string;
  targetPath: string;
  statusCode: 301 | 302 | 307 | 308;
} = { sourcePath: "", targetPath: "", statusCode: 301 };

export default function RedirectsClient() {
  const [redirects, setRedirects] = useState<RedirectRecord[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadRedirects = useCallback(async () => {
    setLoading(true);
    const result = await listRedirects();
    if (result.success) setRedirects(result.redirects as RedirectRecord[]);
    else setError(result.error ?? "Yönlendirmeler yüklenemedi");
    setLoading(false);
  }, []);

  useEffect(() => { void loadRedirects(); }, [loadRedirects]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const result = editingId
      ? await updateRedirect(editingId, form)
      : await createRedirect(form);
    if (!result.success) {
      setError(result.error ?? "Yönlendirme kaydedilemedi");
    } else {
      setNotice(editingId ? "Yönlendirme güncellendi." : "Yönlendirme eklendi.");
      resetForm();
      await loadRedirects();
    }
    setSaving(false);
  };

  const edit = (record: RedirectRecord) => {
    setEditingId(record.id);
    setForm({
      sourcePath: record.source_path,
      targetPath: record.target_path,
      statusCode: record.status_code,
    });
    setError(null);
    setNotice(null);
  };

  const toggleActive = async (record: RedirectRecord) => {
    const result = await updateRedirect(record.id, { isActive: !record.is_active });
    if (!result.success) setError(result.error ?? "Durum güncellenemedi");
    else await loadRedirects();
  };

  const remove = async (record: RedirectRecord) => {
    if (!window.confirm(`/${record.source_path.replace(/^\//, "")} yönlendirmesi silinsin mi?`)) return;
    const result = await deleteRedirect(record.id);
    if (!result.success) setError(result.error ?? "Yönlendirme silinemedi");
    else {
      setNotice("Yönlendirme silindi.");
      if (editingId === record.id) resetForm();
      await loadRedirects();
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link2 className="h-5 w-5 text-gray-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Yönlendirmeler</h1>
            <p className="text-xs text-gray-500">Eski URL&apos;leri yeni adreslerine yönetin</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadRedirects()}
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

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_150px_auto] md:items-end">
          <label className="block text-xs font-medium text-gray-700">
            Kaynak URL
            <input
              required
              value={form.sourcePath}
              onChange={(event) => setForm({ ...form, sourcePath: event.target.value })}
              placeholder="/eski-adres"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs outline-none focus:border-gray-500"
            />
          </label>
          <ArrowRight className="hidden h-4 w-4 text-gray-400 md:block" />
          <label className="block text-xs font-medium text-gray-700">
            Hedef URL
            <input
              required
              value={form.targetPath}
              onChange={(event) => setForm({ ...form, targetPath: event.target.value })}
              placeholder="/yeni-adres"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs outline-none focus:border-gray-500"
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            HTTP durumu
            <select
              value={form.statusCode}
              onChange={(event) => setForm({ ...form, statusCode: Number(event.target.value) as 301 | 302 | 307 | 308 })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
            >
              <option value={301}>301 Kalıcı</option>
              <option value={302}>302 Geçici</option>
              <option value={307}>307 Geçici</option>
              <option value={308}>308 Kalıcı</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button disabled={saving} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50">
              {editingId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {editingId ? "Kaydet" : "Ekle"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} title="Düzenlemeyi iptal et" aria-label="Düzenlemeyi iptal et" className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800">Kayıtlı yönlendirmeler</h2>
          <span className="text-xs text-gray-500">{redirects.length} kayıt</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Kaynak</th>
                <th className="px-4 py-3 text-left font-medium">Hedef</th>
                <th className="px-4 py-3 text-left font-medium">Kod</th>
                <th className="px-4 py-3 text-left font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {redirects.length === 0 && !loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Yönlendirme kaydı bulunamadı</td></tr>
              ) : redirects.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-800">{record.source_path}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{record.target_path}</td>
                  <td className="px-4 py-3 text-gray-600">{record.status_code}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggleActive(record)}
                      aria-pressed={record.is_active}
                      className={`rounded px-2 py-1 text-[10px] font-medium ${record.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {record.is_active ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => edit(record)} title="Düzenle" aria-label={`${record.source_path} yönlendirmesini düzenle`} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => void remove(record)} title="Sil" aria-label={`${record.source_path} yönlendirmesini sil`} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
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