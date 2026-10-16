"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ServiceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Hizmet Sayfası Hatası]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-zinc-500 text-sm mb-2">Bir hata oluştu</p>
      <h1 className="text-2xl font-bold text-white mb-4">
        Sayfa yüklenemedi
      </h1>
      <p className="text-zinc-400 text-sm mb-8 max-w-md">
        Hizmet sayfası şu anda yüklenemiyor. Lütfen tekrar deneyin veya
        ana sayfaya dönün.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors border border-white/10"
        >
          Tekrar Dene
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
        >
          Ana Sayfa
        </Link>
      </div>
    </div>
  );
}
