"use client";

import { useState, useEffect } from "react";
import { Globe, RefreshCw, Eye, EyeOff, ArrowUp, ArrowDown, PenLine } from "lucide-react";
import HizmetlerEditPanel, { type ServiceRow } from "./HizmetlerEditPanel";
import { getService } from "@/app/_actions/admin-services-actions";

type Service = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export default function HizmetlerClient() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [loadingEdit, setLoadingEdit] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/services");
      const j = await r.json();
      if (j.ok) setServices(j.services || []);
      else setError(j.error || "Veri alınamadı");
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggleActive = async (id: number, current: boolean) => {
    const r = await fetch("/api/admin/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
    if (r.ok) await load();
  };

  const handleReorder = async (id: number, direction: "up" | "down") => {
    const r = await fetch("/api/admin/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reorder: direction }),
    });
    if (r.ok) await load();
  };

  const handleEdit = async (id: number) => {
    setLoadingEdit(id);
    const result = await getService(id);
    setLoadingEdit(null);
    if (result.success && result.service) {
      setEditingService(result.service as ServiceRow);
    }
  };

  return (
    <>
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-gray-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Hizmetler</h1>
            <p className="text-xs text-gray-500">Hizmet sayfalarını yönet</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] text-gray-500 hover:text-gray-900 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">#</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Başlık</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Slug</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Durum</th>
              <th className="px-4 py-2 text-right text-gray-500 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Yükleniyor...</td></tr>
            ) : services.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Hizmet bulunamadı</td></tr>
            ) : services.map((s, idx) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-400 font-mono">{s.sort_order}</td>
                <td className="px-4 py-2.5">
                  <p className="text-gray-900 font-medium">{s.title}</p>
                  {s.subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{s.subtitle}</p>}
                </td>
                <td className="px-4 py-2.5 font-mono text-gray-500">/hizmetler/{s.slug}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${s.is_active ? "bg-gray-100 text-gray-900" : "bg-gray-50 text-gray-400"}`}>
                    {s.is_active ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleReorder(s.id, "up")} disabled={idx === 0} className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-20"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => handleReorder(s.id, "down")} disabled={idx === services.length - 1} className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-20"><ArrowDown className="w-3 h-3" /></button>
                    <button onClick={() => handleToggleActive(s.id, s.is_active)} className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                      {s.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => handleEdit(s.id)}
                      disabled={loadingEdit === s.id}
                      title="Düzenle"
                      className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40"
                    >
                      {loadingEdit === s.id
                        ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        : <PenLine className="w-3 h-3" />}
                    </button>
                    <a href={`/hizmetler/${s.slug}`} target="_blank" rel="noopener" className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-400">Hizmet içerikleri veritabanından otomatik yüklenir. Sıralama ve durum yönetimi buradan yapılabilir.</p>
    </div>

    {editingService && (
      <HizmetlerEditPanel
        service={editingService}
        onClose={() => setEditingService(null)}
        onSaved={() => { setEditingService(null); load(); }}
      />
    )}
    </>
  );
}