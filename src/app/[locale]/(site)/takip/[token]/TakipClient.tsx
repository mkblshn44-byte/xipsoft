"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import XipIcon from "@/components/Ui/Icon";
import TitleText from "@/components/Common/TitleText/TitleText";
import LedBorder from "@/components/Ui/LedBorder/LedBorder";
import { BankTransferBlock, TeklifItemsTable } from "@/components/Teklif/TeklifSummary";
import {
  TEKLIF_STAGES,
  TEKLIF_STATUS_META,
  formatTry,
  stageIndex,
  type PublicTeklif,
  type PublicTeklifEvent,
} from "@/lib/teklif-shared";

interface TakipClientProps {
  token: string;
  initial: PublicTeklif;
  initialEvents: PublicTeklifEvent[];
}

const POLL_INTERVAL_MS = 10000;

export default function TakipClient({ token, initial, initialEvents }: TakipClientProps) {
  const [teklif, setTeklif] = useState<PublicTeklif>(initial);
  const [events, setEvents] = useState<PublicTeklifEvent[]>(initialEvents);
  const [deleted, setDeleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/teklif?token=${token}&full=1`, { cache: "no-store" });
      if (res.status === 404) {
        setDeleted(true);
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as PublicTeklif & { events?: PublicTeklifEvent[] };
        setTeklif(json);
        if (json.events) setEvents(json.events);
      }
    } catch {
      /* sessizce yoksay */
    } finally {
      setRefreshing(false);
    }
  };

  // Süreç devam ederken aşamalar canlı kalsın; terminal durumda dur.
  useEffect(() => {
    if (teklif.status === "completed" || teklif.status === "rejected") return;
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teklif.status, token]);

  if (deleted) {
    return (
      <Screen>
        <p className="text-sm text-zinc-500">Teklif bulunamadı veya süresi dolmuş.</p>
        <Link href="/" className="mt-2 text-sm text-violet-400 hover:underline">
          Ana Sayfaya Dön
        </Link>
      </Screen>
    );
  }

  const current = stageIndex(teklif.status);
  const isRejected = teklif.status === "rejected";

  return (
    <Screen>
      <div className="w-full max-w-2xl space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
          <LedBorder variant="prism" />

          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">Süreç Takibi</p>
              <TitleText tag="h1" variant="glass" className="mt-1 text-2xl">
                {teklif.service}
              </TitleText>
              <p className="mt-1 text-sm text-zinc-400">
                Merhaba <span className="font-medium text-white">{teklif.name}</span> — referans{" "}
                <span className="font-mono text-amber-300">{teklif.reference_code}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={refreshing}
              title="Yenile"
              aria-label="Durumu yenile"
              className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
            >
              <XipIcon name="refresh-cw" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {isRejected ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-5">
              <XipIcon name="x-circle" className="h-6 w-6 shrink-0 text-red-400" glow="none" />
              <div>
                <p className="font-semibold text-red-300">Teklif Verilmedi</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Bu talep için şu an teklif veremiyoruz. Farklı bir hizmet için yeniden
                  başvurabilirsiniz.
                </p>
              </div>
            </div>
          ) : (
            <StageTimeline current={current} />
          )}

          {/* Ödeme gerekiyorsa IBAN + referans kodu */}
          {teklif.status === "quoted" && (
            <div className="mt-6 space-y-4">
              <BankTransferBlock referenceCode={teklif.reference_code} />
              <Link
                href={`/odeme?token=${token}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 py-3.5 text-sm font-bold text-zinc-950 transition-all hover:from-cyan-300 hover:to-violet-400"
              >
                Ödemeye Geç
                <XipIcon name="arrow-right" className="h-4 w-4" glow="strong" />
              </Link>
            </div>
          )}

          {teklif.status === "payment_reported" && (
            <p className="mt-6 flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-200">
              <XipIcon name="loader" className="h-4 w-4 shrink-0 animate-spin" glow="none" />
              Ödeme bildiriminiz alındı. Ekibimiz doğruladıktan sonra süreç otomatik ilerleyecek.
            </p>
          )}

          {teklif.status === "completed" && (
            <p className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <XipIcon name="check" className="h-4 w-4 shrink-0" glow="none" />
              Projeniz tamamlandı. Bizi tercih ettiğiniz için teşekkürler!
            </p>
          )}
        </div>

        {/* Teklif özeti */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <TitleText tag="h2" variant="content" className="text-white">
              Teklif Özeti
            </TitleText>
            <span className="text-base font-bold text-white">
              {formatTry(teklif.price ?? undefined)}
            </span>
          </div>
          <TeklifItemsTable items={teklif.items} />
        </section>

        {/* Aşama geçmişi */}
        {events.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <TitleText tag="h2" variant="content" className="mb-4 text-white">
              Süreç Geçmişi
            </TitleText>
            <ol className="space-y-3">
              {events.map((event, index) => (
                <li key={`${event.status}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <XipIcon name="check" className="h-3.5 w-3.5 text-emerald-400" />
                    {TEKLIF_STATUS_META[event.status]?.label ?? event.status}
                  </span>
                  <time className="text-xs text-zinc-500">
                    {new Date(event.created_at).toLocaleString("tr-TR")}
                  </time>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="text-center">
          <Link href="/contact-us" className="text-sm text-zinc-500 transition-colors hover:text-white">
            Sorunuz mu var? Bizimle iletişime geçin.
          </Link>
        </div>
      </div>
    </Screen>
  );
}

function StageTimeline({ current }: { current: number }) {
  return (
    <ol className="space-y-1">
      {TEKLIF_STAGES.map((stage, index) => {
        const state = index < current ? "done" : index === current ? "current" : "todo";
        return (
          <li key={stage.status} className="flex gap-4">
            {/* İşaretçi + bağlantı çizgisi */}
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                  state === "done"
                    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                    : state === "current"
                      ? "border-violet-500/60 bg-violet-500/20 text-violet-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-600"
                }`}
              >
                {state === "done" ? (
                  <XipIcon name="check" className="h-4 w-4" glow="none" />
                ) : state === "current" ? (
                  <motion.span
                    className="h-2 w-2 rounded-full bg-violet-300"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                ) : (
                  <XipIcon name="clock" className="h-4 w-4" glow="none" />
                )}
              </span>
              {index < TEKLIF_STAGES.length - 1 && (
                <span
                  className={`my-1 w-px flex-1 ${index < current ? "bg-emerald-500/40" : "bg-zinc-800"}`}
                />
              )}
            </div>

            <div className="pb-5">
              <p
                className={`text-sm font-semibold ${
                  state === "todo" ? "text-zinc-500" : "text-white"
                }`}
              >
                {stage.label}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">{stage.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-obsidian px-4 py-16">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>
      <div className="relative z-10 flex w-full flex-col items-center">{children}</div>
    </main>
  );
}
