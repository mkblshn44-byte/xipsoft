"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Paylaşılan yol (route) hata sınırı — segment/alt sayfalara eklenen
 * error.tsx dosyaları bu bileşeni kullanır.
 *
 * Kullanıcı dostu, markaya uygun bir fallback arayüzü sunar; beklenmedik
 * sunucu hatalarında kullanıcıyı ana sayfaya yönlendirir veya yeniden
 * deneme şansı tanır. Hata ayrıntısı yalnızca konsola düşer (isteme asla
 * sızmaz); Next.js üretimde <500> kimliğini digest olarak iletir.
 */
export default function RouteError({
  error,
  reset,
  title = "Sayfa yüklenemedi",
  description = "Şu anda beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin ya da ana sayfaya dönün.",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    console.error("[RouteError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-violet-500 text-xl font-bold mb-2">Hata</p>
      <h1 className="text-2xl font-bold text-white mb-4">{title}</h1>
      <p className="text-zinc-400 text-sm mb-8 max-w-md">{description}</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors border border-white/10"
        >
          Tekrar Dene
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-space-950 text-sm font-medium transition-colors"
        >
          Ana Sayfa
        </Link>
      </div>
    </div>
  );
}