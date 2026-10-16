"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";
import { updateService } from "@/app/_actions/admin-services-actions";

// Full row shape coming from SELECT *
export interface ServiceRow {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  badge_icon: string | null;
  badge_gradient: string | null;
  badge_color: string | null;
  title_gradient: string | null;
  hero_cta: string | null;
  stats: unknown;
  features: unknown;
  tech_stack: unknown;
  process_title: string | null;
  process_desc: string | null;
  process_steps: unknown;
  packages: unknown;
  cta_title: string | null;
  cta_desc: string | null;
  cta_btn: string | null;
  micro_services: unknown;
  faq_title: string | null;
  faq_items: unknown;
  metadata: unknown;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface Props {
  service: ServiceRow;
  onClose: () => void;
  onSaved: () => void;
}

function prettyJson(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") {
    try { return JSON.stringify(JSON.parse(val), null, 2); } catch { return val; }
  }
  return JSON.stringify(val, null, 2);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function HizmetlerEditPanel({ service, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Text fields
  const [slug, setSlug] = useState(service.slug ?? "");
  const [title, setTitle] = useState(service.title ?? "");
  const [subtitle, setSubtitle] = useState(service.subtitle ?? "");
  const [badge, setBadge] = useState(service.badge ?? "");
  const [badgeIcon, setBadgeIcon] = useState(service.badge_icon ?? "");
  const [badgeGradient, setBadgeGradient] = useState(service.badge_gradient ?? "");
  const [badgeColor, setBadgeColor] = useState(service.badge_color ?? "");
  const [titleGradient, setTitleGradient] = useState(service.title_gradient ?? "");
  const [heroCta, setHeroCta] = useState(service.hero_cta ?? "");
  const [processTitle, setProcessTitle] = useState(service.process_title ?? "");
  const [processDesc, setProcessDesc] = useState(service.process_desc ?? "");
  const [ctaTitle, setCtaTitle] = useState(service.cta_title ?? "");
  const [ctaDesc, setCtaDesc] = useState(service.cta_desc ?? "");
  const [ctaBtn, setCtaBtn] = useState(service.cta_btn ?? "");
  const [faqTitle, setFaqTitle] = useState(service.faq_title ?? "");
  const [isActive, setIsActive] = useState(service.is_active);

  // JSONB fields as pretty-printed text
  const [stats, setStats] = useState(prettyJson(service.stats));
  const [features, setFeatures] = useState(prettyJson(service.features));
  const [techStack, setTechStack] = useState(prettyJson(service.tech_stack));
  const [processSteps, setProcessSteps] = useState(prettyJson(service.process_steps));
  const [packages, setPackages] = useState(prettyJson(service.packages));
  const [microServices, setMicroServices] = useState(prettyJson(service.micro_services));
  const [faqItems, setFaqItems] = useState(prettyJson(service.faq_items));
  const [metadata, setMetadata] = useState(prettyJson(service.metadata));

  const parseJsonField = (raw: string, fieldName: string): { ok: true; value: unknown } | { ok: false; error: string } => {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: true, value: null };
    try {
      return { ok: true, value: JSON.parse(trimmed) };
    } catch {
      return { ok: false, error: `${fieldName} geçerli JSON değil` };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validate and parse all JSONB fields
    const jsonFields: Record<string, unknown> = {};
    const jsonPairs: Array<[string, string, string]> = [
      ["stats", stats, "Stats"],
      ["features", features, "Features"],
      ["tech_stack", techStack, "Tech Stack"],
      ["process_steps", processSteps, "Process Steps"],
      ["packages", packages, "Packages"],
      ["micro_services", microServices, "Micro Services"],
      ["faq_items", faqItems, "FAQ Items"],
      ["metadata", metadata, "Metadata"],
    ];

    for (const [key, raw, label] of jsonPairs) {
      const parsed = parseJsonField(raw, label);
      if (!parsed.ok) {
        setError(parsed.error);
        setSaving(false);
        return;
      }
      jsonFields[key] = parsed.value;
    }

    const result = await updateService(service.id, {
      slug: slug || undefined,
      title: title || undefined,
      subtitle: subtitle || undefined,
      badge: badge || undefined,
      badge_icon: badgeIcon || undefined,
      badge_gradient: badgeGradient || undefined,
      badge_color: badgeColor || undefined,
      title_gradient: titleGradient || undefined,
      hero_cta: heroCta || undefined,
      process_title: processTitle || undefined,
      process_desc: processDesc || undefined,
      cta_title: ctaTitle || undefined,
      cta_desc: ctaDesc || undefined,
      cta_btn: ctaBtn || undefined,
      faq_title: faqTitle || undefined,
      is_active: isActive,
      ...(jsonFields.stats !== null && jsonFields.stats !== undefined ? { stats: jsonFields.stats } : {}),
      ...(jsonFields.features !== null && jsonFields.features !== undefined ? { features: jsonFields.features } : {}),
      ...(jsonFields.tech_stack !== null && jsonFields.tech_stack !== undefined ? { tech_stack: jsonFields.tech_stack } : {}),
      ...(jsonFields.process_steps !== null && jsonFields.process_steps !== undefined ? { process_steps: jsonFields.process_steps } : {}),
      ...(jsonFields.packages !== null && jsonFields.packages !== undefined ? { packages: jsonFields.packages } : {}),
      ...(jsonFields.micro_services !== null && jsonFields.micro_services !== undefined ? { micro_services: jsonFields.micro_services } : {}),
      ...(jsonFields.faq_items !== null && jsonFields.faq_items !== undefined ? { faq_items: jsonFields.faq_items } : {}),
      ...(jsonFields.metadata !== null && jsonFields.metadata !== undefined ? { metadata: jsonFields.metadata } : {}),
    });

    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Güncelleme başarısız");
    } else {
      setSuccess("Hizmet başarıyla güncellendi.");
      onSaved();
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex justify-end"
      aria-modal="true"
      role="dialog"
    >
      {/* Dim overlay */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative z-10 flex flex-col w-full max-w-2xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Hizmet Düzenle</h2>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">/hizmetler/{service.slug}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <form id="service-edit-form" onSubmit={handleSubmit} className="p-5 space-y-5">

            {/* — Temel bilgiler — */}
            <section className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Temel Bilgiler</p>
              <Field label="URL Slug (Link)">
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="input font-mono text-xs"
                  placeholder="hizmet-adi"
                />
                <span className="mt-1 block text-[10px] text-amber-600 font-medium">
                  Slug değiştirirseniz eski URL otomatik olarak yeni adrese yönlendirilir (301 kalıcı yönlendirme).
                </span>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Başlık *">
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                    placeholder="Hizmet başlığı"
                  />
                </Field>
                <Field label="Alt Başlık">
                  <input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="input"
                    placeholder="Kısa açıklama"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Badge Metni">
                  <input value={badge} onChange={(e) => setBadge(e.target.value)} className="input" placeholder="Örn: Popüler" />
                </Field>
                <Field label="Badge İkon">
                  <input value={badgeIcon} onChange={(e) => setBadgeIcon(e.target.value)} className="input" placeholder="emoji veya sınıf" />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Badge Gradient CSS">
                  <input value={badgeGradient} onChange={(e) => setBadgeGradient(e.target.value)} className="input" placeholder="from-… to-…" />
                </Field>
                <Field label="Badge Renk">
                  <input value={badgeColor} onChange={(e) => setBadgeColor(e.target.value)} className="input" placeholder="#hexrenk veya tw sınıfı" />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Başlık Gradient CSS">
                  <input value={titleGradient} onChange={(e) => setTitleGradient(e.target.value)} className="input" placeholder="from-… to-…" />
                </Field>
                <Field label="Hero CTA Metni">
                  <input value={heroCta} onChange={(e) => setHeroCta(e.target.value)} className="input" placeholder="Hemen Başlayın" />
                </Field>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="is-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-3.5 h-3.5 accent-gray-900"
                />
                <label htmlFor="is-active" className="text-xs text-gray-700 cursor-pointer">Aktif (yayında)</label>
              </div>
            </section>

            {/* — Süreç — */}
            <section className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Süreç Bölümü</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Süreç Başlığı">
                  <input value={processTitle} onChange={(e) => setProcessTitle(e.target.value)} className="input" placeholder="Nasıl Çalışıyoruz?" />
                </Field>
                <Field label="Süreç Açıklaması">
                  <input value={processDesc} onChange={(e) => setProcessDesc(e.target.value)} className="input" placeholder="Kısa açıklama" />
                </Field>
              </div>
            </section>

            {/* — CTA — */}
            <section className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">CTA Bölümü</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="CTA Başlığı">
                  <input value={ctaTitle} onChange={(e) => setCtaTitle(e.target.value)} className="input" />
                </Field>
                <Field label="CTA Butonu">
                  <input value={ctaBtn} onChange={(e) => setCtaBtn(e.target.value)} className="input" placeholder="İletişime Geç" />
                </Field>
              </div>
              <Field label="CTA Açıklaması">
                <textarea value={ctaDesc} onChange={(e) => setCtaDesc(e.target.value)} rows={2} className="input resize-none" />
              </Field>
            </section>

            {/* — FAQ — */}
            <section className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">SSS Bölümü</p>
              <Field label="SSS Başlığı">
                <input value={faqTitle} onChange={(e) => setFaqTitle(e.target.value)} className="input" />
              </Field>
            </section>

            {/* — JSONB alanları — */}
            <section className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">JSONB Alanları</p>

              <Field label="Stats (JSON dizi)">
                <textarea value={stats} onChange={(e) => setStats(e.target.value)} rows={4} className="input font-mono text-[11px] resize-y" placeholder="[]" />
              </Field>

              <Field label="Features (JSON dizi)">
                <textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} className="input font-mono text-[11px] resize-y" placeholder="[]" />
              </Field>

              <Field label="Tech Stack (JSON dizi)">
                <textarea value={techStack} onChange={(e) => setTechStack(e.target.value)} rows={4} className="input font-mono text-[11px] resize-y" placeholder="[]" />
              </Field>

              <Field label="Process Steps (JSON dizi)">
                <textarea value={processSteps} onChange={(e) => setProcessSteps(e.target.value)} rows={4} className="input font-mono text-[11px] resize-y" placeholder="[]" />
              </Field>

              <Field label="Packages (JSON dizi)">
                <textarea value={packages} onChange={(e) => setPackages(e.target.value)} rows={4} className="input font-mono text-[11px] resize-y" placeholder="[]" />
              </Field>

              <Field label="Micro Services (JSON dizi)">
                <textarea value={microServices} onChange={(e) => setMicroServices(e.target.value)} rows={4} className="input font-mono text-[11px] resize-y" placeholder="[]" />
              </Field>

              <Field label="FAQ Items (JSON dizi)">
                <textarea value={faqItems} onChange={(e) => setFaqItems(e.target.value)} rows={4} className="input font-mono text-[11px] resize-y" placeholder="[]" />
              </Field>

              <Field label="Metadata (JSON nesne)">
                <textarea value={metadata} onChange={(e) => setMetadata(e.target.value)} rows={4} className="input font-mono text-[11px] resize-y" placeholder="{}" />
              </Field>
            </section>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-xs text-gray-700 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">{success}</p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-900"
          >
            İptal
          </button>
          <button
            type="submit"
            form="service-edit-form"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-900 text-xs text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
