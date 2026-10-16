"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  CreditCard,
  Send,
  ArrowLeft,
  AlertCircle,
  Loader2,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import TitleText from "@/components/Common/TitleText/TitleText";

// IBAN bilgileri — gerçek degerleri .env'den alıyoruz
const IBAN = process.env.NEXT_PUBLIC_PAYMENT_IBAN || "TR00 0000 0000 0000 0000 0000 00";
const BANK_NAME = process.env.NEXT_PUBLIC_PAYMENT_BANK_NAME || "Ziraat Bankası";
const ACCOUNT_NAME = process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME || "XipSoft Yazılım";

interface FormData {
  name: string;
  email: string;
  phone: string;
  note: string;
}

function OdemeForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL'den ürün bilgisi al (?product=gate+E-Ticaret&price=8000)
  const productName = searchParams.get("product") || "";
  const productPrice = searchParams.get("price") || "";
  const productId = searchParams.get("id") || "";

  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    note: productName ? `${productName} satın alma talebi` : "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!form.name.trim()) errs.name = "Ad soyad zorunlu";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "geçerli bir e-posta girin";
    if (!form.phone.trim()) errs.phone = "Telefon numarası zorunlu";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/odeme/bildirim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          productName,
          productPrice,
          productId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bir hata olustu");
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || "Bildirim gönderilemedi, lütfen WhatsApp'tan ulasın.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 py-12"
      >
        <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-green-400" />
        </div>
        <div>
          <TitleText tag="h2" variant="section" className="mb-2">Talebiniz Alındı!</TitleText>
          <p className="text-zinc-400 max-w-md mx-auto">
            Ödeme bildiriminiz ekibimize iletildi. Havale/EFT islemini tamamladıktan sonra
            en kısa sürede sizinle iletisime geçecegiz.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/hizmetler"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold transition-colors"
          >
            Hizmetlere Dön
          </Link>
          <a
            href={`https://wa.me/905444548444?text=${encodeURIComponent(`Merhaba, ${productName} için ödeme yaptım. Ad: ${form.name}, E-posta: ${form.email}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 justify-center"
          >
            <MessageCircle className="w-5 h-5" />
            WhatsApp ile Onayla
          </a>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Ürün Özeti */}
      {productName && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30"
        >
          <p className="text-sm text-purple-300 font-semibold mb-1">Seçilen Ürün</p>
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-lg">{productName}</span>
            {productPrice && (
              <span className="text-purple-400 font-bold text-xl">
                {Number(productPrice).toLocaleString("tr-TR")} ₺
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* IBAN Bilgileri */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-purple-400" />
          <TitleText tag="h2" variant="content" className="text-white">Havale / EFT Bilgileri</TitleText>
        </div>
        <div className="p-6 space-y-4">
          {/* Banka */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-zinc-800">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Banka</p>
              <p className="text-white font-semibold">{BANK_NAME}</p>
            </div>
          </div>

          {/* Hesap Sahibi */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-zinc-800">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Hesap Sahibi</p>
              <p className="text-white font-semibold">{ACCOUNT_NAME}</p>
            </div>
            <button
              onClick={() => copyToClipboard(ACCOUNT_NAME, "name")}
              className="p-2 hover:bg-purple-500/10 rounded-lg transition-colors"
              title="Kopyala"
            >
              {copied === "name" ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          </div>

          {/* IBAN */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-zinc-800">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">IBAN</p>
              <p className="text-white font-mono font-semibold tracking-wider">{IBAN}</p>
            </div>
            <button
              onClick={() => copyToClipboard(IBAN.replace(/\s/g, ""), "iban")}
              className="p-2 hover:bg-purple-500/10 rounded-lg transition-colors flex-shrink-0"
              title="IBAN Kopyala"
            >
              {copied === "iban" ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          </div>

          {/* Açıklama */}
          {productName && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div>
                <p className="text-xs text-amber-400 mb-0.5">Açıklama (Zorunlu)</p>
                <p className="text-white font-semibold">{form.email || "E-postanızı yazın"} — {productName}</p>
              </div>
              <button
                onClick={() => copyToClipboard(`${form.email || "email"} - ${productName}`, "desc")}
                className="p-2 hover:bg-amber-500/10 rounded-lg transition-colors flex-shrink-0"
                title="Açıklama Kopyala"
              >
                {copied === "desc" ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </div>
          )}

          <p className="text-xs text-zinc-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            Havale açıklamasına e-posta adresinizi ve ürün adını yazmayı unutmayın. Ödeme
            onaylandıktan sonra 24 saat içinde sizinle iletisime geçilecektir.
          </p>
        </div>
      </motion.div>

      {/* Bildirim Formu */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <Send className="w-5 h-5 text-purple-400" />
          <TitleText tag="h2" variant="content" className="text-white">Ödeme Bildirimi gönder</TitleText>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-zinc-400">
            Havaleyi yaptıktan sonra asagıdaki formu doldurun, ekibimiz sizi en kısa sürede arasın.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ad Soyad */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Ad Soyad <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ahmet Yılmaz"
                className={`w-full px-4 py-2.5 bg-black/40 border rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors ${
                  errors.name ? "border-red-500" : "border-zinc-700"
                }`}
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Telefon <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+90 5XX XXX XXXX"
                className={`w-full px-4 py-2.5 bg-black/40 border rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors ${
                  errors.phone ? "border-red-500" : "border-zinc-700"
                }`}
              />
              {errors.phone && (
                <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* E-posta */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              E-posta <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="ahmet@example.com"
              className={`w-full px-4 py-2.5 bg-black/40 border rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors ${
                errors.email ? "border-red-500" : "border-zinc-700"
              }`}
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Not */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Not / Açıklama
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              rows={3}
              placeholder="Ek bilgi veya talepleriniz..."
              className="w-full px-4 py-2.5 bg-black/40 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          {submitError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 disabled:from-zinc-700 disabled:to-zinc-700 text-white rounded-xl font-bold transition-all hover:shadow-[0_0_30px_rgba(167,139,250,0.3)] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                gönderiliyor...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Ödeme Bildirimi gönder
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* WhatsApp Alternatif */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <p className="text-zinc-500 text-sm mb-3">veya dogrudan iletisime geçin</p>
        <a
          href={`https://wa.me/905444548444?text=${encodeURIComponent(
            productName
              ? `Merhaba, ${productName} ürününü satın almak istiyorum. Fiyat: ${productPrice} ₺`
              : "Merhaba, hizmetleriniz hakkında bilgi almak istiyorum."
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/40 text-green-400 rounded-xl font-semibold transition-all"
        >
          <MessageCircle className="w-5 h-5" />
          WhatsApp ile Iletisim
        </a>
      </motion.div>
    </div>
  );
}

export default function OdemeClient() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-purple-900/10 to-black py-20 px-4">
      <div className="max-w-2xl mx-auto">
        {/* geri Butonu */}
        <Link
          href="/hizmetler"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Hizmetlere Dön
        </Link>

        {/* Baslık */}
        <div className="mb-8">
          <TitleText tag="h1" variant="glass" className="mb-2">Ödeme</TitleText>
          <p className="text-zinc-400">
            güvenli havale/EFT ile ödeme yapın, ekibimiz en kısa sürede sizinle iletisime geçsin.
          </p>
        </div>

        <Suspense fallback={<div className="text-zinc-400">Yükleniyor...</div>}>
          <OdemeForm />
        </Suspense>
      </div>
    </main>
  );
}
