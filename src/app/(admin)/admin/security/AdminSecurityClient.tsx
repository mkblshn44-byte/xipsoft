"use client";

import { useState, useEffect } from "react";
import { Shield, Plus, Trash2, Globe, ShieldBan } from "lucide-react";

type IPEntry = { id: number; ip_address: string; reason: string; is_permanent: boolean; expires_at: string | null; created_at: string };
type CountryEntry = { id: number; country_code: string; reason: string; created_at: string };

const COUNTRIES = [
  { code: "RU", name: "Rusya" }, { code: "CN", name: "Çin" }, { code: "US", name: "ABD" },
  { code: "DE", name: "Almanya" }, { code: "GB", name: "İngiltere" }, { code: "FR", name: "Fransa" },
  { code: "IR", name: "İran" }, { code: "UA", name: "Ukrayna" }, { code: "NL", name: "Hollanda" },
  { code: "AZ", name: "Azerbaycan" }, { code: "KP", name: "Kuzey Kore" }, { code: "BR", name: "Brezilya" },
  { code: "IN", name: "Hindistan" }, { code: "PL", name: "Polonya" },
];

export default function AdminSecurityClient() {
  const [tab, setTab] = useState<"ip" | "country">("ip");
  const [ipEntries, setIpEntries] = useState<IPEntry[]>([]);
  const [ipLoading, setIpLoading] = useState(true);
  const [ipForm, setIpForm] = useState({ ip_address: "", reason: "", is_permanent: true, expires_hours: 24 });
  const [ipSubmitting, setIpSubmitting] = useState(false);

  const [countryEntries, setCountryEntries] = useState<CountryEntry[]>([]);
  const [countryLoading, setCountryLoading] = useState(true);
  const [countryForm, setCountryForm] = useState({ country_code: "", custom_code: "", reason: "" });
  const [countrySubmitting, setCountrySubmitting] = useState(false);

  const loadIp = async () => {
    setIpLoading(true);
    try {
      const r = await fetch("/api/admin/ip-blocklist");
      const j = await r.json();
      setIpEntries(j.blocklist || []);
    } catch {}
    setIpLoading(false);
  };

  const loadCountry = async () => {
    setCountryLoading(true);
    try {
      const r = await fetch("/api/admin/country-blocklist");
      const j = await r.json();
      setCountryEntries(j.blocklist || []);
    } catch {}
    setCountryLoading(false);
  };

  useEffect(() => { loadIp(); loadCountry(); }, []);

  const handleIpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIpSubmitting(true);
    try {
      const r = await fetch("/api/admin/ip-blocklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ipForm) });
      if (r.ok) { setIpForm({ ip_address: "", reason: "", is_permanent: true, expires_hours: 24 }); await loadIp(); }
    } catch {}
    setIpSubmitting(false);
  };

  const handleIpDelete = async (id: number) => {
    if (!confirm("Kaldırılsın mı?")) return;
    await fetch(`/api/admin/ip-blocklist?id=${id}`, { method: "DELETE" });
    await loadIp();
  };

  const handleIpClearAll = async () => {
    if (!confirm("Geçiciler temizlensin mi?")) return;
    await fetch("/api/admin/ip-blocklist?clearAll=true", { method: "DELETE" });
    await loadIp();
  };

  const handleCountrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = (countryForm.country_code === "custom" ? countryForm.custom_code : countryForm.country_code).trim().toUpperCase();
    if (!code || code.length !== 2) { alert("2 haneli ülke kodu gerekli"); return; }
    setCountrySubmitting(true);
    try {
      const r = await fetch("/api/admin/country-blocklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country_code: code, reason: countryForm.reason }) });
      if (r.ok) { setCountryForm({ country_code: "", custom_code: "", reason: "" }); await loadCountry(); }
    } catch {}
    setCountrySubmitting(false);
  };

  const handleCountryDelete = async (code: string) => {
    if (!confirm(`${code} kaldırılsın mı?`)) return;
    await fetch(`/api/admin/country-blocklist?country_code=${code}`, { method: "DELETE" });
    await loadCountry();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-gray-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Güvenlik Yönetimi</h1>
          <p className="text-xs text-gray-500">IP ve coğrafi tabanlı filtreleme</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {(["ip", "country"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {t === "ip" ? <ShieldBan className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
            {t === "ip" ? "IP Engelleme" : "Ülke Engelleme"}
          </button>
        ))}
      </div>

      {tab === "ip" && (
        <div className="space-y-6">
          <form onSubmit={handleIpSubmit} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">IP Adresi</label>
                <input required value={ipForm.ip_address} onChange={(e) => setIpForm({ ...ipForm, ip_address: e.target.value })} placeholder="192.168.1.1" className="input" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Sebep</label>
                <input value={ipForm.reason} onChange={(e) => setIpForm({ ...ipForm, reason: e.target.value })} placeholder="Spam, saldırı..." className="input" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input type="checkbox" checked={ipForm.is_permanent} onChange={(e) => setIpForm({ ...ipForm, is_permanent: e.target.checked })} className="rounded border-gray-300 bg-white" />
                Kalıcı
              </label>
              {!ipForm.is_permanent && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <label>Saat:</label>
                  <input type="number" min={1} value={ipForm.expires_hours} onChange={(e) => setIpForm({ ...ipForm, expires_hours: Number(e.target.value) })} className="input w-20" />
                </div>
              )}
              <button type="submit" disabled={ipSubmitting} className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-100 text-xs text-gray-900 hover:bg-gray-100 disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> {ipSubmitting ? "Ekleniyor..." : "Engelle"}
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
              <span className="text-[11px] text-gray-500">{ipEntries.length} kayıt</span>
              {ipEntries.some((e) => !e.is_permanent) && (
                <button onClick={handleIpClearAll} className="text-[10px] text-gray-500 hover:text-gray-900">Geçicileri temizle</button>
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
                {ipLoading ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Yükleniyor...</td></tr>
                ) : ipEntries.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Kayıt yok</td></tr>
                ) : ipEntries.map((e) => (
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
                      <button onClick={() => handleIpDelete(e.id)} className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "country" && (
        <div className="space-y-6">
          <form onSubmit={handleCountrySubmit} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Ülke</label>
                <select required value={countryForm.country_code} onChange={(e) => setCountryForm({ ...countryForm, country_code: e.target.value })} className="input">
                  <option value="">Seç...</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                  <option value="custom">Özel kod...</option>
                </select>
              </div>
              {countryForm.country_code === "custom" && (
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Kod</label>
                  <input maxLength={2} value={countryForm.custom_code} onChange={(e) => setCountryForm({ ...countryForm, custom_code: e.target.value.toUpperCase() })} placeholder="US" className="input" required />
                </div>
              )}
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Sebep</label>
                <input value={countryForm.reason} onChange={(e) => setCountryForm({ ...countryForm, reason: e.target.value })} placeholder="Siber saldırı riski" className="input" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={countrySubmitting} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-100 text-xs text-gray-900 hover:bg-gray-100 disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> {countrySubmitting ? "Ekleniyor..." : "Engelle"}
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Kod</th>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Sebep</th>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Tarih</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {countryLoading ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Yükleniyor...</td></tr>
                ) : countryEntries.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Kayıt yok</td></tr>
                ) : countryEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-bold text-gray-900">{e.country_code}</td>
                    <td className="px-4 py-2 text-gray-500">{e.reason}</td>
                    <td className="px-4 py-2 text-gray-500">{new Date(e.created_at).toLocaleString("tr-TR")}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => handleCountryDelete(e.country_code)} className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
