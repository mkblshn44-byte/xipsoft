"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPage, updatePage, previewPage } from "@/app/_actions/admin-local-pages-actions";

interface Option { id: string; title?: string; name?: string; location_type?: string; parent_id?: string | null; }
interface ExistingPage {
  id: string;
  title: string;
  slug: string;
  markdown_content: string;
  meta_title: string;
  meta_description: string;
  lokal_aciklama?: string | null;
  ozel_meta_desc?: string | null;
  lokal_sss?: Array<{ question: string; answer: string }> | null;
  service_slug?: string;
  status: "draft" | "review" | "published" | "paused";
  service_id: string;
  location_id: string;
}

export default function LocalPageForm({ services, locations, page }: { services: Option[]; locations: Option[]; page?: ExistingPage }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [selectedLocationType, setSelectedLocationType] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [form, setForm] = useState({
    serviceId: page?.service_id ?? services[0]?.id ?? "",
    locationId: page?.location_id ?? locations[0]?.id ?? "",
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    markdownContent: page?.markdown_content ?? "",
    metaTitle: page?.meta_title ?? "",
    metaDescription: page?.meta_description ?? "",
    lokalAciklama: page?.lokal_aciklama ?? "",
    ozelMetaDesc: page?.ozel_meta_desc ?? "",
    lokalSss: JSON.stringify(page?.lokal_sss ?? [], null, 2),
    status: page?.status ?? "draft",
  });

  // Group locations by type and parent for cascade dropdown
  const locationsByType = locations.reduce((acc, loc) => {
    const type = loc.location_type || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(loc);
    return acc;
  }, {} as Record<string, Option[]>);

  // Parent locations (provinces)
  const parentLocations = locations.filter((l) => !l.parent_id && l.location_type === "province");

  const selectedLocation = locations.find((l) => l.id === form.locationId);
  const locationType = selectedLocation?.location_type || "";
  const parentId = selectedLocation?.parent_id || null;

  // Initialize state on mount for existing pages
  useEffect(() => {
    if (page && selectedLocation) {
      setSelectedLocationType(locationType);
      setSelectedParentId(parentId || "");
    }
  }, [page, selectedLocation, locationType, parentId]);

  // Filter locations based on type and parent
  const availableLocations = (() => {
    if (selectedLocationType === "province") {
      return locations.filter((l) => l.location_type === "province");
    }
    if (selectedLocationType === "district" && selectedParentId) {
      return locations.filter((l) => l.location_type === "district" && l.parent_id === selectedParentId);
    }
    if (selectedLocationType === "neighborhood" && selectedParentId) {
      return locations.filter((l) => l.location_type === "neighborhood" && l.parent_id === selectedParentId);
    }
    return [];
  })();

  // Handle location type change
  function handleLocationTypeChange(type: string) {
    setSelectedLocationType(type);
    setSelectedParentId("");
    setForm((current) => ({ ...current, locationId: "" }));
  }

  // Handle parent location change
  function handleParentChange(parentId: string) {
    setSelectedParentId(parentId);
    setForm((current) => ({ ...current, locationId: "" }));
  }

  function update(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    // Trigger preview after debounce
    if (name === "serviceId" || name === "locationId" || name === "markdownContent") {
      debouncedPreview();
    }
  }

  const debouncedPreview = (() => {
    let timeout: NodeJS.Timeout;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        triggerPreview();
      }, 500);
    };
  })();

  function triggerPreview() {
    if (!form.serviceId || !form.locationId) return;
    setIsPreviewing(true);
    startTransition(async () => {
      const result = await previewPage({
        serviceId: form.serviceId,
        locationId: form.locationId,
        markdownContent: form.markdownContent,
        title: form.title,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
      });
      setPreview(result.success ? result.preview : null);
      setIsPreviewing(false);
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    let lokalSss: Array<{ question: string; answer: string }>;
    try {
      lokalSss = JSON.parse(form.lokalSss);
      if (!Array.isArray(lokalSss)) throw new Error();
    } catch {
      setError("Lokal SSS geçerli bir JSON dizisi olmalıdır.");
      return;
    }
    startTransition(async () => {
      const result = page
        ? await updatePage({ id: page.id, ...form, lokalSss })
        : await createPage(form);
      if (!result.success) {
        setError(result.error ?? "İşlem başarısız");
        return;
      }
      router.push("/admin/cms/local-pages");
      router.refresh();
    });
  }

  // Load initial preview on mount
  useEffect(() => {
    if (form.serviceId && form.locationId) {
      triggerPreview();
    }
  }, [form.serviceId, form.locationId]);

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-xs font-medium text-gray-700">Hizmet
          <select value={form.serviceId} onChange={(event) => update("serviceId", event.target.value)} disabled={Boolean(page)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs">
            {services.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-700">Konum Türü
          <select 
            value={selectedLocationType} 
            onChange={(event) => handleLocationTypeChange(event.target.value)} 
            disabled={Boolean(page)} 
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
          >
            <option value="">Tür seçin</option>
            <option value="province">İl</option>
            <option value="district">İlçe</option>
            <option value="neighborhood">Mahalle</option>
          </select>
        </label>
        <label className="text-xs font-medium text-gray-700">
          {selectedLocationType === "province" ? "İl" : selectedLocationType === "district" ? "İlçe" : "Mahalle"}
          <select 
            value={form.locationId} 
            onChange={(event) => update("locationId", event.target.value)} 
            disabled={Boolean(page) || !selectedLocationType || (selectedLocationType !== "province" && !selectedParentId)} 
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
          >
            <option value="">Konum seçin</option>
            {availableLocations.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      </div>
      {selectedLocationType === "district" && (
        <label className="text-xs font-medium text-gray-700">İl (Parent)
          <select 
            value={selectedParentId} 
            onChange={(event) => handleParentChange(event.target.value)} 
            disabled={Boolean(page)} 
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
          >
            <option value="">İl seçin</option>
            {parentLocations.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      )}
      {selectedLocationType === "neighborhood" && (
        <label className="text-xs font-medium text-gray-700">İlçe (Parent)
          <select 
            value={selectedParentId} 
            onChange={(event) => handleParentChange(event.target.value)} 
            disabled={Boolean(page)} 
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
          >
            <option value="">İlçe seçin</option>
            {locations.filter((l) => l.location_type === "district").map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-xs font-medium text-gray-700">Başlık
        <input value={form.title} onChange={(event) => update("title", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </label>
      {page && <label className="block text-xs font-medium text-gray-700">Slug
        <input value={form.slug} onChange={(event) => update("slug", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs" />
        <span className="mt-1 block text-[10px] text-amber-600 font-medium">Hizmet bölümü sabittir; yalnızca konum bölümü değiştirilebilir. Slug değişikliği otomatik 301 yönlendirme oluşturur.</span>
      </label>}
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-xs font-medium text-gray-700">Markdown içeriği
          <textarea value={form.markdownContent} onChange={(event) => update("markdownContent", event.target.value)} required rows={22} className="mt-1 min-h-[420px] w-full rounded-lg border border-gray-200 p-3 font-mono text-xs" placeholder="# Başlık\n\nİçeriği Markdown olarak yazın..." />
        </label>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-700">Canlı önizleme</p>
            {isPreviewing && <span className="text-[10px] text-gray-400">Yükleniyor...</span>}
          </div>
          {preview ? (
            <div className="mt-1 min-h-[420px] rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
              <div className="mb-2 font-bold text-gray-900">{preview.title}</div>
              <div className="mb-2 text-gray-600">{preview.metaDescription}</div>
              <div className="mb-2 text-[10px] text-gray-400">Slug: {preview.slug}</div>
              <div className="mb-2 text-[10px] text-gray-400">Canonical: {preview.canonicalUrl}</div>
              <pre className="whitespace-pre-wrap text-gray-700">{preview.markdownContent || "İçerik yok"}</pre>
            </div>
          ) : (
            <pre className="mt-1 min-h-[420px] whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">{form.markdownContent || "Önizleme burada görünecek."}</pre>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs font-medium text-gray-700">Meta title
          <input value={form.metaTitle} onChange={(event) => update("metaTitle", event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
        </label>
        <label className="text-xs font-medium text-gray-700">Meta description
          <textarea value={form.metaDescription} onChange={(event) => update("metaDescription", event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs font-medium text-gray-700">Yerel giriş paragrafı
          <textarea value={form.lokalAciklama} onChange={(event) => update("lokalAciklama", event.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
        </label>
        <label className="text-xs font-medium text-gray-700">Özel meta açıklaması
          <textarea value={form.ozelMetaDesc} onChange={(event) => update("ozelMetaDesc", event.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
        </label>
      </div>
      <label className="block text-xs font-medium text-gray-700">Yerel SSS (JSON)
        <textarea value={form.lokalSss} onChange={(event) => update("lokalSss", event.target.value)} rows={8} className="mt-1 w-full rounded-lg border border-gray-200 p-3 font-mono text-xs" placeholder={'[{"question":"Soru","answer":"Yanıt"}]'} />
      </label>
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium text-gray-700">Durum
          <select value={form.status} onChange={(event) => update("status", event.target.value)} className="ml-2 rounded-lg border border-gray-200 px-3 py-2 text-xs">
            <option value="draft">Taslak</option><option value="review">İncelemede</option><option value="published">Yayında</option><option value="paused">Pasif</option>
          </select>
        </label>
        <button disabled={isPending} className="rounded-lg bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{isPending ? "Kaydediliyor..." : "Kaydet"}</button>
      </div>
    </form>
  );
}
