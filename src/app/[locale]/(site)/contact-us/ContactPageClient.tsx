"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import dynamic from "next/dynamic";
import XipIcon from "@/components/Ui/Icon";
import { BRAND_COMPANY, BRAND_COLORS } from "@/config/brand.config";
import { PALETTE } from "@/config/palette";

const V = PALETTE.neon[500];
const C = PALETTE.accent.cyan;
import { submitTeklifAction } from "@/app/_actions/teklif-actions";
import { trackContactSubmit, trackWhatsAppClick } from "@/utils/analytics";

const GoogleMap = dynamic(() => import("@/components/Map/GoogleMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[320px] rounded-2xl bg-zinc-900/60 animate-pulse" />
  ),
});

// ══ Veri ═══════════════════════════════════════════════════════════════════

const KANALLAR = [
  {
    icon: "mail",
    label: "E-posta",
    value: "info@xipsoft.net",
    href: "mailto:info@xipsoft.net",
    color: C,
  },
  {
    icon: "phone",
    label: "Telefon & WhatsApp",
    value: BRAND_COMPANY.phone,
    href: `https://wa.me/${BRAND_COMPANY.phone.replace(/\D/g, "")}`,
    color: C,
  },
  {
    icon: "map-pin",
    label: "Adres",
    value: BRAND_COMPANY.addressShort,
    href: BRAND_COMPANY.mapsUrl,
    color: V,
  },
  {
    icon: "clock",
    label: "Çalışma Saatleri",
    value: "Hafta içi 10:00–17:00 • Hafta sonu açık",
    color: V,
  },
];

const YONTEMLER = [
  { id: "whatsapp" as const, label: "WhatsApp", color: C },
  { id: "email"    as const, label: "E-posta",  color: V },
  { id: "telegram" as const, label: "Telegram", color: C },
];

// ══ Form ═══════════════════════════════════════════════════════════════════

type Yontem = "whatsapp" | "email" | "telegram";

