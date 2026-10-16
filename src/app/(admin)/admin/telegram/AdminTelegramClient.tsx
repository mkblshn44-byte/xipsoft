"use client";

import { useState, useEffect } from "react";
import { Send, Bot, RefreshCw } from "lucide-react";

export default function AdminTelegramClient() {
  const [botStatus, setBotStatus] = useState<{ configured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [customMsg, setCustomMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [webhookUrl, setWebhookUrl] = useState(
    `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/telegram-webhook`,
  );
  const [webhookResult, setWebhookResult] = useState<string | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "test" }) }); const j = await r.json(); setBotStatus({ configured: j.ok }); }
      catch { setBotStatus({ configured: false }); }
      finally { setLoading(false); }
    })();
    (async () => {
      try { const r = await fetch("/api/admin/telegram-webhook-setup"); const j = await r.json(); if (j.ok) setWebhookInfo(j.webhook); } catch {}
    })();
  }, []);

  const handleSend = async () => {
    if (!customMsg.trim()) return;
    setSending(true);
    setResult(null);
    try { const r = await fetch("/api/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "custom", text: customMsg }) }); setResult(await r.json()); }
    catch { setResult({ ok: false, error: "Bağlantı hatası" }); }
    setSending(false);
  };

  const handleTest = async () => {
    setResult(null);
    try { const r = await fetch("/api/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "test" }) }); setResult(await r.json()); }
    catch { setResult({ ok: false, error: "Bağlantı hatası" }); }
  };

  const handleSetWebhook = async () => {
    setWebhookResult(null);
    try {
      const r = await fetch("/api/admin/telegram-webhook-setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: webhookUrl }) });
      const j = await r.json();
      setWebhookResult(j.ok ? "Webhook ayarlandı" : `Hata: ${j.error}`);
      if (j.ok) { const r2 = await fetch("/api/admin/telegram-webhook-setup"); const j2 = await r2.json(); if (j2.ok) setWebhookInfo(j2.webhook); }
    } catch (e: any) { setWebhookResult(`Hata: ${e.message}`); }
  };

  const handleRemoveWebhook = async () => {
    setWebhookResult(null);
    try {
      const r = await fetch("/api/admin/telegram-webhook-setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remove: true }) });
      const j = await r.json();
      setWebhookResult(j.ok ? "Webhook kaldırıldı" : `Hata: ${j.error}`);
    } catch (e: any) { setWebhookResult(`Hata: ${e.message}`); }
  };

  const CMD = [
    ["/status", "Sistem durumu"], ["/visitors", "Ziyaretçiler"], ["/stats", "İstatistikler"],
    ["/block IP", "IP engelle"], ["/unblock IP", "IP kaldır"], ["/country +XX", "Ülke engelle"],
    ["/country -XX", "Ülke kaldır"], ["/whois IP", "IP sorgula"], ["/speed", "Hız durumu"],
    ["/blog", "Son 5 blog"], ["/broadcast", "Kanala duyuru"],
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="w-5 h-5 text-gray-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Telegram Bot</h1>
          <p className="text-xs text-gray-500">Bot yönetimi ve mesaj gönderimi</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-gray-500 mb-1">Bot Durumu</h2>
            {loading ? <p className="text-xs text-gray-400">Kontrol...</p> : botStatus?.configured ? <p className="text-xs text-gray-700">Yapılandırılmış</p> : <p className="text-xs text-gray-500">Yapılandırılmamış</p>}
          </div>
          <button onClick={handleTest} disabled={sending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-[11px] text-gray-900 hover:bg-gray-100 disabled:opacity-50">
            <RefreshCw className="w-3 h-3" /> Test
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500">Webhook</h2>
        {webhookInfo && (
          <div className="p-2.5 rounded-lg border border-gray-200 text-[11px]">
            <div className="flex justify-between"><span className="text-gray-400">URL:</span><span className="text-gray-500 font-mono">{webhookInfo.url || "Ayarlanmamış"}</span></div>
            {webhookInfo.last_error_message && <div className="flex justify-between mt-1"><span className="text-gray-400">Hata:</span><span className="text-gray-500">{webhookInfo.last_error_message}</span></div>}
          </div>
        )}
        <div className="flex gap-2">
          <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="input flex-1" />
          <button onClick={handleSetWebhook} className="px-3 py-1.5 rounded-lg bg-gray-100 text-[11px] text-gray-900 hover:bg-gray-100">Ayarla</button>
          <button onClick={handleRemoveWebhook} className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] text-gray-500 hover:text-gray-900">Kaldır</button>
        </div>
        {webhookResult && <p className="text-[11px] text-gray-500">{webhookResult}</p>}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <h2 className="text-xs font-semibold text-gray-500 mb-3">Komutlar</h2>
        <div className="grid grid-cols-2 gap-1.5">
          {CMD.map(([cmd, desc]) => (
            <div key={cmd} className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-gray-200 text-[11px]">
              <code className="text-gray-700 font-mono">{cmd}</code>
              <span className="text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500">Özel Mesaj</h2>
        <textarea value={customMsg} onChange={(e) => setCustomMsg(e.target.value)} placeholder="Telegram mesajı (HTML destekli)" rows={4} className="input resize-none" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{customMsg.length}/4096</span>
          <button onClick={handleSend} disabled={sending || !customMsg.trim()} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-100 text-[11px] text-gray-900 hover:bg-gray-100 disabled:opacity-50">
            <Send className="w-3 h-3" /> {sending ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
        {result && <p className="text-[11px] text-gray-500">{result.ok ? "Gönderildi" : result.error}</p>}
      </div>
    </div>
  );
}
