"use client";

import { useState, useEffect } from "react";
import { Shield, Filter, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";

type Log = {
  id: number;
  event_type: string;
  ip_address: string | null;
  endpoint: string | null;
  severity: string;
  is_blocked: boolean;
  created_at: string;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

const EVENT: Record<string, string> = {
  brute_force: "Brute Force", rate_limit: "Rate Limit", csrf_fail: "CSRF",
  sql_inject_attempt: "SQL Injection", xss_attempt: "XSS", unauthorized_access: "Yetkisiz Erişim",
  suspicious_ip: "Şüpheli IP", bot_detected: "Bot Tespit",
};

export default function SecurityLogsClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("");
  const [eventType, setEventType] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), days: String(days) });
      if (severity) p.set("severity", severity);
      if (eventType) p.set("event_type", eventType);
      if (ipAddress) p.set("ip_address", ipAddress);
      const r = await fetch(`/api/admin/security-logs?${p}`);
      const j = await r.json();
      setLogs(j.logs || []);
      setPagination(j.pagination);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, severity, eventType, days]);

  const handleCleanup = async () => {
    if (!confirm(`${days} günden eski loglar silinsin mi?`)) return;
    const r = await fetch(`/api/admin/security-logs?days=${days}`, { method: "DELETE" });
    const j = await r.json();
    if (j.ok) fetchLogs();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-gray-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Güvenlik Günlükleri</h1>
          <p className="text-xs text-gray-500">{pagination ? `${pagination.total} toplam kayıt` : "Yükleniyor..."}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[11px] text-gray-500 font-medium">Filtreler</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Seviye</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="input">
              <option value="">Tümü</option>
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
              <option value="critical">Kritik</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Olay</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="input">
              <option value="">Tümü</option>
              {Object.entries(EVENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">IP</label>
            <input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="192.168.1.1" className="input" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Son X gün</label>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input">
              <option value={1}>1</option><option value={7}>7</option><option value={30}>30</option><option value={90}>90</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => { setPage(1); fetchLogs(); }} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-100 text-xs text-gray-900 hover:bg-gray-100"><Search className="w-3.5 h-3.5" /> Ara</button>
            <button onClick={handleCleanup} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Seviye</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Olay</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">IP</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Hedef</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Engellendi</th>
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Yükleniyor...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Kayıt yok</td></tr>
            ) : logs.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-2"><span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-900">{l.severity.toUpperCase()}</span></td>
                <td className="px-4 py-2 text-gray-500">{EVENT[l.event_type] || l.event_type}</td>
                <td className="px-4 py-2 font-mono text-gray-900">{l.ip_address || "-"}</td>
                <td className="px-4 py-2 font-mono text-gray-500 truncate max-w-[180px]">{l.endpoint || "-"}</td>
                <td className="px-4 py-2">
                  {l.is_blocked ? <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-900">Evet</span> : <span className="text-gray-400">Hayır</span>}
                </td>
                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString("tr-TR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-400">Sayfa {pagination.page}/{pagination.totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-gray-900 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(Math.min(pagination.totalPages, page + 1))} disabled={page >= pagination.totalPages} className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-gray-900 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
