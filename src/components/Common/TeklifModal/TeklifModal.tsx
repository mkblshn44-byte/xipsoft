"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect } from "react";
import { X, Send, CheckCircle, Loader2, MessageCircle, Mail, Phone } from "lucide-react";
import { cn } from "@/utils";
import { useTranslations } from "next-intl";
import TitleText from "@/components/Common/TitleText/TitleText";
import { submitTeklifAction } from "@/app/_actions/teklif-actions";
import { trackTeklifSubmit, trackTeklifOpen, trackWhatsAppClick } from "@/utils/analytics";

// ── global state ──────────────────────────────────────────────────────────────
type TeklifModalState = { open: boolean; service?: string };
type Listener = (s: TeklifModalState) => void;
const listeners = new Set<Listener>();
let globalState: TeklifModalState = { open: false };

export const teklifModal = {
  open: (service?: string) => {
    globalState = { open: true, service };
    listeners.forEach((l) => l(globalState));
    trackTeklifOpen(service);
  },
  close: () => {
    globalState = { open: false };
    listeners.forEach((l) => l(globalState));
  },
};

function useTeklifModalState() {
  const [state, setState] = useState(globalState);
  useEffect(() => {
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);
  return state;
}

type Step = "form" | "done";
type ContactMethod = "whatsapp" | "email" | "telegram";

import { SITE_URL as APP_URL } from "@/lib/site-url";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "905444548444";

const inputCls = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors";
const labelCls = "block text-xs -mono text-zinc-500 uppercase tracking-wider mb-1.5";

function normalizeTeklifServiceValue(value?: string) {
  if (!value) return "";

  const aliases: Record<string, string> = {
    "web yazılım & tasarım": "Web Yazılım & Tasarım",
    "özel web yazılım & tasarım": "Web Yazılım & Tasarım",
    "mobil uygulama": "Mobil Uygulama",
    "mobil uygulama geliştirme": "Mobil Uygulama",
    "masaüstü yazılım": "Masaüstü Yazılım",
    "masaüstü yazılım çözümleri": "Masaüstü Yazılım",
    "siber güvenlik": "Siber Güvenlik",
    "siber güvenlik & denetim": "Siber Güvenlik",
    "seo & dijital pazarlama": "SEO & Dijital Pazarlama",
    "seo & dijital": "SEO & Dijital Pazarlama",
    "teknik seo & büyüme": "SEO & Dijital Pazarlama",
    "yapay zeka & otomasyon": "Yapay Zeka & Otomasyon",
    "akıllı otomasyon & yapay zeka": "Yapay Zeka & Otomasyon",
    "diger": "Diger",
    "diğer": "Diger",
    "web & e-ticaret": "Web Yazılım & Tasarım",
    "e-ticaret": "Web Yazılım & Tasarım",
    "hizmetler hub sayfası": "Diger",
  };

  const key = value.trim().toLowerCase();
  return aliases[key] ?? (value.trim() || "Diger");
}

export default function TeklifModal() {
  const { open, service: preService } = useTeklifModalState();
  const t = useTranslations("teklif");

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [contactMethod, setContactMethod] = useState<ContactMethod>("whatsapp");
  const [quoteToken, setQuoteToken] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", service: preService || "", detail: "",
  });

  const [error, setError] = useState<string | null>(null);

   
  useEffect(() => {
    if (preService) setForm((f) => ({ ...f, service: normalizeTeklifServiceValue(preService) }));
  }, [preService]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("form");
        setForm({ name: "", email: "", phone: "", service: "", detail: "" });
        setContactMethod("whatsapp");
        setQuoteToken(null);
        setError(null);
      }, 400);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await submitTeklifAction({
        ...form,
        contactMethod,
      });
      
      if (result.success && result.token) {
        setQuoteToken(result.token);
        setStep("done");
        trackTeklifSubmit(form.service);
      } else if (result.success) {
        setStep("done");
        trackTeklifSubmit(form.service);
      } else {
        setError(result.error || "Bir hata olustu, lütfen tekrar deneyin.");
      }
    } catch (err) {
      console.error('[TeklifModal] Submit failed:', err);
      setError("Baglantı hatası, lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Merhaba XipSoft, ${form.service || "hizmetleriniz"} hakkında bilgi almak istiyorum. Adım: ${form.name}`
  )}`;

  const CONTACT_OPTIONS: { id: ContactMethod; label: string; icon: typeof Mail; desc: string }[] = [
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, desc: "Hızlı yanıt" },
    { id: "email",    label: "E-posta",  icon: Mail,          desc: "info@xipsoft.net" },
    { id: "telegram", label: "Telegram", icon: Send,          desc: "@xipsoft" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={teklifModal.close} />

          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Prism top border */}
              <div className="absolute top-0 left-0 right-0 h-[2px]">
                <motion.div className="h-full w-[200%]"
                  style={{ background: "linear-gradient(90deg,transparent,#ddd6fe,#a78bfa,#a78bfa,#a78bfa,#ddd6fe,transparent)" }}
                  animate={{ x: ["-50%", "0%"] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
              </div>

              <button onClick={teklifModal.close}
                aria-label="Teklif formunu kapat"
                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>

              <div className="p-6 pt-8">
                <AnimatePresence mode="wait">

                  {/* ── FORM ── */}
                  {step === "form" && (
                    <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                      <div className="mb-5">
                        <TitleText tag="h2" variant="section" className="text-xl mb-1">{t("title")}</TitleText>
                        <p className="text-zinc-500 text-sm">{t("subtitle")}</p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="teklif-name" className={labelCls}>{t("name")}</label>
                            <input id="teklif-name" className={inputCls} placeholder={t("namePlaceholder")} value={form.name}
                              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                          </div>
                          <div>
                            <label htmlFor="teklif-phone" className={labelCls}>{t("phone")}</label>
                            <input id="teklif-phone" className={inputCls} placeholder={t("phonePlaceholder")} value={form.phone}
                              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="teklif-email" className={labelCls}>{t("email")}</label>
                          <input id="teklif-email" type="email" className={inputCls} placeholder={t("emailPlaceholder")} value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
                        </div>

                        <div>
                          <label htmlFor="teklif-service" className={labelCls}>{t("service")}</label>
                          <select id="teklif-service" className={cn(inputCls, "cursor-pointer")} value={form.service}
                            onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} required>
                            <option value="">{t("servicePlaceholder")}</option>
                            <option value="Web Yazılım & Tasarım">{t("serviceOptions.web")}</option>
                            <option value="Özel Web Yazılım & Tasarım">{t("serviceOptions.web")}</option>
                            <option value="Mobil Uygulama">{t("serviceOptions.mobile")}</option>
                            <option value="Mobil Uygulama Geliştirme">{t("serviceOptions.mobile")}</option>
                            <option value="Masaüstü Yazılım">{t("serviceOptions.desktop")}</option>
                            <option value="Masaüstü Yazılım Çözümleri">{t("serviceOptions.desktop")}</option>
                            <option value="Siber Güvenlik">{t("serviceOptions.security")}</option>
                            <option value="Siber Güvenlik & Denetim">{t("serviceOptions.security")}</option>
                            <option value="SEO & Dijital Pazarlama">{t("serviceOptions.seo")}</option>
                            <option value="Teknik SEO & Büyüme">{t("serviceOptions.seo")}</option>
                            <option value="Yapay Zeka & Otomasyon">Yapay Zeka & Otomasyon</option>
                            <option value="Akıllı Otomasyon & Yapay Zeka">Yapay Zeka & Otomasyon</option>
                            <option value="Diger">{t("serviceOptions.other")}</option>
                            <option value="Diğer">{t("serviceOptions.other")}</option>
                          </select>
                        </div>

                        {form.service && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-300">
                            <span>🔥 Canlı Açık Artırma İndirimi Aktif</span>
                            <span className="font-semibold text-amber-400">%25 Anlık İhale Avantajı</span>
                          </div>
                        )}

                        <div>
                          <label htmlFor="teklif-detail" className={labelCls}>{t("detail")}</label>
                          <textarea id="teklif-detail" className={cn(inputCls, "resize-none h-20")} placeholder={t("detailPlaceholder")}
                            value={form.detail} onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))} />
                        </div>

                        {/* Iletisim yöntemi seçimi */}
                        {/* Iletisim yöntemi seçimi */}
                        <div>
                          <label className={labelCls}>Size nasıl ulasalım?</label>
                          <div className="grid grid-cols-3 gap-2">
                            {CONTACT_OPTIONS.map(({ id, label, icon: Icon, desc }) => (
                              <button key={id} type="button"
                                onClick={() => setContactMethod(id)}
                                className={cn(
                                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all",
                                  contactMethod === id
                                    ? "border-violet-500 bg-violet-500/10 text-white"
                                    : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600"
                                )}>
                                <Icon className="w-4 h-4" />
                                <span>{label}</span>
                                <span className="text-[10px] text-zinc-600">{desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <button type="submit" disabled={loading}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-zinc-950 bg-gradient-to-r from-cyan-400 to-violet-500 hover:from-cyan-300 hover:to-violet-400 transition-all disabled:opacity-60">
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {loading ? t("submitting") : t("submit")}
                        </button>

                        {error && (
                          <p className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                            {error}
                          </p>
                        )}
                      </form>
                    </motion.div>
                  )}

                  {/* ── DONE ── */}
                  {step === "done" && (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-5 py-6 text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.1 }}>
                        <CheckCircle className="w-14 h-14 text-emerald-400" />
                      </motion.div>
                      <div>
                        <h3 className="-display font-bold text-xl text-white mb-2">Talebiniz Alındı!</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                          En kısa surede{" "}
                          <span className="text-white font-medium">
                            {contactMethod === "whatsapp" ? "WhatsApp" : contactMethod === "email" ? "e-posta" : "Telegram"}
                          </span>{" "}
                          uzerinden size ulasacagız.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 w-full">
                        {/* Teklif takip linki */}
                        {quoteToken && (
                          <a
                            href={`/teklif/${quoteToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-zinc-950 bg-gradient-to-r from-cyan-400 to-violet-500 hover:from-cyan-300 hover:to-violet-400 transition-all"
                          >
                            Teklifimi göruntule →
                          </a>
                        )}

                        {/* Seçilen kanala göre direkt link */}
                        {contactMethod === "whatsapp" && (
                          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                            onClick={() => trackWhatsAppClick("teklif_modal")}
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-white bg-emerald-600/20 border border-emerald-600/30 hover:bg-emerald-600/30 transition-all">
                            <MessageCircle className="w-4 h-4 text-emerald-400" />
                            WhatsApp'tan Yaz
                          </a>
                        )}
                        {contactMethod === "telegram" && (
                          <a href="https://t.me/xipsoft" target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-white bg-blue-600/20 border border-blue-600/30 hover:bg-blue-600/30 transition-all">
                            <Send className="w-4 h-4 text-blue-400" />
                            Telegram'dan Yaz
                          </a>
                        )}
                        {contactMethod === "email" && (
                          <a href="mailto:info@xipsoft.net"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-white bg-violet-600/20 border border-violet-600/30 hover:bg-violet-600/30 transition-all">
                            <Mail className="w-4 h-4 text-violet-400" />
                            info@xipsoft.net
                          </a>
                        )}
                        <button onClick={teklifModal.close}
                          className="w-full py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                          Kapat
                        </button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
