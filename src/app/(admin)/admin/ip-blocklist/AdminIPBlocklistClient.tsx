"use client";

import { useState, useEffect } from "react";
import { ShieldBan, Plus, Trash2 } from "lucide-react";

type BlockEntry = { id: number; ip_address: string; reason: string; is_permanent: boolean; expires_at: string | null; created_at: string };

export default function AdminIPBlocklistClient() {
  const [entries, setEntries] = useState<BlockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ip_address: "", reason: "", is_permanent: true, expires_hours: 24 });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await fetch("/api/admin/ip-blocklist"); const j = await r.json(); setEntries(j.blocklist || []); }
    catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try { const r = await fetch("/api/admin/ip-blocklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (r.ok) { setForm({ ip_address: "", reason: "", is_permanent: true, expires_hours: 24 }); await load(); } }
    catch (e: any) { alert(e.message); }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Kaldırılsın mı?")) return;
    await fetch(`/api/admin/ip-blocklist?id=${id}`, { method: "DELETE" });
    await load();
  };

  const handleClearAll = async () => {
    if (!confirm("Geçiciler temizlensin mi?")) return;
    await fetch("/api/admin/ip-blocklist?clearAll=true", { method: "DELETE" });
    await load();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ShieldBan className="w-5 h-5 text-gray-500" />
        <h1 className="text-xl font-bold text-gray-900">IP Engelleme</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">IP Adresi</label>
            <input required value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="192.168.1.1" className="input" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Sebep</label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Spam, saldırı..." className="input" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input type="checkbox" checked={form.is_permanent} onChange={(e) => setForm({ ...form, is_permanent: e.target.checked })} className="rounded border-gray-300 bg-white" />
            Kalıcı
          </label>
          {!form.is_permanent && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <label>Saat:</label>
              <input type="number" min={1} value={form.expires_hours} onChange={(e) => setForm({ ...form, expires_hours: Number(e.target.value) })} className="input w-20" />
            </div>
          )}
          <button type="submit" disabled={submitting} className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-100 text-xs text-gray-900 hover:bg-gray-100 disabled:opacity-50">
            <Plus className="w-3.5 h-3.5" /> {submitting ? "Ekleniyor..." : "Engelle"}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <span className="text-[11px] text-gray-500">{entries.length} kayıt</span>
          {entries.some((e) => !e.is_permanent) && (
            <button onClick={handleClearAll} className="text-[10px] text-gray-500 hover:text-gray-900">Geçicileri temizle</button>
          )}
        </div>
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">IP</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Sebep</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Tür</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Tarih</th>
              <th className="px-4 py-2 text-right text-gray-500 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Yükleniyor...</td></tr>
            : entries.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Kayıt yok</td></tr>
            : entries.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-gray-900">{e.ip_address}</td>
                <td className="px-4 py-2 text-gray-500">{e.reason}</td>
                <td className="px-4 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${e.is_permanent ? "bg-gray-100 text-gray-900" : "bg-gray-50 text-gray-500"}`}>
                    {e.is_permanent ? "Kalıcı" : e.expires_at ? new Date(e.expires_at).toLocaleDateString("tr-TR") : "Süresiz"}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">{new Date(e.created_at).toLocaleString("tr-TR")}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleDelete(e.id)} className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
