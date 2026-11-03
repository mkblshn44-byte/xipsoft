"use client";

import { useEffect } from "react";
// `global-error.tsx` KÖK layout'u (src/app/layout.tsx) tamamen değiştirdiği için
// o layout'taki global CSS (ve dolayısıyla Tailwind) bu ağaca otomatik gelmez.
// Manifest kanıtı: .next/app-build-manifest.json → "/global-error" girdisinde
// hiçbir static/css kaydı yokken "/layout" girdisinde 3 CSS dosyası vardı.
// Import edilmezse hata ekranı stilsiz (düz metin) render edilir.
import "@/styles/globals.scss";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4 font-sans">
        <div className="max-w-md text-center">
          <p className="font-mono text-violet-400 text-sm font-bold uppercase tracking-wider mb-2">500 | Sistem Hatası</p>
          <h1 className="text-2xl font-bold mb-4 text-zinc-100">Beklenmeyen Bir Hata Oluştu</h1>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Sistemde geçici bir aksaklık yaşandı. Lütfen sayfayı yenilemeyi deneyin veya biraz sonra tekrar ziyaret edin.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Yeniden Dene
            </button>
            {/* Hard navigation bilinçli: global-error tüm Next ağacını değiştirdiği için Link ile gezinme güvenli değil */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors border border-white/10"
            >
              Ana Sayfa
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
