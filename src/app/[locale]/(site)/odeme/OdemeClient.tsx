"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import XipIcon from "@/components/Ui/Icon";
import TitleText from "@/components/Common/TitleText/TitleText";
import { BankTransferBlock, TeklifItemsTable } from "@/components/Teklif/TeklifSummary";
import { reportPaymentAction } from "@/app/_actions/odeme-actions";
import { formatTry, type PublicTeklif } from "@/lib/teklif-shared";

interface FormData {
  name: string;
  email: string;
  phone: string;
  note: string;
}

function OdemeForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tokenlı teklif akışı
  const token = searchParams.get("token");

  // Token'sız ürün akışı (?product=&price=&id=)
  const productName = searchParams.get("product") || "";
  const productPrice = searchParams.get("price") || "";

  const [quote, setQuote] = useState<PublicTeklif | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [form, setForm] = useState<FormData>({ name: "", email: "", phone: "", note: "" });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Teklif tutarını/kalemlerini token ile getir
  useEffect(() => {
    if (!token) {
      setForm((f) => ({ ...f, note: productName ? `${productName} satın alma talebi` : "" }));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/teklif?token=${token}&full=1`, { cache: "no-store" });
        if (res.status === 404) {
          if (!cancelled) setQuoteError("Teklif bulunamadı veya süresi dolmuş.");
          return;
        }
        const json = (await res.json()) as PublicTeklif;
        if (cancelled) return;
        setQuote(json);
        setForm((f) => ({ ...f, name: f.name || json.name || "" }));
      } catch {
        if (!cancelled) setQuoteError("Teklif bilgileri yüklenemedi. Lütfen tekrar deneyin.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, productName]);

  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!form.name.trim()) errs.name = "Ad soyad zorunlu";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Geçerli bir e-posta girin";
    }
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
      const result = await reportPaymentAction({
        token: token ?? "",
        name: form.name,
        email: form.email,
        phone: form.phone,
        note: form.note,
        productName,
        productPrice,
      });
      if (!result.success) throw new Error(result.error || "Bir hata oluştu");
      if (result.redirect) {
        router.push(result.redirect);
        return;
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Bildirim gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 py-12 text-center"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-green-500/40 bg-green-500/20">
          <XipIcon name="check" className="h-10 w-10 text-green-400" glow="none" />
        </div>
        <div>
          <TitleText tag="h2" variant="brand" className="mb-2">
            Talebiniz Alındı!
          </TitleText>
          <p className="mx-auto max-w-md text-zinc-400">
            Ödeme bildiriminiz ekibimize iletildi. Havale/EFT işlemini tamamladıktan sonra en kısa
            sürede sizinle iletişime geçeceğiz.
          </p>
        </div>
        <Link
          href="/hizmetler"
          className="inline-flex rounded-xl bg-zinc-800 px-6 py-3 font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          Hizmetlere Dön
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Teklif özeti (tokenlı akış) */}
      {token && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
        >
          {quoteError ? (
            <p className="flex items-center gap-2 text-sm text-red-400">
              <XipIcon name="alert-circle" className="h-4 w-4 shrink-0" glow="none" />
              {quoteError}
            </p>
          ) : !quote ? (
            <p className="flex items-center gap-2 text-sm text-zinc-400">
              <XipIcon name="loader" className="h-4 w-4 animate-spin" />
              Teklif bilgileri yükleniyor...
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">Teklif</p>
                  <p className="font-semibold text-white">{quote.service}</p>
                </div>
                <p className="text-xl font-bold text-purple-400">
                  {formatTry(quote.price ?? undefined)}
                </p>
              </div>
              <TeklifItemsTable items={quote.items} />
            </>
          )}
        </motion.div>
      )}

      {/* Token'sız ürün özeti */}
      {!token && productName && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4"
        >
          <p className="mb-1 text-sm font-semibold text-purple-300">Seçilen Ürün</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-white">{productName}</span>
            {productPrice && (
              <span className="text-xl font-bold text-purple-400">{formatTry(productPrice)}</span>
            )}
          </div>
        </motion.div>
      )}

      {/* Havale / IBAN + açıklama kodu */}
      {token ? (
        quote && <BankTransferBlock referenceCode={quote.reference_code} />
      ) : (
        <BankTransferBlock
          descriptionHint={productName ? `E-posta adresiniz + ${productName}` : "E-posta adresiniz"}
        />
      )}

      {/* Ödeme bildirim formu */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
      >
        <div className="flex items-center gap-3 border-b border-zinc-800 p-4">
          <XipIcon name="send" className="h-5 w-5 text-purple-400" />
          <TitleText tag="h2" variant="content" className="text-white">
            Ödeme Bildirimi Gönder
          </TitleText>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <p className="text-sm text-zinc-400">
            Havaleyi yaptıktan sonra aşağıdaki formu doldurun; ödemenizi referans koduyla eşleştirip
            onaylayalım.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Ad Soyad" required error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ahmet Yılmaz"
                className={inputCls(errors.name)}
              />
            </Field>
            <Field label="Telefon" required error={errors.phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+90 5XX XXX XXXX"
                className={inputCls(errors.phone)}
              />
            </Field>
          </div>

          <Field label="E-posta" required error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="ahmet@example.com"
              className={inputCls(errors.email)}
            />
          </Field>

          <Field label="Not / Açıklama">
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              rows={3}
              placeholder="Ödeme tarihi, dekont no veya ek bilgi..."
              className={`${inputCls()} resize-none`}
            />
          </Field>

          {submitError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <XipIcon name="alert-circle" className="h-4 w-4 shrink-0" glow="none" />
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (Boolean(token) && !quote)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 py-3 font-bold text-white transition-all hover:from-purple-700 hover:to-fuchsia-700 disabled:from-zinc-700 disabled:to-zinc-700"
          >
            {submitting ? (
              <>
                <XipIcon name="loader" className="h-5 w-5 animate-spin" glow="strong" />
                Gönderiliyor...
              </>
            ) : (
              <>
                <XipIcon name="send" className="h-5 w-5" glow="strong" />
                Ödeme Bildirimi Gönder
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function inputCls(error?: string) {
  return `w-full rounded-lg border px-4 py-2.5 text-white placeholder-zinc-600 transition-colors focus:border-purple-500 focus:outline-none ${
    error ? "border-red-500" : "border-zinc-700"
  } bg-black/40`;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function OdemeClient() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-purple-900/10 to-black px-4 py-20">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/hizmetler"
          className="mb-8 inline-flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
        >
          <XipIcon name="arrow-left" className="h-4 w-4" />
          Hizmetlere Dön
        </Link>

        <div className="mb-8">
          <TitleText tag="h1" variant="glass" className="mb-2">
            Ödeme
          </TitleText>
          <p className="text-zinc-400">
            Güvenli havale/EFT ile ödeme yapın; ödemenizi referans koduyla eşleştirip onaylayalım.
          </p>
        </div>

        <Suspense fallback={<div className="text-zinc-400">Yükleniyor...</div>}>
          <OdemeForm />
        </Suspense>
      </div>
    </main>
  );
}
