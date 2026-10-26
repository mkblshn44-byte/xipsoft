"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity, Database, HardDrive, Cpu, Clock, RefreshCw,
  AlertTriangle, Globe, Users, Eye, Bot, Monitor,
  Smartphone, Tablet, ShieldBan, MapPin, TrendingUp,
  Trash2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Health = {
  status: string;
  timestamp: string;
  checks: {
    database: { status: string; latency?: number; error?: string };
    redis:    { status: string };
    memory:   { heapUsed: string; heapTotal: string; heapUsedPercent: number };
    cpu:      { percent: number; user: number; system: number };
    uptime:   number;
    eventLoopLag: number;
  };
};

type Analytics = {
  period_days: number;
  summary: {
    total_visits: number;
    unique_ips: number;
    bot_visits: number;
    human_visits: number;
    today_visits: number;
    last_hour_visits: number;
    average_duration_seconds: number | null;
    average_transfer_bytes: number | null;
  } | null;
  by_country: { country_code: string; visits: number; unique_ips: number }[];
  by_device:  { device: string; visits: number }[];
  by_browser: { browser: string; visits: number }[];
  by_os:      { os: string; visits: number }[];
  top_pages:  {
    path: string; visits: number; unique_ips: number;
    average_duration_seconds: number | null; average_transfer_bytes: number | null;
  }[];
  top_referrers: { referrer: string; visits: number }[];
  daily:      { date: string; visits: number; unique_ips: number; bot_visits: number }[];
  recent:     {
    id: number; ip_address: string; country: string | null; city: string | null;
    path: string; device_type: string | null; browser: string | null;
    os: string | null; asn: string | null; cf_colo: string | null;
    is_bot: boolean; referrer: string | null; duration_seconds: number | null;
    transfer_bytes: number | string | null; created_at: string;
  }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const FLAG_BASE = "https://flagcdn.com/16x12";

function flag(code: string | null) {
  if (!code || code === "XX" || code.length !== 2) return null;
  return `${FLAG_BASE}/${code.toLowerCase()}.png`;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)} sn`;
  return `${Math.floor(seconds / 60)} dk ${Math.round(seconds % 60)} sn`;
}

function formatBytes(bytes: number | string | null | undefined) {
  if (bytes == null) return "—";
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 1024) return `${Math.round(value)} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function pct(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function uptimeFmt(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}g ${h}sa ${m}dk`;
}

const DEVICE_ICON: Record<string, React.ElementType> = {
  mobile: Smartphone, tablet: Tablet, desktop: Monitor,
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminMonitoringClient() {
  const [tab, setTab]             = useState<"analytics" | "system">("analytics");
  const [days, setDays]           = useState(7);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [health, setHealth]       = useState<Health | null>(null);
  const [loading, setLoading]     = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [deletingVisitId, setDeletingVisitId] = useState<number | null>(null);
  const [clearingVisits, setClearingVisits] = useState(false);
  const [visitActionMessage, setVisitActionMessage] = useState<string | null>(null);
  const intervalRef               = useRef<NodeJS.Timeout | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/analytics?days=${days}`);
      if (r.ok) setAnalytics(await r.json());
    } catch {}
  }, [days]);

  const loadHealth = useCallback(async () => {
    try {
      const r = await fetch("/api/health");
      if (r.ok) setHealth(await r.json());
    } catch {}
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadAnalytics(), loadHealth()]);
    setLoading(false);
  }, [loadAnalytics, loadHealth]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadAll, 30_000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, loadAll]);

  const s = analytics?.summary;
  const totalVisits = s?.total_visits ?? 0;

  const deleteVisit = async (id?: number) => {
    const confirmed = id === undefined
      ? window.confirm("Tüm ziyaretçi geçmişi ve buna bağlı analitik kayıtları kalıcı olarak silinsin mi?")
      : window.confirm("Bu ziyaret kaydı kalıcı olarak silinsin mi?");
    if (!confirmed) return;

    setVisitActionMessage(null);
    if (id === undefined) setClearingVisits(true);
    else setDeletingVisitId(id);

    try {
      const response = await fetch("/api/admin/analytics", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id === undefined ? { all: true } : { id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Ziyaret kaydı silinemedi");

      setVisitActionMessage(`${result.deleted} ziyaret kaydı silindi.`);
      await loadAnalytics();
    } catch (error) {
      setVisitActionMessage(error instanceof Error ? error.message : "Ziyaret kaydı silinemedi");
    } finally {
      setDeletingVisitId(null);
      setClearingVisits(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-gray-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">İzleme & Analitik</h1>
            <p className="text-xs text-gray-500">Ziyaretçi, ülke ve sistem metrikleri</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Gün seçici */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none"
          >
            <option value={1}>Son 24 saat</option>
            <option value={7}>Son 7 gün</option>
            <option value={30}>Son 30 gün</option>
            <option value={90}>Son 90 gün</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Oto (30s)
          </label>
          <button
            onClick={loadAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["analytics", "system"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "analytics" ? <TrendingUp className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
            {t === "analytics" ? "Ziyaretçi Analitik" : "Sistem Sağlığı"}
          </button>
        ))}
      </div>

      {/* ══ ANALYTICS TAB ══════════════════════════════════════════════════ */}
      {tab === "analytics" && (
        <div className="space-y-6">

          {/* Özet kartları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Eye}       label="Toplam Ziyaret"    value={fmt(s?.total_visits ?? 0)} />
            <StatCard icon={Users}     label="Tekil IP"          value={fmt(s?.unique_ips ?? 0)} />
            <StatCard icon={TrendingUp} label="Bugün"            value={fmt(s?.today_visits ?? 0)} />
            <StatCard icon={Clock}     label="Son 1 Saat"        value={fmt(s?.last_hour_visits ?? 0)} />
            <StatCard icon={Clock}     label="Ort. Kalma Süresi" value={formatDuration(s?.average_duration_seconds)} />
            <StatCard icon={Database}  label="Ort. Veri Kullanımı" value={formatBytes(s?.average_transfer_bytes)} />
            <StatCard icon={Users}     label="İnsan"             value={fmt(s?.human_visits ?? 0)}
              sub={pct(s?.human_visits ?? 0, totalVisits)} />
            <StatCard icon={Bot}       label="Bot"               value={fmt(s?.bot_visits ?? 0)}
              sub={pct(s?.bot_visits ?? 0, totalVisits)} />
          </div>

          {/* Ülkeler + Cihazlar */}
          <div className="grid md:grid-cols-2 gap-4">

            {/* Ülkeler */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-700">Ülkelere Göre Ziyaret</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {(analytics?.by_country ?? []).length === 0 ? (
                  <p className="px-4 py-6 text-xs text-gray-400 text-center">Veri yok</p>
                ) : (analytics?.by_country ?? []).map((c) => (
                  <div key={c.country_code} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-8 text-xs font-mono text-gray-500 flex items-center gap-1">
                      {flag(c.country_code) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={flag(c.country_code)!} alt={c.country_code} width={16} height={12} className="inline" />
                      )}
                    </span>
                    <span className="text-xs font-medium text-gray-800 w-8">{c.country_code}</span>
                    <div className="flex-1">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-gray-400"
                          style={{ width: pct(c.visits, totalVisits || 1) }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">{fmt(c.visits)}</span>
                    <span className="text-[10px] text-gray-400 w-8 text-right">{pct(c.visits, totalVisits || 1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cihaz / Tarayıcı / OS */}
            <div className="space-y-4">
              {/* Cihaz */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                  <Monitor className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-700">Cihaz Tipi</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 gap-3">
                  {(analytics?.by_device ?? []).map((d) => {
                    const Icon = DEVICE_ICON[d.device] ?? Monitor;
                    return (
                      <div key={d.device} className="flex flex-col items-center gap-1 py-2">
                        <Icon className="w-5 h-5 text-gray-400" />
                        <span className="text-xs font-bold text-gray-800">{fmt(d.visits)}</span>
                        <span className="text-[10px] text-gray-400 capitalize">{d.device}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tarayıcı */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-700">Tarayıcı</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {(analytics?.by_browser ?? []).slice(0, 5).map((b) => (
                    <div key={b.browser} className="flex items-center justify-between px-4 py-2">
                      <span className="text-xs capitalize text-gray-700">{b.browser}</span>
                      <span className="text-xs text-gray-500">{fmt(b.visits)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Günlük Grafik */}
          {(analytics?.daily ?? []).length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
              <h2 className="text-xs font-semibold text-gray-500 mb-4">Günlük Ziyaretçi Trendi</h2>
              <DailyChart data={analytics!.daily} />
            </div>
          )}

          {/* Top Sayfalar */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Eye className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-700">En Çok Ziyaret Edilen Sayfalar</span>
              </div>
              <table className="w-full text-xs">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Sayfa</th>
                    <th className="px-4 py-2 text-right text-gray-400 font-medium">Ziyaret</th>
                    <th className="px-4 py-2 text-right text-gray-400 font-medium">Tekil IP</th>
                    <th className="px-4 py-2 text-right text-gray-400 font-medium">Ort. Süre</th>
                    <th className="px-4 py-2 text-right text-gray-400 font-medium">Ort. Veri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(analytics?.top_pages ?? []).map((p) => (
                    <tr key={p.path} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700 font-mono truncate max-w-[200px]" title={p.path}>{p.path}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{fmt(p.visits)}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{fmt(p.unique_ips)}</td>
                      <td className="px-4 py-2 text-right text-gray-500 whitespace-nowrap">{formatDuration(p.average_duration_seconds)}</td>
                      <td className="px-4 py-2 text-right text-gray-500 whitespace-nowrap">{formatBytes(p.average_transfer_bytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top Referrers */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-700">Kaynak Siteler</span>
              </div>
              <table className="w-full text-xs">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Kaynak</th>
                    <th className="px-4 py-2 text-right text-gray-400 font-medium">Ziyaret</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(analytics?.top_referrers ?? []).length === 0 ? (
                    <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400">Veri yok</td></tr>
                  ) : (analytics?.top_referrers ?? []).map((r) => (
                    <tr key={r.referrer} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700 truncate max-w-[240px]" title={r.referrer}>{r.referrer}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{fmt(r.visits)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Son Ziyaretçiler */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-700">Son Ziyaretçiler</span>
              <span className="ml-auto text-[10px] text-gray-400">Son 50</span>
              <button
                type="button"
                onClick={() => void deleteVisit()}
                disabled={clearingVisits || !analytics?.recent.length}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {clearingVisits ? "Siliniyor..." : "Tüm ziyaretleri sil"}
              </button>
            </div>
            {visitActionMessage && (
              <p role="status" className="border-b border-gray-100 px-4 py-2 text-xs text-gray-600">{visitActionMessage}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[1050px]">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">IP</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Ülke</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Şehir</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Sayfa</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Cihaz</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Tarayıcı</th>
                    <th className="px-4 py-2 text-right text-gray-400 font-medium">Kalma Süresi</th>
                    <th className="px-4 py-2 text-right text-gray-400 font-medium">Veri Kullanımı</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Ağ (ASN / CF Noktası)</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Bot?</th>
                    <th className="px-4 py-2 text-left text-gray-400 font-medium">Zaman</th>
                    <th className="px-4 py-2 text-right text-gray-400 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(analytics?.recent ?? []).length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-6 text-center text-gray-400">Veri yok</td></tr>
                  ) : (analytics?.recent ?? []).map((v) => (
                    <tr key={v.id} className={`hover:bg-gray-50 ${v.is_bot ? "opacity-50" : ""}`}>
                      <td className="px-4 py-2 font-mono text-gray-800">{v.ip_address}</td>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-1">
                          {flag(v.country) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={flag(v.country)!} alt={v.country ?? ""} width={16} height={12} />
                          )}
                          <span className="text-gray-600">{v.country ?? "—"}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{v.city ?? "—"}</td>
                      <td className="px-4 py-2 text-gray-700 font-mono truncate max-w-[160px]" title={v.path}>{v.path}</td>
                      <td className="px-4 py-2 text-gray-500 capitalize">{v.device_type ?? "—"}</td>
                      <td className="px-4 py-2 text-gray-500 capitalize">{v.browser ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-gray-500 whitespace-nowrap">{formatDuration(v.duration_seconds)}</td>
                      <td className="px-4 py-2 text-right text-gray-500 whitespace-nowrap">{formatBytes(v.transfer_bytes)}</td>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                        {v.asn ? `ASN ${v.asn}` : "ASN —"}
                        {" / "}
                        {v.cf_colo ? `CF ${v.cf_colo}` : "CF —"}
                      </td>
                      <td className="px-4 py-2">
                        {v.is_bot && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 flex items-center gap-1 w-fit">
                            <Bot className="w-3 h-3" /> Bot
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                        {new Date(v.created_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => void deleteVisit(v.id)}
                          disabled={deletingVisitId === v.id || clearingVisits}
                          title="Ziyaret kaydını sil"
                          aria-label={`${v.ip_address} ziyaret kaydını sil`}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* IP Engelleme Hızlı Erişim */}
          <QuickBlock />
        </div>
      )}

      {/* ══ SYSTEM TAB ═════════════════════════════════════════════════════ */}
      {tab === "system" && <SystemHealth health={health} loading={loading} />}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-[10px] text-gray-400 font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      {sub && <span className="text-[10px] text-gray-400">{sub}</span>}
    </div>
  );
}

// ── Daily Chart (pure CSS bar chart) ─────────────────────────────────────────

function DailyChart({ data }: { data: Analytics["daily"] }) {
  const sorted  = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const maxVal  = Math.max(...sorted.map((d) => d.visits), 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {sorted.map((d) => {
        const h    = Math.max(4, Math.round((d.visits / maxVal) * 112));
        const botH = Math.max(0, Math.round((d.bot_visits / maxVal) * 112));
        const label = new Date(d.date).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
            >
              {label}: {d.visits} ziyaret ({d.bot_visits} bot)
            </div>
            <div className="relative w-full" style={{ height: `${h}px` }}>
              <div className="absolute inset-0 bg-gray-200 rounded-sm" />
              <div
                className="absolute bottom-0 inset-x-0 bg-gray-400 rounded-sm"
                style={{ height: `${botH}px` }}
              />
            </div>
            <span className="text-[9px] text-gray-400 rotate-45 origin-left">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Quick IP Block ────────────────────────────────────────────────────────────

function QuickBlock() {
  const [ip, setIp]           = useState("");
  const [reason, setReason]   = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState<string | null>(null);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/ip-blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip_address: ip.trim(), reason: reason || "Manuel engel", is_permanent: true }),
      });
      setMsg(r.ok ? `✓ ${ip} engellendi` : "Hata oluştu");
      if (r.ok) { setIp(""); setReason(""); }
    } catch {
      setMsg("Bağlantı hatası");
    }
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldBan className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-semibold text-gray-700">Hızlı IP Engelle</span>
      </div>
      <form onSubmit={handle} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[10px] text-gray-400 mb-1">IP Adresi</label>
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="1.2.3.4"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-gray-400 w-44"
            required
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 mb-1">Sebep</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="İsteğe bağlı"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-gray-400 w-44"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-900 text-xs text-white hover:bg-gray-700 disabled:opacity-50"
        >
          <ShieldBan className="w-3.5 h-3.5" />
          {loading ? "Engelleniyor..." : "Engelle"}
        </button>
        {msg && <span className="text-xs text-gray-600">{msg}</span>}
      </form>
    </div>
  );
}

// ── System Health ─────────────────────────────────────────────────────────────

function SystemHealth({ health, loading }: { health: Health | null; loading: boolean }) {
  return (
    <div className="space-y-6">
      {health && (
        <div className={`rounded-xl border p-4 ${health.status === "ok" ? "border-gray-200 bg-gray-50" : "border-gray-300 bg-gray-50"}`}>
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {health.status === "ok" ? "Sistem Sağlıklı" : health.status === "degraded" ? "Kısmi Sorun" : "Çevrimdışı"}
              </p>
              <p className="text-[11px] text-gray-500">{new Date(health.timestamp).toLocaleString("tr-TR")}</p>
            </div>
          </div>
        </div>
      )}

      {health?.checks?.memory?.heapUsedPercent != null && health.checks.memory.heapUsedPercent > 85 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">Yüksek bellek: %{health.checks.memory.heapUsedPercent}</span>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <SysCard icon={Database} title="Veritabanı">
          {health?.checks?.database ? (
            <p className={`text-xs ${health.checks.database.status === "ok" ? "text-gray-700" : "text-gray-900"}`}>
              {health.checks.database.status === "ok"
                ? `Bağlı — ${health.checks.database.latency}ms`
                : `Hata: ${health.checks.database.error}`}
            </p>
          ) : <Skeleton />}
        </SysCard>

        <SysCard icon={Database} title="Redis">
          {health?.checks?.redis ? (
            <p className={`text-xs ${health.checks.redis.status === "ok" ? "text-gray-700" : "text-gray-500"}`}>
              {health.checks.redis.status === "ok" ? "Bağlı" : "Yapılandırılmamış"}
            </p>
          ) : <Skeleton />}
        </SysCard>

        <SysCard icon={Cpu} title="CPU">
          {health?.checks?.cpu ? (
            <p className="text-xs text-gray-700">
              %{health.checks.cpu.percent} — {health.checks.cpu.user}ms / {health.checks.cpu.system}ms
            </p>
          ) : <Skeleton />}
        </SysCard>

        <SysCard icon={HardDrive} title="Bellek">
          {health?.checks?.memory ? (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-700">
                {health.checks.memory.heapUsed} / {health.checks.memory.heapTotal} (%{health.checks.memory.heapUsedPercent})
              </p>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    health.checks.memory.heapUsedPercent > 85 ? "bg-gray-900"
                    : health.checks.memory.heapUsedPercent > 60 ? "bg-gray-500"
                    : "bg-gray-300"
                  }`}
                  style={{ width: `${Math.min(100, health.checks.memory.heapUsedPercent)}%` }}
                />
              </div>
            </div>
          ) : <Skeleton />}
        </SysCard>

        <SysCard icon={Clock} title="Uptime">
          {health?.checks?.uptime ? (
            <p className="text-xs text-gray-700">{uptimeFmt(health.checks.uptime)}</p>
          ) : <Skeleton />}
        </SysCard>

        <SysCard icon={Activity} title="Event Loop Lag">
          {health?.checks?.eventLoopLag != null ? (
            <div>
              <p className="text-xs text-gray-700">{health.checks.eventLoopLag}ms</p>
              <p className="text-[10px] text-gray-400">
                {health.checks.eventLoopLag < 50 ? "Sağlıklı"
                  : health.checks.eventLoopLag < 200 ? "Yüksek"
                  : "Kritik"}
              </p>
            </div>
          ) : <Skeleton />}
        </SysCard>
      </div>
    </div>
  );
}

function SysCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <h3 className="text-[11px] text-gray-500 font-medium">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Skeleton() {
  return <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />;
}
