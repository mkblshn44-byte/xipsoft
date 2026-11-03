"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  RefreshCw,
  ReceiptText,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  getTeklifDetailAction,
  getTekliflerAction,
  saveTeklifAction,
  type TeklifDetail,
} from "@/app/_actions/admin-teklif-actions";
import {
  TEKLIF_STATUS_META,
  formatTry,
  type Teklif,
  type TeklifItem,
  type TeklifStatus,
} from "@/lib/teklif-shared";

const STATUS_ORDER: TeklifStatus[] = [
  "pending",
  "quoted",
  "payment_reported",
  "paid",
  "in_progress",
  "completed",
  "rejected",
];

const TONE_CLASS: Record<string, string> = {
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-violet-50 text-violet-700 border-violet-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  muted: "bg-gray-50 text-gray-600 border-gray-200",
};

const PAYMENT_METHODS = [
  { value: "", label: "—" },
  { value: "havale", label: "Havale / EFT" },
  { value: "link", label: "Ödeme linki" },
];

interface ItemDraft {
  title: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

function toDrafts(items: TeklifItem[]): ItemDraft[] {
  if (items.length === 0) return [];
  return items.map((item) => ({
    title: item.title,
    description: item.description ?? "",
    quantity: String(item.quantity ?? 1),
    unitPrice: String(item.unitPrice ?? 0),
  }));
}

interface Draft {
  status: TeklifStatus;
  price: string;
  paymentMethod: string;
  paymentUrl: string;
  items: ItemDraft[];
  note: string;
}

function draftFrom(teklif: Teklif): Draft {
  return {
    status: teklif.status,
    price: teklif.price ?? "",
    paymentMethod: teklif.payment_method ?? "",
    paymentUrl: teklif.payment_url ?? "",
    items: toDrafts(teklif.items),
    note: "",
  };
}

export default function AdminTekliflerClient() {
  const [teklifler, setTeklifler] = useState<Teklif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [detail, setDetail] = useState<TeklifDetail | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getTekliflerAction();
    if (res.success) setTeklifler(res.data);
    else setError(res.error || "Teklifler yüklenemedi");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const open = teklifler.filter((t) =>
      ["pending", "quoted", "payment_reported"].includes(t.status),
    ).length;
    const paid = teklifler.filter((t) => ["paid", "in_progress", "completed"].includes(t.status)).length;
    return { total: teklifler.length, open, paid };
  }, [teklifler]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return teklifler.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!needle) return true;
      return [t.name, t.email, t.service, t.reference_code ?? "", String(t.id)]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [teklifler, search, statusFilter]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setSaveError("");
    const res = await getTeklifDetailAction(id);
    if (res.success && res.data) {
      setDetail(res.data);
      setDraft(draftFrom(res.data.teklif));
    } else {
      setSaveError(res.error || "Detay yüklenemedi");
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setDetail(null);
    setDraft(null);
    setSaveError("");
  };

  const save = async () => {
    if (!detail || !draft) return;
    setSaving(true);
    setSaveError("");

    const items = draft.items
      .filter((item) => item.title.trim().length > 0)
      .map((item) => ({
        title: item.title.trim(),
        description: item.description.trim(),
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
      }));

    const res = await saveTeklifAction({
      id: detail.teklif.id,
      status: draft.status,
      price: draft.price.trim() === "" ? null : Number(draft.price),
      payment_method: draft.paymentMethod || null,
      payment_url: draft.paymentUrl.trim() || "",
      items,
      note: draft.note.trim(),
    });

    setSaving(false);
    if (!res.success) {
      setSaveError(res.error || "Kaydedilemedi");
      return;
    }
    await load();
    await openDetail(detail.teklif.id);
  };

  const updateItem = (index: number, patch: Partial<ItemDraft>) => {
    setDraft((prev) =>
      prev
        ? { ...prev, items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }
        : prev,
    );
  };

  const addItem = () =>
    setDraft((prev) =>
      prev
        ? { ...prev, items: [...prev.items, { title: "", description: "", quantity: "1", unitPrice: "" }] }
        : prev,
    );

  const removeItem = (index: number) =>
    setDraft((prev) =>
      prev ? { ...prev, items: prev.items.filter((_, i) => i !== index) } : prev,
    );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ReceiptText className="w-5 h-5 text-violet-600" />
          <h1 className="text-lg font-semibold text-gray-800">Teklifler</h1>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Toplam Teklif" value={stats.total} />
        <StatCard label="Devam Eden" value={stats.open} accent="amber" />
        <StatCard label="Ödeme/Proje" value={stats.paid} accent="emerald" />
      </div>

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, e-posta, hizmet veya referans ara..."
            className="input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input sm:w-48"
        >
          <option value="all">Tüm Durumlar</option>
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {TEKLIF_STATUS_META[status].label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Liste */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5 font-medium">Referans</th>
              <th className="px-3 py-2.5 font-medium">Müşteri</th>
              <th className="px-3 py-2.5 font-medium hidden md:table-cell">Hizmet</th>
              <th className="px-3 py-2.5 font-medium text-right">Tutar</th>
              <th className="px-3 py-2.5 font-medium">Durum</th>
              <th className="px-4 py-2.5 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Kayıt bulunamadı
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-gray-700">
                      {t.reference_code ?? `#${t.id}`}
                    </span>
                    <p className="text-[11px] text-gray-400">
                      {new Date(t.created_at).toLocaleDateString("tr-TR")}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-800">{t.name}</p>
                    <p className="text-[11px] text-gray-400">{t.email}</p>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell text-gray-600">{t.service}</td>
                  <td className="px-3 py-3 text-right font-mono text-gray-700">
                    {t.price ? formatTry(t.price) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(t.id)}
                      className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                    >
                      Yönet
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detay modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-800">
                {detail ? `Teklif ${detail.teklif.reference_code ?? `#${detail.teklif.id}`}` : "Yükleniyor..."}
              </h2>
              <button
                type="button"
                onClick={closeDetail}
                aria-label="Kapat"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading || !detail || !draft ? (
              <div className="p-10 text-center text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </div>
            ) : (
              <div className="space-y-6 p-5">
                {/* Müşteri bilgisi */}
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
                  <Info label="Müşteri" value={detail.teklif.name} />
                  <Info label="E-posta" value={detail.teklif.email} />
                  <Info label="Telefon" value={detail.teklif.phone || "—"} />
                  <Info label="Hizmet" value={detail.teklif.service} />
                  {detail.teklif.detail && (
                    <div className="sm:col-span-2">
                      <Info label="Talep Detayı" value={detail.teklif.detail} />
                    </div>
                  )}
                </div>

                {/* Durum / ödeme */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label>Durum</Label>
                    <select
                      value={draft.status}
                      onChange={(e) => setDraft({ ...draft, status: e.target.value as TeklifStatus })}
                      className="input"
                    >
                      {STATUS_ORDER.map((status) => (
                        <option key={status} value={status}>
                          {TEKLIF_STATUS_META[status].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Toplam Fiyat (₺)</Label>
                    <input
                      type="number"
                      min={0}
                      value={draft.price}
                      onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                      placeholder="0"
                      className="input"
                    />
                  </div>
                  <div>
                    <Label>Ödeme Yöntemi</Label>
                    <select
                      value={draft.paymentMethod}
                      onChange={(e) => setDraft({ ...draft, paymentMethod: e.target.value })}
                      className="input"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Ödeme Linki (opsiyonel)</Label>
                  <input
                    type="url"
                    value={draft.paymentUrl}
                    onChange={(e) => setDraft({ ...draft, paymentUrl: e.target.value })}
                    placeholder="https://..."
                    className="input"
                  />
                </div>

                {/* Kalemler */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label>Kalemler</Label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-100"
                    >
                      <Plus className="w-3 h-3" /> Kalem Ekle
                    </button>
                  </div>

                  {draft.items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400">
                      Kalem yok. Fiyat girip kaydettiğinizde müşteri tek satırlık özet görür.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {draft.items.map((item, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-12 gap-2 rounded-lg border border-gray-200 p-2"
                        >
                          <input
                            value={item.title}
                            onChange={(e) => updateItem(index, { title: e.target.value })}
                            placeholder="Kalem başlığı"
                            className="input col-span-12 sm:col-span-5"
                          />
                          <input
                            value={item.description}
                            onChange={(e) => updateItem(index, { description: e.target.value })}
                            placeholder="Açıklama"
                            className="input col-span-12 sm:col-span-4"
                          />
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, { quantity: e.target.value })}
                            placeholder="Adet"
                            className="input col-span-4 sm:col-span-1"
                          />
                          <input
                            type="number"
                            min={0}
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                            placeholder="Birim ₺"
                            className="input col-span-6 sm:col-span-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            aria-label="Kalemi sil"
                            className="col-span-2 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 sm:col-span-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Not (süreç geçmişine eklenir)</Label>
                  <textarea
                    value={draft.note}
                    onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                    rows={2}
                    placeholder="Örn: Fiyat müşteri ile telefonda teyit edildi."
                    className="input resize-none"
                  />
                </div>

                {/* Süreç geçmişi */}
                {detail.events.length > 0 && (
                  <div>
                    <Label>Süreç Geçmişi</Label>
                    <ol className="space-y-1.5">
                      {detail.events.map((event, index) => (
                        <li
                          key={`${event.status}-${index}`}
                          className="flex items-center justify-between gap-3 text-xs text-gray-600"
                        >
                          <span className="font-medium">
                            {TEKLIF_STATUS_META[event.status]?.label ?? event.status}
                            {event.note ? <span className="ml-2 text-gray-400">{event.note}</span> : null}
                          </span>
                          <time className="text-gray-400">
                            {new Date(event.created_at).toLocaleString("tr-TR")}
                          </time>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {saveError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {saveError}
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    Kapat
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Kaydet
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "emerald";
}) {
  const color =
    accent === "amber" ? "text-amber-600" : accent === "emerald" ? "text-emerald-600" : "text-gray-800";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: TeklifStatus }) {
  const meta = TEKLIF_STATUS_META[status];
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        TONE_CLASS[meta.tone] ?? TONE_CLASS.muted
      }`}
    >
      {meta.label}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className="break-words text-xs text-gray-700">{value}</p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-[11px] font-medium text-gray-500">{children}</p>;
}