function IletisimFormu({ isInView }: { isInView: boolean }) {
  const [gonderildi, setgonderildi] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [yontem, setYontem] = useState<Yontem>("whatsapp");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", service: "", detail: "",
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await submitTeklifAction({ ...form, contactMethod: yontem });
      if (res.success) {
        setgonderildi(true);
        trackContactSubmit();
      } else setHata(res.error || "Bir hata oluştu.");
    } catch {
      setHata("Bağlantı hatası, lütfen tekrar deneyin.");
    } finally {
      setYukleniyor(false);
    }
  };

  const base =
    "w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm p-8"
    >
      {gonderildi ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <XipIcon name="check-circle" className="w-12 h-12" style={{ color: V }} glow="strong" />
          <h3 className="font-bold text-xl text-white">Mesajınız Alındı</h3>
          <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
            En kısa sürede{" "}
            <span className="text-white font-medium">
              {yontem === "whatsapp" ? "WhatsApp" : yontem === "email" ? "e-posta" : "Telegram"}
            </span>{" "}
            üzerinden size ulaşacağız.
          </p>
          <button
            onClick={() => { setgonderildi(false); setForm({ name: "", email: "", phone: "", service: "", detail: "" }); }}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-2"
          >
            Yeni mesaj gönder
          </button>
        </div>
      ) : (
        <>
          <h3 className="font-semibold text-lg text-white mb-1">Mesaj gönder</h3>
          <p className="text-zinc-600 text-sm mb-7">Formu doldurun, size ulaşalım.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Ad Soyad</label>
                <input className={base} placeholder="Adınız" value={form.name} onChange={set("name")} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Telefon</label>
                <input className={base} placeholder="0555 000 00 00" value={form.phone} onChange={set("phone")} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider">E-posta</label>
              <input type="email" className={base} placeholder="ornek@firma.com" value={form.email} onChange={set("email")} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Hizmet</label>
              <select className={`${base} cursor-pointer`} value={form.service} onChange={set("service")} required>
                <option value="">Seçiniz</option>
                <option value="Web Yazılım & Tasarım">Web Yazılım &amp; Tasarım</option>
                <option value="Mobil Uygulama">Mobil Uygulama</option>
                <option value="Masaüstü Yazılım">Masaüstü Yazılım</option>
                <option value="Siber Güvenlik">Siber Güvenlik</option>
                <option value="SEO & Dijital Pazarlama">SEO &amp; Dijital Pazarlama</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Mesaj</label>
              <textarea
                className={`${base} resize-none h-24`}
                placeholder="Projenizden kısaca bahsedin..."
                value={form.detail}
                onChange={set("detail")}
              />
            </div>

            {/* İletişim yöntemi */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider">Size nasıl ulaşalım?</label>
              <div className="flex gap-2">
                {YONTEMLER.map(({ id, label, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setYontem(id)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all duration-200"
                    style={{
                      border: yontem === id ? `1px solid ${color}45` : "1px solid rgba(255,255,255,0.06)",
                      background: yontem === id ? `${color}12` : "transparent",
                      color: yontem === id ? color : "#52525b",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {hata && (
              <p className="text-sm text-red-400 text-center bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">
                {hata}
              </p>
            )}

            <button
              type="submit"
              disabled={yukleniyor}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${C}, ${V})`, color: "#030712" }}
            >
              {yukleniyor ? <XipIcon name="loader" className="w-4 h-4 animate-spin" glow="strong" /> : <XipIcon name="send" className="w-4 h-4" glow="strong" />}
              {yukleniyor ? "gönderiliyor..." : "gönder"}
            </button>
          </form>
        </>
      )}
    </motion.div>
  );
}

// ══ Ana bileşen ════════════════════════════════════════════════════════════

export default function ContactPageClient() {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const isMapInView = useInView(mapRef, { once: true, amount: 0.2 });

  return (
    <div className="min-h-screen py-20 lg:py-28 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* ══ Başlık ═════════════════════════════════════════════════════════ */}
      <motion.div
        ref={ref}
        className="mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-600 mb-3">İletişim</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Bize Ulaşın</h1>
        <p className="text-zinc-500 text-base max-w-md">
          Projeniz için ücretsiz görüşme talep edin veya doğrudan yazın.
        </p>
      </motion.div>

      {/* ══ İçerik grid ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

        {/* Sol — Kanallar */}
        <div className="flex flex-col gap-3">
          {KANALLAR.map((k, i) => {
            return (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, x: -16 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                {k.href ? (
                  <a
                    href={k.href}
                    target={k.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (k.href?.includes("wa.me")) trackWhatsAppClick("contact_page");
                    }}
                    className="group flex items-center gap-4 px-5 py-4 rounded-xl border border-zinc-800/60 bg-zinc-950/40 hover:border-zinc-700/60 transition-all duration-200"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${k.color}12`, border: `1px solid ${k.color}20` }}
                    >
                      <XipIcon name={k.icon} className="w-4 h-4" style={{ color: k.color }} glow="none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-zinc-600 mb-0.5">{k.label}</p>
                      <p className="text-sm text-zinc-300 font-medium truncate group-hover:text-white transition-colors">{k.value}</p>
                    </div>
                    <XipIcon name="arrow-right" className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </a>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-zinc-800/60 bg-zinc-950/40">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${k.color}12`, border: `1px solid ${k.color}20` }}
                    >
                      <XipIcon name={k.icon} className="w-4 h-4" style={{ color: k.color }} glow="none" />
                    </div>
                    <div>
                      <p className="text-[11px] text-zinc-600 mb-0.5">{k.label}</p>
                      <p className="text-sm text-zinc-300 font-medium">{k.value}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* WhatsApp hızlı erişim */}
          <motion.a
            href={`https://wa.me/${BRAND_COMPANY.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-between gap-3 px-5 py-4 rounded-xl transition-all duration-200 hover:opacity-90"
            style={{ background: `${C}0d`, border: `1px solid ${C}20` }}
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <XipIcon name="message-circle" className="w-4 h-4 shrink-0" style={{ color: C }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: C }}>WhatsApp'tan Yazın</p>
                <p className="text-xs text-ink-muted">Birkaç dakika içinde yanıt</p>
              </div>
            </div>
            <XipIcon name="arrow-right" className="w-3.5 h-3.5 shrink-0" style={{ color: C }} />
          </motion.a>
        </div>

        {/* Sağ — Form */}
        <IletisimFormu isInView={isInView} />
      </div>

      {/* ══ Harita ═══════════════════════════════════════════════════════ */}
      <motion.div
        ref={mapRef}
        className="mt-20 pt-16 border-t border-zinc-800/40"
        initial={{ opacity: 0, y: 20 }}
        animate={isMapInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-600 mb-3">Konum</p>
        <h2 className="text-2xl font-bold text-white mb-1">Ofisimiz</h2>
        <p className="text-zinc-500 text-sm mb-8">{BRAND_COMPANY.address}</p>

        <div className="relative rounded-2xl overflow-hidden border border-zinc-800/50" style={{ minHeight: 360 }}>
          <GoogleMap
            center={{ lat: 41.0682, lng: 28.9862 }}
            zoom={15}
            className="w-full h-full min-h-[360px]"
          />
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800/60 backdrop-blur-sm pointer-events-none">
            <XipIcon name="map-pin" className="w-3 h-3 text-zinc-400" />
            <span className="text-xs text-zinc-400">{BRAND_COMPANY.addressShort}</span>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
