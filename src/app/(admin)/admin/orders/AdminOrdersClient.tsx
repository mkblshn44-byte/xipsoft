"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, RefreshCw, Search, ChevronDown, Loader2, X } from "lucide-react";
import { getOrdersAction, updateOrderStatusAction, type Order } from "@/app/_actions/admin-orders-actions";

const STATUS: Record<string, string> = {
  pending: "Bekliyor", processing: "İşleniyor", completed: "Tamamlandı", cancelled: "İptal", refunded: "İade",
};
const ALL_STATUSES = ["pending", "processing", "completed", "cancelled", "refunded"];

function fmt(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n ?? 0);
}

export default function AdminOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getOrdersAction();
    if (res.success) setOrders(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id: string, s: string) => {
    setUpdating(id);
    const res = await updateOrderStatusAction(id, s);
    if (res.success) {
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: s } : o));
      if (selected?.id === id) setSelected((p) => p ? { ...p, status: s } : p);
    }
    setUpdating(null);
  };

  const filtered = orders.filter((o) => {
    const ms = statusFilter === "all" || o.status === statusFilter;
    const t = search.toLowerCase();
    const ml = !search || o.order_number?.toLowerCase().includes(t) || o.customer_name?.toLowerCase().includes(t) || o.customer_email?.toLowerCase().includes(t);
    return ms && ml;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    completed: orders.filter((o) => o.status === "completed").length,
    revenue: orders.filter((o) => o.status === "completed").reduce((s, o) => s + (o.total_amount ?? 0), 0),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-gray-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Siparişler</h1>
            <p className="text-xs text-gray-500">Müşteri siparişlerini görüntüle ve yönet</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Toplam", v: stats.total },
          { label: "Bekleyen", v: stats.pending },
          { label: "Tamamlanan", v: stats.completed },
          { label: "Gelir", v: fmt(stats.revenue) },
        ].map(({ label, v }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white shadow-sm p-3">
            <p className="text-[10px] text-gray-500 uppercase">{label}</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sipariş no, müşteri..." className="input pl-9" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto pr-7">
            <option value="all">Tümü</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-xs">Yükleniyor...</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-gray-500 font-medium">No</th>
                <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Müşteri</th>
                <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Tutar</th>
                <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Durum</th>
                <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Tarih</th>
                <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Güncelle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sipariş bulunamadı</td></tr>
              )}
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(o)}>
                  <td className="px-4 py-2.5 font-mono text-gray-900">#{o.order_number ?? o.id?.toString().slice(0, 8)}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-gray-900">{o.customer_name ?? "—"}</p>
                    <p className="text-gray-400">{o.customer_email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-900">{fmt(o.total_amount)}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-900">{STATUS[o.status] ?? o.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(o.created_at).toLocaleDateString("tr-TR")}</td>
                  <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block">
                      <select value={o.status} disabled={updating === o.id} onChange={(e) => handleStatus(o.id, e.target.value)}
                        className="appearance-none rounded bg-white border border-gray-300 px-2 py-1 pr-6 text-[11px] text-gray-900 disabled:opacity-50">
                        {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Sipariş Detayı</h2>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-xs">
              <Row label="No" value={`#${selected.order_number ?? selected.id}`} />
              <Row label="Müşteri" value={selected.customer_name ?? "—"} />
              <Row label="E-posta" value={selected.customer_email ?? "—"} />
              <Row label="Tutar" value={`${fmt(selected.total_amount)} · ${selected.payment_provider ?? "—"}`} />
              <Row label="Durum" value={STATUS[selected.status] ?? selected.status} />
              <Row label="Tarih" value={new Date(selected.created_at).toLocaleString("tr-TR")} />
            </div>
            <div className="pt-3 border-t border-gray-200">
              <label className="block text-[10px] text-gray-500 mb-1">Durum güncelle</label>
              <select value={selected.status} onChange={(e) => handleStatus(selected.id, e.target.value)} className="input">
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}
