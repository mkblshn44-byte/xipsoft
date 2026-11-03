"use client";

import { useState, useEffect } from "react";
import { Zap, Play, RefreshCw, CheckCircle, XCircle } from "lucide-react";

type JobResult = { name: string; status: "success" | "error" | "skipped"; message: string; duration: number };

const LABELS: Record<string, string> = {
  health_check: "Sistem Kontrol", cleanup_visitors: "Ziyaretçi Temizlik", cleanup_security_logs: "Log Temizlik",
  cleanup_expired_blocks: "IP Engel Temizlik", cleanup_csrf_tokens: "CSRF Temizlik", daily_stats: "Günlük İstatistik",
};

const SCHEDULES: Record<string, string> = {
  health_check: "Her istek", cleanup_visitors: "Haftalık", cleanup_security_logs: "Haftalık",
  cleanup_expired_blocks: "Günlük", cleanup_csrf_tokens: "Günlük", daily_stats: "Günlük 09:00",
};

export default function AutomationClient() {
  const [jobs, setJobs] = useState<string[]>([]);
  const [results, setResults] = useState<JobResult[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/admin/automation"); const j = await r.json(); if (j.ok) setJobs(j.jobs || []); } catch {}
      setLoading(false);
    })();
  }, []);

  const runJob = async (name?: string) => {
    setRunning(true);
    setResults([]);
    try {
      const r = await fetch("/api/admin/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job: name }) });
      const j = await r.json();
      if (j.ok) setResults(j.results || []);
    } catch {}
    setRunning(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-gray-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Otomasyon</h1>
            <p className="text-xs text-gray-500">Zamanlanmış işler ve bakım görevleri</p>
          </div>
        </div>
        <button onClick={() => runJob()} disabled={running} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-100 text-xs text-gray-900 hover:bg-gray-100 disabled:opacity-50">
          <Play className="w-3.5 h-3.5" /> {running ? "Çalıştırılıyor..." : "Tümünü Çalıştır"}
        </button>
      </div>

      {loading ? <p className="text-xs text-gray-400">Yükleniyor...</p> : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div>
                <h3 className="text-xs font-medium text-gray-700">{LABELS[job] || job}</h3>
                <p className="text-[10px] text-gray-400">{SCHEDULES[job] || "Tanımlı değil"}</p>
              </div>
              <button onClick={() => runJob(job)} disabled={running} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] text-gray-500 hover:text-gray-900 disabled:opacity-50">
                <Play className="w-3 h-3" /> Çalıştır
              </button>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 mb-2">Sonuçlar</h2>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200">
              {r.status === "success" ? <CheckCircle className="w-4 h-4 text-gray-500 shrink-0" /> : <XCircle className="w-4 h-4 text-gray-900 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700">{LABELS[r.name] || r.name}</p>
                <p className="text-[10px] text-gray-400">{r.message}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500">{r.status === "success" ? "OK" : "HATA"}</span>
                <p className="text-[9px] text-gray-400">{r.duration}ms</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
