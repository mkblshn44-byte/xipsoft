"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import XipIcon from "@/components/Ui/Icon";
import LedBorder from "@/components/Ui/LedBorder/LedBorder";
import TitleText from "@/components/Common/TitleText/TitleText";
import { BankTransferBlock, TeklifItemsTable } from "@/components/Teklif/TeklifSummary";
import {
  TEKLIF_STATUS_META,
  formatTry,
  stageIndex,
  teklifItemsTotal,
  type PublicTeklif,
} from "@/lib/teklif-shared";

interface TeklifClientProps {
  token: string;
  initial: PublicTeklif;
}

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_MS = 15 * 60 * 1000;

export default function TeklifClient({ token, initial }: TeklifClientProps) {
  const [data, setData] = useState<PublicTeklif>(initial);
  const [deleted, setDeleted] = useState(false);
  const startedAt = useRef(Date.now());

  // Admin teklif hazırlarken sayfa canlı kalsın: yalnızca "pending/quoted"
  // durumlarında poll edilir; terminal durumlarda gereksiz istek atılmaz.
  useEffect(() => {
    if (data.status !== "pending" && data.status !== "quoted") return;

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt.current > MAX_POLL_MS) return;
      try {
        const res = await fetch(`/api/teklif?token=${token}&full=1`, { cache: "no-store" });
        if (res.status === 404) {
          setDeleted(true);
          return;
        }
        if (res.ok) {
          const json = (await res.json()) as PublicTeklif;
          setData(json);
          if (json.status !== "pending" && json.status !== "quoted") return;
        }
      } catch {
        /* ağ hatasında sessizce tekrar dene */
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, data.status]);

  if (deleted) {
    return (
      <Screen>
        <div className="text-center">
          <p className="text-sm text-zinc-500">Teklif bulunamadı veya süresi dolmuş.</p>
          <Link href="/" className="mt-2 inline-block text-sm text-violet-400 hover:underline">
            Ana Sayfaya Dön
          </Link>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-8"
      >
        <LedBorder variant="prism" />
        <StatusIcon status={data.status} />

        <TitleText tag="h1" variant="glass" className="mb-1">
          {data.status === "pending" ? "Teklifiniz Hazırlanıyor" : "Teklifiniz"}
        </TitleText>
        <p className="mb-6 text-sm text-zinc-400">
          Merhaba <span className="font-medium text-white">{data.name}</span>,{" "}
          <span className="text-violet-400">{data.service}</span> talebiniz için:
        </p>

        <StatusBadge status={data.status} />

        {/* Kalemler + toplam */}
        <div className="mt-5">
          <TeklifItemsTable items={data.items} />
        </div>

        {data.status === "pending" && (
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-amber-400"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            Ekibimiz fiyatı belirliyor — bu sayfa otomatik güncellenir.
          </div>
        )}

        {data.status === "rejected" && (
          <p className="mt-5 text-sm text-zinc-400">
            Üzgünüz, bu talep için şu an teklif veremiyoruz. Farklı bir hizmet için yeniden
            deneyebilirsiniz.
          </p>
        )}

        {/* Teklif hazır → ödemeye geç */}
        {data.status === "quoted" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-center">
              <p className="mb-1 text-xs uppercase tracking-widest text-zinc-500">Teklif Tutarı</p>
              <p className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-3xl font-black text-transparent">
                {formatTry(data.price ?? teklifItemsTotal(data.items))}
              </p>
            </div>

            <Link
              href={`/odeme?token=${token}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 py-3.5 text-sm font-bold text-zinc-950 transition-all hover:from-cyan-300 hover:to-violet-400"
            >
              Devam Et / Ödemeye Geç
              <XipIcon name="arrow-right" className="h-4 w-4" glow="strong" />
            </Link>

            {data.payment_url && (
              <a
                href={data.payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-700"
              >
                <XipIcon name="external-link" className="h-4 w-4" />
                Kart ile Öde
              </a>
            )}

            <BankTransferBlock referenceCode={data.reference_code} />
          </div>
        )}

        {/* Ödeme sonrası aşamalar için takip sayfasına yönlendir */}
        {stageIndex(data.status) > stageIndex("quoted") && (
          <Link
            href={`/takip/${token}`}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 py-3.5 text-sm font-bold text-zinc-950 transition-all hover:from-cyan-300 hover:to-violet-400"
          >
            Süreç Takibine Git
            <XipIcon name="arrow-right" className="h-4 w-4" glow="strong" />
          </Link>
        )}

        <SaveButton data={data} />
      </motion.div>
    </Screen>
  );
}

function StatusIcon({ status }: { status: PublicTeklif["status"] }) {
  const cls = "mx-auto mb-4 h-14 w-14";
  if (status === "pending") return <XipIcon name="clock" className={`${cls} text-amber-400`} glow="strong" />;
  if (status === "rejected") return <XipIcon name="x-circle" className={`${cls} text-red-400`} glow="strong" />;
  return <XipIcon name="check-circle" className={`${cls} text-emerald-400`} glow="strong" />;
}

function StatusBadge({ status }: { status: PublicTeklif["status"] }) {
  const meta = TEKLIF_STATUS_META[status];
  const tone: Record<string, string> = {
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    info: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    danger: "border-red-500/30 bg-red-500/10 text-red-300",
  };
  return (
    <div className="flex justify-center">
      <span
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone[meta.tone] ?? tone.info}`}
      >
        {meta.label}
      </span>
    </div>
  );
}

function SaveButton({ data }: { data: PublicTeklif }) {
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const text = [
      "XipSoft Teklif",
      `Hizmet: ${data.service}`,
      `Tutar: ${formatTry(data.price ?? teklifItemsTotal(data.items))}`,
      `Referans: ${data.reference_code}`,
      `Link: ${window.location.href}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* pano izni yoksa sessizce geç */
    }
    setSaved(true);
  };

  return saved ? (
    <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-3 text-sm text-emerald-400">
      <XipIcon name="check" className="h-4 w-4" glow="none" />
      Teklif bilgileri kopyalandı!
    </div>
  ) : (
    <button
      type="button"
      onClick={save}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-700"
    >
      <XipIcon name="copy" className="h-4 w-4 text-zinc-400" />
      Teklifi Kaydet (Kopyala)
    </button>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>
      {children}
    </div>
  );
}
