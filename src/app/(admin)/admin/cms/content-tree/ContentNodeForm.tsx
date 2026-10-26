"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  Cpu,
  Workflow,
  Package,
  HelpCircle,
  BookOpen,
  FileText,
  Settings,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { slugify } from "@/utils/slugify";
import {
  stripContentExtension,
  treeNodeCanonicalPath,
  type TreeStatus,
  type TreeNodeType,
} from "@/lib/content-path";
import type { AdminTreeNode, TreeParentOption, AdminServiceData } from "@/lib/content-tree-admin";
import { createContentNode, updateContentNode } from "@/app/_actions/admin-content-tree-actions";

interface Props {
  parents: TreeParentOption[];
  node?: AdminTreeNode;
  defaultParentId?: string;
  defaultType?: TreeNodeType;
}

function prettyJson(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") {
    try {
      return JSON.stringify(JSON.parse(val), null, 2);
    } catch {
      return val;
    }
  }
  return JSON.stringify(val, null, 2);
}

type JsonParseResult = { ok: true; val: unknown } | { ok: false; err: string };

function safeParseJson(raw: string, fieldName: string): JsonParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, val: null };
  try {
    return { ok: true, val: JSON.parse(trimmed) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, err: `${fieldName} alanında geçersiz JSON: ${msg}` };
  }
}

