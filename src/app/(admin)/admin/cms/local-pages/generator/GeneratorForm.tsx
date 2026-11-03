"use client";

import { useState, useTransition } from "react";
import { createGenerationJob } from "@/app/_actions/admin-local-pages-actions";

interface Option { id: string; title?: string; name?: string; location_type?: string; }

export default function GeneratorForm({ services, locations }: { services: Option[]; locations: Option[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ serviceId: services[0]?.id ?? "", locationType: "district", parentLocationId: "", mode: "template" });
  function submit(dryRun: boolean) {
    setMessage("");
    startTransition(async () => {
      const result = await createGenerationJob();
      if (!result.success) { setMessage(result.error ?? "Otomatik üretim iptal edildi"); return; }
      setMessage(result.error ?? "Otomatik yerel içerik üretimi iptal edildi (DB-only model)");
    });
  }
  return <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
    {message && <div className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700">{message}</div>}
    <div className="grid gap-4 md:grid-cols-3">
      <label className="text-xs font-medium text-gray-700">Hizmet<select value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs">{services.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
      <label className="text-xs font-medium text-gray-700">Konum türü<select value={form.locationType} onChange={(e) => setForm({ ...form, locationType: e.target.value, parentLocationId: "" })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"><option value="province">İl</option><option value="district">İlçe</option><option value="neighborhood">Mahalle</option></select></label>
      <label className="text-xs font-medium text-gray-700">Parent konum<select value={form.parentLocationId} onChange={(e) => setForm({ ...form, parentLocationId: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"><option value="">Tümü</option>{locations.filter((x) => x.location_type === (form.locationType === "district" ? "province" : form.locationType === "neighborhood" ? "district" : "province")).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    </div>
    <div className="flex flex-wrap items-center gap-3"><select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-xs"><option value="template">Template</option><option value="ai">AI</option><option value="hybrid">Hibrit</option></select><button type="button" disabled={pending} onClick={() => submit(true)} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700">Dry-run hesapla</button><button type="button" disabled={pending} onClick={() => submit(false)} className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white">Job oluştur</button></div>
  </div>;
}
