"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Gauge } from "lucide-react";

type WebVital = { metric: string; value: number; unit: string; target: number; status: "good" | "needs-improvement" | "poor" };
type PageSpeedData = { score: number; strategy: string; metrics: WebVital[]; opportunities: { title: string; description: string; savings: string }[]; fetchedAt: string };
type AuditItem = { category: string; name: string; status: "ok" | "warning" | "error"; message: string; fix?: string };
type AuditSummary = { total: number; ok: number; warnings: number; errors: number; score: number };

export default function SEOClient() {
  const [pageSpeed, setPageSpeed] = useState<PageSpeedData | null>(null);
  const [audit, setAudit] = useState<{ audit: AuditItem[]; summary: AuditSummary } | null>(null);
  const [loading, setLoading] = useState({ pagespeed: false, audit: false });
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");

  const fetchPageSpeed = async () => {
    setLoading((l) => ({ ...l, pagespeed: true }));
    try {
      const r = await fetch(`/api/admin/seo/pagespeed?strategy=${strategy}`);
      const j = await r.json();
      if (j.ok) setPageSpeed(j.data);
    } catch {}
    setLoading((l) => ({ ...l, pagespeed: false }));
  };

  const fetchAudit = async () => {
    setLoading((l) => ({ ...l, audit: true }));
    try {
      const r = await fetch("/api/admin/seo/audit");
      const j = await r.json();
      if (j.ok) setAudit({ audit: j.audit, summary: j.summary });
    } catch {}
    setLoading((l) => ({ ...l, audit: false }));
  };

  useEffect(() => { fetchAudit(); }, []);

  const scoreColor = (s: number) => s >= 90 ? "text-gray-900" : s >= 50 ? "text-gray-500" : "text-gray-400";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-gray-500" />
            <h2 className="text-xs font-semibold text-gray-700">Core Web Vitals</h2>
          </div>
          <div className="flex items-center gap-2">
            <select value={strategy} onChange={(e) => setStrategy(e.target.value as any)} className="input w-auto text-[11px]">
              <option value="mobile">Mobil</option>
              <option value="desktop">Masaüstü</option>
            </select>
            <button onClick={fetchPageSpeed} disabled={loading.pagespeed} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-[11px] text-gray-900 hover:bg-gray-100 disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${loading.pagespeed ? "animate-spin" : ""}`} />
              {loading.pagespeed ? "Analiz..." : "Analiz Et"}
            </button>
          </div>
        </div>
        {!pageSpeed && !loading.pagespeed && <p className="text-xs text-gray-400">Analiz için yukarıdaki butona tıklayın.</p>}
        {pageSpeed && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-3xl font-bold ${scoreColor(pageSpeed.score)}`}>{pageSpeed.score}</div>
              <div className="text-[11px] text-gray-500">Performans puanı ({pageSpeed.strategy})<br />{new Date(pageSpeed.fetchedAt).toLocaleString("tr-TR")}</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {pageSpeed.metrics.map((m) => (
                <div key={m.metric} className="rounded-lg border border-gray-200 p-3">
                  <div className="text-[10px] text-gray-500 mb-1">{m.metric}</div>
                  <div className="text-sm font-bold text-gray-900">{m.unit === "s" ? `${(m.value / 1000).toFixed(2)}s` : m.unit === "ms" ? `${Math.round(m.value)}ms` : m.value.toFixed(3)}</div>
                  <div className="text-[9px] text-gray-400">Hedef: {m.unit === "s" ? `${m.target}s` : m.unit === "ms" ? `${m.target}ms` : m.target}</div>
                </div>
              ))}
            </div>
            {pageSpeed.opportunities.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-[10px] text-gray-500 font-medium uppercase">Öneriler</h3>
                {pageSpeed.opportunities.map((o, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-700">{o.title}</span>
                      <span className="text-[10px] text-gray-500">{o.savings}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{o.description}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-gray-700">SEO Denetimi</h2>
          <button onClick={fetchAudit} disabled={loading.audit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-[11px] text-gray-900 hover:bg-gray-100 disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${loading.audit ? "animate-spin" : ""}`} />
            {loading.audit ? "Denetleniyor..." : "Denetle"}
          </button>
        </div>
        {audit && (
          <>
            <div className="flex items-center gap-6 mb-4 p-3 rounded-lg border border-gray-200">
              <div className="text-center">
                <div className={`text-xl font-bold ${scoreColor(audit.summary.score)}`}>{audit.summary.score}</div>
                <div className="text-[9px] text-gray-400">Puan</div>
              </div>
              <div className="flex gap-3 text-[11px] text-gray-500">
                <span>{audit.summary.ok} iyi</span>
                <span>{audit.summary.warnings} uyarı</span>
                <span>{audit.summary.errors} hata</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {audit.audit.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg border border-gray-200">
                  {item.status === "ok" ? <CheckCircle className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" /> : item.status === "warning" ? <AlertTriangle className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-gray-900 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{item.category}</span>
                      <span className="text-xs text-gray-700">{item.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">{item.message}</p>
                    {item.fix && <p className="text-[10px] text-gray-500 mt-0.5">Öneri: {item.fix}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {!audit && !loading.audit && <p className="text-xs text-gray-400">Denetim için "Denetle" butonuna tıklayın.</p>}
      </div>
    </div>
  );
}