export default function ContentNodeForm({ parents, node, defaultParentId, defaultType }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const isServiceNode = node?.kind === "service" || Boolean(node?.serviceId) || Boolean(node?.serviceData);
  const initialService = node?.serviceData;

  const [activeTab, setActiveTab] = useState<string>("general");

  const [form, setForm] = useState({
    nodeType: (node?.nodeType ?? defaultType ?? "page") as TreeNodeType,
    parentId: node?.parentId ?? defaultParentId ?? "",
    slug: node?.slug ?? "",
    title: node?.title ?? "",
    h1Title: node?.h1Title ?? "",
    metaTitle: node?.metaTitle ?? "",
    metaDescription: node?.metaDescription ?? "",
    markdownContent: node?.markdownContent ?? "",
    renderedHtml: node?.renderedHtml ?? "",
    ogImageUrl: node?.ogImageUrl ?? "",
    robots: node?.robots ?? "",
    schemaMarkup: node?.schemaMarkup ?? "",
    isIndexable: node?.isIndexable ?? true,
    sortOrder: node?.sortOrder ?? 0,
    status: (node?.status ?? "draft") as TreeStatus,
  });

  const [serviceForm, setServiceForm] = useState({
    subtitle: initialService?.subtitle ?? "",
    badge: initialService?.badge ?? "",
    badgeIcon: initialService?.badge_icon ?? "",
    badgeGradient: initialService?.badge_gradient ?? "",
    badgeColor: initialService?.badge_color ?? "",
    titleGradient: initialService?.title_gradient ?? "",
    heroCta: initialService?.hero_cta ?? "",
    featuresTitle: initialService?.features_title ?? "",
    featuresDesc: initialService?.features_desc ?? "",
    featuresJson: prettyJson(initialService?.features),
    techTitle: initialService?.tech_title ?? "",
    techStackJson: prettyJson(initialService?.tech_stack),
    servicesTagJson: prettyJson(initialService?.services_tag),
    processTitle: initialService?.process_title ?? "",
    processDesc: initialService?.process_desc ?? "",
    processStepsJson: prettyJson(initialService?.process_steps),
    packagesTitle: initialService?.packages_title ?? "",
    packagesDesc: initialService?.packages_desc ?? "",
    packagesJson: prettyJson(initialService?.packages),
    microTitle: initialService?.micro_title ?? "",
    microDesc: initialService?.micro_desc ?? "",
    microServicesJson: prettyJson(initialService?.micro_services),
    faqTitle: initialService?.faq_title ?? "",
    faqItemsJson: prettyJson(initialService?.faq_items),
    statsJson: prettyJson(initialService?.stats),
    guideJson: prettyJson(initialService?.guide),
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateService<K extends keyof typeof serviceForm>(key: K, value: (typeof serviceForm)[K]) {
    setServiceForm((current) => ({ ...current, [key]: value }));
  }

  const effectiveSlug = slugify(stripContentExtension(form.slug || form.title));
  const parentPath = parents.find((option) => option.id === form.parentId)?.fullPath ?? null;
  const fullPath = [parentPath, effectiveSlug].filter(Boolean).join("/");
  const canonical = fullPath ? treeNodeCanonicalPath(fullPath) : "";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    let parsedFeatures: JsonParseResult = { ok: true, val: null };
    let parsedTech: JsonParseResult = { ok: true, val: null };
    let parsedTags: JsonParseResult = { ok: true, val: null };
    let parsedProcess: JsonParseResult = { ok: true, val: null };
    let parsedPackages: JsonParseResult = { ok: true, val: null };
    let parsedMicro: JsonParseResult = { ok: true, val: null };
    let parsedFaq: JsonParseResult = { ok: true, val: null };
    let parsedStats: JsonParseResult = { ok: true, val: null };
    let parsedGuide: JsonParseResult = { ok: true, val: null };

    if (isServiceNode) {
      parsedFeatures = safeParseJson(serviceForm.featuresJson, "Özellikler (features)");
      if (!parsedFeatures.ok) return setError(parsedFeatures.err);

      parsedTech = safeParseJson(serviceForm.techStackJson, "Teknoloji Yığını (tech_stack)");
      if (!parsedTech.ok) return setError(parsedTech.err);

      parsedTags = safeParseJson(serviceForm.servicesTagJson, "Etiketler (services_tag)");
      if (!parsedTags.ok) return setError(parsedTags.err);

      parsedProcess = safeParseJson(serviceForm.processStepsJson, "Süreç Adımları (process_steps)");
      if (!parsedProcess.ok) return setError(parsedProcess.err);

      parsedPackages = safeParseJson(serviceForm.packagesJson, "Paketler (packages)");
      if (!parsedPackages.ok) return setError(parsedPackages.err);

      parsedMicro = safeParseJson(serviceForm.microServicesJson, "Mikro Servisler (micro_services)");
      if (!parsedMicro.ok) return setError(parsedMicro.err);

      parsedFaq = safeParseJson(serviceForm.faqItemsJson, "SSS (faq_items)");
      if (!parsedFaq.ok) return setError(parsedFaq.err);

      parsedStats = safeParseJson(serviceForm.statsJson, "İstatistikler (stats)");
      if (!parsedStats.ok) return setError(parsedStats.err);

      parsedGuide = safeParseJson(serviceForm.guideJson, "Rehber (guide)");
      if (!parsedGuide.ok) return setError(parsedGuide.err);
    }

    const payload = {
      parentId: form.parentId || null,
      nodeType: form.nodeType,
      slug: effectiveSlug,
      title: form.title,
      h1Title: form.h1Title,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      markdownContent: form.markdownContent,
      renderedHtml: form.renderedHtml,
      ogImageUrl: form.ogImageUrl,
      robots: form.robots,
      schemaMarkup: form.schemaMarkup,
      isIndexable: form.isIndexable,
      sortOrder: Number(form.sortOrder) || 0,
      status: form.status,
      serviceData: isServiceNode
        ? {
            id: initialService?.id,
            subtitle: serviceForm.subtitle,
            badge: serviceForm.badge,
            badge_icon: serviceForm.badgeIcon,
            badge_gradient: serviceForm.badgeGradient,
            badge_color: serviceForm.badgeColor,
            title_gradient: serviceForm.titleGradient,
            hero_cta: serviceForm.heroCta,
            features_title: serviceForm.featuresTitle,
            features_desc: serviceForm.featuresDesc,
            features: parsedFeatures.val,
            tech_title: serviceForm.techTitle,
            tech_stack: parsedTech.val,
            services_tag: parsedTags.val,
            process_title: serviceForm.processTitle,
            process_desc: serviceForm.processDesc,
            process_steps: parsedProcess.val,
            packages_title: serviceForm.packagesTitle,
            packages_desc: serviceForm.packagesDesc,
            packages: parsedPackages.val,
            micro_title: serviceForm.microTitle,
            micro_desc: serviceForm.microDesc,
            micro_services: parsedMicro.val,
            faq_title: serviceForm.faqTitle,
            faq_items: parsedFaq.val,
            stats: parsedStats.val,
            guide: parsedGuide.val,
          }
        : undefined,
    };

    startTransition(async () => {
      const result = node
        ? await updateContentNode(node.id, payload)
        : await createContentNode(payload);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/admin/cms/content-tree");
      router.refresh();
    });
  }

  const tabs = [
    { id: "general", label: "Genel & SEO", icon: Settings },
    ...(isServiceNode
      ? [
          { id: "hero", label: "Hero & Rozet", icon: Sparkles },
          { id: "features", label: "Özellikler & Teknolojiler", icon: Layers },
          { id: "process", label: "Süreç & Paketler", icon: Workflow },
          { id: "faq", label: "SSS & Rehber (Guide)", icon: HelpCircle },
        ]
      : []),
    { id: "content", label: "Gövde İçeriği", icon: FileText },
  ];

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {isServiceNode && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-sky-600" />
            <p className="text-xs font-semibold text-sky-900">
              Bu düğüm <strong>Hizmet</strong> veritabanına bağlıdır.
            </p>
          </div>
          <span className="text-[11px] text-sky-700">
            Zengin bloklar ({node?.serviceId ? `#${node.serviceId}` : "Hizmet"}) burada doğrudan düzenlenir.
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Genel & SEO */}
      {activeTab === "general" && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-xs font-medium text-gray-700">
              Tür
              <select
                value={form.nodeType}
                onChange={(event) => update("nodeType", event.target.value as TreeNodeType)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              >
                <option value="category">Kategori</option>
                <option value="page">İçerik sayfası</option>
              </select>
            </label>
            <label className="text-xs font-medium text-gray-700">
              Üst öğe
              <select
                value={form.parentId}
                onChange={(event) => update("parentId", event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              >
                <option value="">— Kök (en üst seviye) —</option>
                {parents.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.fullPath} — {option.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-700">
              Durum
              <select
                value={form.status}
                onChange={(event) => update("status", event.target.value as TreeStatus)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              >
                <option value="draft">Taslak</option>
                <option value="review">İncelemede</option>
                <option value="published">Yayında</option>
                <option value="paused">Pasif</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-gray-700">
              Başlık
              <input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Slug (son segment)
              <input
                value={form.slug}
                onChange={(event) => update("slug", event.target.value)}
                placeholder="boş bırakılırsa başlıktan üretilir"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
              />
            </label>
          </div>

          <div className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2">
            <p className="font-mono text-[11px] text-violet-700">Kanonik URL: {canonical || "—"}</p>
            <p className="mt-0.5 text-[10px] text-violet-500">
              Kaydettiğinizde uzantısız adres bu kanoniğe 301/308 yönlendirilir.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-gray-700">
              H1 başlığı (opsiyonel)
              <input
                value={form.h1Title}
                onChange={(event) => update("h1Title", event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Sıralama (sort_order)
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) => update("sortOrder", Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-gray-700">
              Meta title
              <input
                value={form.metaTitle}
                onChange={(event) => update("metaTitle", event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Meta description
              <textarea
                value={form.metaDescription}
                onChange={(event) => update("metaDescription", event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-gray-700">
              OG görsel URL
              <input
                value={form.ogImageUrl}
                onChange={(event) => update("ogImageUrl", event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Robots (opsiyonel)
              <input
                value={form.robots}
                onChange={(event) => update("robots", event.target.value)}
                placeholder="noindex, follow"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-gray-700">
            Schema markup — JSON-LD (opsiyonel, sayfa türüne göre eklenir)
            <textarea
              value={form.schemaMarkup}
              onChange={(event) => update("schemaMarkup", event.target.value)}
              placeholder='{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}'
              rows={6}
              spellCheck={false}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-[11px] leading-relaxed"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.isIndexable}
              onChange={(event) => update("isIndexable", event.target.checked)}
            />
            Arama motorlarında indekslenebilir (index, follow)
          </label>
        </div>
      )}

      {/* TAB 2: Hero & Rozet (Hizmet) */}
      {isServiceNode && activeTab === "hero" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-gray-700">
              Alt Başlık (Hero Subtitle)
              <textarea
                value={serviceForm.subtitle}
                onChange={(e) => updateService("subtitle", e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
                placeholder="Hizmetin açılış açıklaması..."
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Hero Buton Metni (CTA)
              <input
                value={serviceForm.heroCta}
                onChange={(e) => updateService("heroCta", e.target.value)}
                placeholder="Ücretsiz Teklif Al"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-xs font-medium text-gray-700">
              Rozet Metni (Badge)
              <input
                value={serviceForm.badge}
                onChange={(e) => updateService("badge", e.target.value)}
                placeholder="KURUMSAL YAZILIM"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Rozet İkonu (Lucide)
              <input
                value={serviceForm.badgeIcon}
                onChange={(e) => updateService("badgeIcon", e.target.value)}
                placeholder="Sparkles, Shield, Code..."
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Rozet Rengi (HEX)
              <input
                value={serviceForm.badgeColor}
                onChange={(e) => updateService("badgeColor", e.target.value)}
                placeholder="#3b82f6"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-gray-700">
              Rozet Gradyanı (Tailwind)
              <input
                value={serviceForm.badgeGradient}
                onChange={(e) => updateService("badgeGradient", e.target.value)}
                placeholder="from-blue-600 to-indigo-600"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Başlık Gradyanı (Tailwind)
              <input
                value={serviceForm.titleGradient}
                onChange={(e) => updateService("titleGradient", e.target.value)}
                placeholder="from-white to-gray-400"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-gray-700">
            İstatistikler (Stats JSON: [{`"value": "10x", "label": "Hızlı"`}])
            <textarea
              value={serviceForm.statsJson}
              onChange={(e) => updateService("statsJson", e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-200 p-3 font-mono text-xs"
              placeholder={`[\n  { "value": "10x", "label": "Daha Hızlı" }\n]`}
            />
          </label>
        </div>
      )}

      {/* TAB 3: Özellikler & Teknolojiler */}
      {isServiceNode && activeTab === "features" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-gray-700">
              Özellikler Bölüm Başlığı
              <input
                value={serviceForm.featuresTitle}
                onChange={(e) => updateService("featuresTitle", e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Özellikler Bölüm Açıklaması
              <input
                value={serviceForm.featuresDesc}
                onChange={(e) => updateService("featuresDesc", e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-gray-700">
            Özellikler Listesi (Features JSON: [{`"icon": "Zap", "title": "...", "description": "...", "color": "..."`}])
            <textarea
              value={serviceForm.featuresJson}
              onChange={(e) => updateService("featuresJson", e.target.value)}
              rows={8}
              className="mt-1 w-full rounded-lg border border-gray-200 p-3 font-mono text-xs"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-gray-700">
              Teknoloji Yığını Başlığı
              <input
                value={serviceForm.techTitle}
                onChange={(e) => updateService("techTitle", e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Hizmet Etiketleri (services_tag JSON)
              <textarea
                value={serviceForm.servicesTagJson}
                onChange={(e) => updateService("servicesTagJson", e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono text-xs"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-gray-700">
            Teknolojiler Listesi (tech_stack JSON: [{`"name": "Next.js", "color": "#000000"`}])
            <textarea
              value={serviceForm.techStackJson}
              onChange={(e) => updateService("techStackJson", e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-lg border border-gray-200 p-3 font-mono text-xs"
            />
          </label>
        </div>
      )}

      {/* TAB 4: Süreç & Paketler */}
      {isServiceNode && activeTab === "process" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-gray-700">
              Süreç Bölüm Başlığı
              <input
                value={serviceForm.processTitle}
                onChange={(e) => updateService("processTitle", e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Süreç Bölüm Açıklaması
              <input
                value={serviceForm.processDesc}
                onChange={(e) => updateService("processDesc", e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-gray-700">
            Süreç Adımları (process_steps JSON: [{`"step": "01", "title": "...", "description": "...", "color": "..."`}])
            <textarea
              value={serviceForm.processStepsJson}
              onChange={(e) => updateService("processStepsJson", e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-lg border border-gray-200 p-3 font-mono text-xs"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-gray-700">
              Paketler Başlığı
              <input
                value={serviceForm.packagesTitle}
                onChange={(e) => updateService("packagesTitle", e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Paketler Açıklaması
              <input
                value={serviceForm.packagesDesc}
                onChange={(e) => updateService("packagesDesc", e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-gray-700">
            Paketler JSON (packages: [{`"name": "...", "price": "...", "desc": "...", "features": [...]`}])
            <textarea
              value={serviceForm.packagesJson}
              onChange={(e) => updateService("packagesJson", e.target.value)}
              rows={8}
              className="mt-1 w-full rounded-lg border border-gray-200 p-3 font-mono text-xs"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-xs font-medium text-gray-700">
              Mikro Servisler Başlığı
              <input
                value={serviceForm.microTitle}
                onChange={(e) => updateService("microTitle", e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Mikro Servisler Açıklaması
              <input
                value={serviceForm.microDesc}
                onChange={(e) => updateService("microDesc", e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-gray-700">
            Mikro Servisler (micro_services JSON)
            <textarea
              value={serviceForm.microServicesJson}
              onChange={(e) => updateService("microServicesJson", e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-lg border border-gray-200 p-3 font-mono text-xs"
            />
          </label>
        </div>
      )}

      {/* TAB 5: SSS & Rehber (Guide) */}
      {isServiceNode && activeTab === "faq" && (
        <div className="space-y-4">
          <label className="block text-xs font-medium text-gray-700">
            SSS Bölüm Başlığı
            <input
              value={serviceForm.faqTitle}
              onChange={(e) => updateService("faqTitle", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs"
            />
          </label>

          <label className="block text-xs font-medium text-gray-700">
            SSS Maddeleri (faq_items JSON: [{`"question": "...", "answer": "..."`}])
            <textarea
              value={serviceForm.faqItemsJson}
              onChange={(e) => updateService("faqItemsJson", e.target.value)}
              rows={8}
              className="mt-1 w-full rounded-lg border border-gray-200 p-3 font-mono text-xs"
            />
          </label>

          <div className="border-t border-gray-200 pt-4">
            <label className="block text-xs font-medium text-gray-700">
              Kapsamlı Rehber (guide JSON: eyebrow, title, intro, principles, processSteps, faq)
              <textarea
                value={serviceForm.guideJson}
                onChange={(e) => updateService("guideJson", e.target.value)}
                rows={12}
                className="mt-1 w-full rounded-lg border border-gray-200 p-3 font-mono text-xs"
                placeholder={`{\n  "eyebrow": "REHBER",\n  "title": "...",\n  "principles": []\n}`}
              />
            </label>
          </div>
        </div>
      )}

      {/* TAB 6: Gövde İçeriği */}
      {activeTab === "content" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block text-xs font-medium text-gray-700">
            Markdown içeriği
            <textarea
              value={form.markdownContent}
              onChange={(event) => update("markdownContent", event.target.value)}
              rows={18}
              className="mt-1 min-h-[350px] w-full rounded-lg border border-gray-200 p-3 font-mono text-xs"
              placeholder={"# Başlık\n\nİçeriği Markdown olarak yazın..."}
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Hazır HTML (opsiyonel — markdown yerine)
            <textarea
              value={form.renderedHtml}
              onChange={(event) => update("renderedHtml", event.target.value)}
              rows={18}
              className="mt-1 min-h-[350px] w-full rounded-lg border border-gray-200 p-3 font-mono text-xs"
              placeholder="<p>...</p>"
            />
          </label>
        </div>
      )}

      {/* Footer Submit */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <Link
          href="/admin/cms/content-tree"
          className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          İptal
        </Link>
        <button
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
        >
          {isPending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
