"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, Clock, XCircle, ExternalLink, Loader2 } from "lucide-react";
import LedBorder from "@/components/Ui/LedBorder/LedBorder";
import TitleText from "@/components/Common/TitleText/TitleText";

type Status = "pending" | "quoted" | "rejected";

interface QuoteData {
  status: Status;
  price: string | null;
  payment_url: string | null;
  payment_method: string | null;
  name: string;
  service: string;
  email: string;
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "905444548444";

export default function TeklifClient() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!token) return;

    const startTime = Date.now();
    const MAX_POLL_MS = 10 * 60 * 1000; // 10 dakika
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      // 10 dakika geçtiyse durdur
      if (Date.now() - startTime > MAX_POLL_MS) {
        setTimedOut(true);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/teklif?token=${token}&full=1`);
        if (res.status === 404) { setNotFound(true); setLoading(false); return; }
        const json = await res.json();
        setData(json);
        setLoading(false);
        if (json.status === "pending") {
          timeoutId = setTimeout(poll, 5000);
        }
      } catch {
        setLoading(false);
      }
    };

    poll();
    return () => clearTimeout(timeoutId);
  }, [token]);

  if (loading) return <Screen><Loader2 className="w-10 h-10 text-violet-400 animate-spin" /></Screen>;
  if (notFound) return <Screen><NotFoundCard /></Screen>;
  if (timedOut) return <Screen><TimedOutCard onRetry={() => window.location.reload()} /></Screen>;
  if (!data) return null;

  return (
    <Screen>
      <AnimatePresence mode="wait">
        {data.status === "pending" && <PendingCard key="pending" name={data.name} service={data.service} />}
        {data.status === "quoted" && <QuotedCard key="quoted" data={data} />}
        {data.status === "rejected" && <RejectedCard key="rejected" />}
      </AnimatePresence>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center p-4">
      {/* Prism glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/10 blur-[120px] rounded-full" />
      </div>
      {children}
    </div>
  );
}

function PendingCard({ name, service }: { name: string; service: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center relative overflow-hidden"
    >
      {prismBorder}
      <div className="flex justify-center mb-5">
        <div className="relative">
          <Clock className="w-14 h-14 text-amber-400" />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-amber-400/30"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>
      <TitleText tag="h1" variant="glass" className="mb-2">Teklifiniz Hazırlanıyor</TitleText>
      <p className="text-zinc-400 text-sm mb-6">
        Merhaba <span className="text-white font-medium">{name}</span>, <br />
        <span className="text-violet-400">{service}</span> için talebiniz alındı.<br />
        Ekibimiz en kısa surede fiyat belirleyecek.
      </p>
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-amber-400"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        Bu sayfa otomatik güncelleniyor
        Bu sayfa otomatik guncelleniyor
      </div>
    </motion.div>
  );
}

function QuotedCard({ data }: { data: QuoteData }) {
  const [saved, setSaved] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center relative overflow-hidden"
    >
      {prismBorder}
      <div className="flex justify-center mb-5">
        <CheckCircle className="w-14 h-14 text-emerald-400" />
      </div>
      <TitleText tag="h1" variant="glass" className="mb-1">Teklifiniz Hazır!</TitleText>
      <p className="text-zinc-500 text-sm mb-6">
        Merhaba <span className="text-white font-medium">{data.name}</span>,{" "}
        <span className="text-violet-400">{data.service}</span> için teklifiniz:
      </p>

      {/* Fiyat */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Teklif Tutarı</p>
        <p className="text-3xl -black bg-gradient-to-r from-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          {data.price}
        </p>
      </div>

      <div className="space-y-3">
        {/* Havale/EFT ödeme yöntemi */}
        {data.payment_method === "havale" && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-4">
            <p className="text-xs text-amber-400 uppercase tracking-widest font-bold mb-3">💳 Havale / EFT ile Ödeme</p>
            <div className="space-y-2.5 text-left">
              <div className="flex items-start gap-2">
                <span className="text-xs text-zinc-500 min-w-20 mt-0.5">Banka:</span>
                <span className="text-sm font-bold text-white">{process.env.NEXT_PUBLIC_BANK_NAME || "Ziraat Bankası"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-zinc-500 min-w-20 mt-0.5">IBAN:</span>
                <span className="text-sm -mono font-bold text-white break-all">{process.env.NEXT_PUBLIC_BANK_IBAN || "TR..."}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-zinc-500 min-w-20 mt-0.5">Ad Soyadı:</span>
                <span className="text-sm font-bold text-white">{process.env.NEXT_PUBLIC_BANK_HOLDER || "XipSoft Yazılım Ltd. sti."}</span>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-amber-500/20">
                <span className="text-xs text-zinc-500 min-w-20 mt-0.5">Açıklama:</span>
                <span className="text-sm -mono bg-zinc-900/50 text-amber-400 px-2 py-1 rounded text-center flex-1">
                  XIPS-{data.name?.substring(0, 3).toUpperCase() || "REQ"}-{Date.now().toString().slice(-6).toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-amber-600/80 mt-3">
              ✓ Lutfen havale/EFT yapıp açıklama koluna referans numarasını yazınız. <br />
              Ödeme yaptıktan sonra tarafımızla Iletisime geçiniz.
            </p>
          </div>
        )}

        {/* Ödeme linki varsa — direkt ödeme */}
        {data.payment_url && (
          <a
            href={data.payment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm text-zinc-950 bg-gradient-to-r from-cyan-400 to-violet-500 hover:from-cyan-300 hover:to-violet-400 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            Ödeme Yap
          </a>
        )}

        {/* Teklifi Kaydet butonu */}
        {!saved ? (
          <button
            onClick={() => {
              const text = `XipSoft Teklif\nHizmet: ${data.service}\nTutar: ${data.price}\nLink: ${window.location.href}`;
              navigator.clipboard?.writeText(text).catch(() => { });
              setSaved(true);
            }}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-white bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-all"
          >
            <CheckCircle className="w-4 h-4 text-zinc-400" />
            Teklifi Kaydet (Kopyala)
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="w-4 h-4" />
            Teklif bilgileri kopyalandı!
          </div>
        )}

        <p className="text-xs text-zinc-600 pt-1">
          Sorularınız için:{" "}
          <a href="mailto:info@xipsoft.net" className="text-zinc-400 hover:text-white">
            info@xipsoft.net
          </a>
        </p>
      </div>
    </motion.div>
  );
}

function RejectedCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center relative overflow-hidden"
    >
      {prismBorder}
      <div className="flex justify-center mb-5">
        <XCircle className="w-14 h-14 text-red-400" />
      </div>
      <TitleText tag="h1" variant="glass" className="mb-2">Teklif Verilmedi</TitleText>
      <p className="text-zinc-400 text-sm mb-6">
        uzgunuz, bu talep için su an teklif veremiyoruz.<br />
        Farklı bir hizmet için tekrar deneyebilirsiniz.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-zinc-950 bg-gradient-to-r from-cyan-400 to-violet-500 hover:opacity-90 transition-all"
      >
        Ana Sayfaya Dön
      </Link>
    </motion.div>
  );
}

function NotFoundCard() {
  return (
    <div className="text-center">
      <p className="text-zinc-500 text-sm">Teklif bulunamadı veya suresi dolmus.</p>
      <Link href="/" className="text-violet-400 text-sm hover:underline mt-2 inline-block">Ana Sayfaya Dön</Link>
    </div>
  );
}

function TimedOutCard({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center relative overflow-hidden"
    >
      {prismBorder}
      <div className="flex justify-center mb-5">
        <Clock className="w-14 h-14 text-zinc-500" />
      </div>
      <TitleText tag="h1" variant="glass" className="mb-2">Sayfa Zaman Asımına Ugradı</TitleText>
      <p className="text-zinc-400 text-sm mb-6">
        10 dakika içinde teklif gelmedi. Sayfayı yenileyerek tekrar kontrol edebilirsiniz.
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-zinc-950 bg-gradient-to-r from-cyan-400 to-violet-500 hover:opacity-90 transition-all"
      >
        Yenile
      </button>
    </motion.div>
  );
}

const prismBorder = <LedBorder variant="prism" />;
