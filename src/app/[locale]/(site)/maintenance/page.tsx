"use client";

import { useEffect, useState } from "react";
import { Wrench, Clock, ArrowRight, RefreshCw } from "lucide-react";
import Image from "next/image";
import TitleText from "@/components/Common/TitleText/TitleText";

// Animated countdown — bakımın ne zaman bitecegini göster (env'den ya da default 2 saat)
function useCountdown(targetMs: number) {
  const [diff, setDiff] = useState(Math.max(0, targetMs - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setDiff((d) => Math.max(0, d - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { h, m, s, done: diff === 0 };
}

// Parse edilebilir varsa env'den al, yoksa simdiden 2 saat
const TARgET_ENV = process.env.NEXT_PUBLIC_MAINTENANCE_UNTIL;
const TARgET_TIME = TARgET_ENV ? new Date(TARgET_ENV).getTime() : Date.now() + 2 * 60 * 60 * 1000;

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-900/80 border border-white/[0.06] flex items-center justify-center shadow-inner shadow-black/40">
        <span className="text-2xl sm:text-3xl font-bold tabular-nums text-white">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">{label}</span>
    </div>
  );
}

export default function MaintenancePage() {
  const { h, m, s, done } = useCountdown(TARgET_TIME);

  return (
    <div className="relative min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 overflow-hidden">

      {/* ── Arka plan glow'ları (projeyle aynı) ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Sol üst — rose */}
        <div className="absolute -top-[10%] -left-[5%] w-[55vw] h-[55vh] rounded-full"
          style={{ background: "radial-gradient(ellipse 70% 70% at 20% 20%, rgba(251,113,133,0.18) 0%, rgba(249,115,22,0.10) 40%, transparent 70%)", filter: "blur(60px)" }} />
        {/* Orta — amber */}
        <div className="absolute top-[15%] left-[25%] w-[50vw] h-[60vh]"
          style={{ background: "radial-gradient(ellipse 60% 60% at 50% 40%, rgba(249,115,22,0.12) 0%, rgba(251,191,36,0.07) 45%, transparent 70%)", filter: "blur(80px)" }} />
        {/* Sag — mor */}
        <div className="absolute top-0 right-0 h-full w-[60vw]"
          style={{ background: "radial-gradient(ellipse 70% 90% at 100% 20%, rgba(139,92,246,0.28) 0%, rgba(139,92,246,0.12) 45%, transparent 75%)", filter: "blur(60px)" }} />
        {/* Sol alt */}
        <div className="absolute bottom-0 left-0 h-[70vh] w-[60vw]"
          style={{ background: "radial-gradient(ellipse 80% 70% at 0% 100%, rgba(139,92,246,0.22) 0%, transparent 65%)", filter: "blur(60px)" }} />
      </div>

      {/* Noise overlay */}
      <div className="noise-overlay" aria-hidden />

      {/* ── Içerik ── */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center gap-8">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-2">
          <Image
            src="/media/logo.webp"
            alt="XipSoft"
            width={36}
            height={36}
            className="rounded-lg"
            priority
          />
          <span className="text-lg font-semibold text-zinc-300 tracking-tight">XipSoft</span>
        </div>

        {/* Ikon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600/20 to-pink-600/20 border border-white/[0.07] flex items-center justify-center shadow-2xl shadow-violet-500/10">
            <Wrench className="w-10 h-10 text-violet-400 animate-[wiggle_2s_ease-in-out_infinite]" />
          </div>
          {/* glow halkası */}
          <div className="absolute inset-0 rounded-3xl blur-xl bg-gradient-to-br from-violet-600/20 to-pink-600/20 -z-10" />
        </div>

        {/* Baslık */}
        <div className="space-y-3">
          <TitleText tag="h1" variant="hero" className="leading-tight">
            Bakım Modundayız
          </TitleText>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
            Daha iyi bir deneyim sunmak için sistemimizi güncelliyoruz.
            Kısa süre içinde geri dönecegiz.
          </p>
        </div>

        {/* Countdown */}
        <div className="flex items-end gap-3">
          <TimeBlock value={h} label="saat" />
          <span className="text-zinc-600 text-2xl font-bold pb-7">:</span>
          <TimeBlock value={m} label="dakika" />
          <span className="text-zinc-600 text-2xl font-bold pb-7">:</span>
          <TimeBlock value={s} label="saniye" />
        </div>

        {/* Durum çubugu */}
        <div className="w-full bg-zinc-900/60 rounded-2xl border border-white/[0.05] p-4 space-y-3">
          <StatusRow icon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60" />} label="Altyapı" value="Çevrimiçi" ok />
          <StatusRow icon={<span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}          label="güncelleme" value="Devam ediyor" />
          <StatusRow icon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60" />} label="Veritabanı" value="Hazır" ok />
        </div>

        {/* Yenile butonu */}
        <button
          onClick={() => window.location.reload()}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.07] text-zinc-400 hover:text-white text-sm font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          Sayfayı Yenile
        </button>

        {/* Iletisim */}
        <p className="text-zinc-600 text-xs">
          Acil bir durum için{" "}
          <a
            href="mailto:info@xipsoft.net"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
          >
            info@xipsoft.net
          </a>{" "}
          adresinden ulasabilirsiniz.
        </p>
      </div>

      {/* Wiggle animasyonu */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
      `}</style>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  value,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <span className={`text-xs font-medium ${ok ? "text-emerald-400" : "text-amber-400"}`}>
        {value}
      </span>
    </div>
  );
}
