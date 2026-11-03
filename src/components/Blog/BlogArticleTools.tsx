"use client";

import { useState, type ReactNode } from "react";
import { Link2, Printer, MessageCircle } from "lucide-react";

type BlogArticleToolsProps = {
  title: string;
  url: string;
  children: ReactNode;
};

const toolButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 xl:h-10 xl:w-10";

export default function BlogArticleTools({
  title,
  url,
  children,
}: BlogArticleToolsProps) {
  const [fontScale, setFontScale] = useState(100);
  const [copyStatus, setCopyStatus] = useState("");
  const shareText = encodeURIComponent(`${title} ${url}`);
  const encodedUrl = encodeURIComponent(url);

  async function copyLink() {
    if (!navigator.clipboard?.writeText) {
      setCopyStatus("Bağlantı kopyalama bu tarayıcıda desteklenmiyor.");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("Bağlantı kopyalandı.");
    } catch (error) {
      console.error("Blog bağlantısı panoya kopyalanamadı.", error);
      setCopyStatus("Bağlantı kopyalanamadı. Tarayıcı iznini kontrol edin.");
    }
  }

  function printArticle() {
    document.body.classList.add("blog-print-mode");
    window.addEventListener(
      "afterprint",
      () => document.body.classList.remove("blog-print-mode"),
      { once: true }
    );
    window.print();
  }

  return (
    <div className="blog-article-tools">
      <aside
        aria-label="Yazı araçları ve paylaşım"
        className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-white/15 bg-zinc-950/75 p-1.5 shadow-xl shadow-black/30 backdrop-blur-xl xl:bottom-auto xl:left-6 xl:top-1/2 xl:-translate-y-1/2 xl:translate-x-0 xl:flex-col"
      >
        <button
          type="button"
          aria-label="Yazı boyutunu artır"
          title="Yazı boyutunu artır"
          disabled={fontScale >= 140}
          onClick={() => setFontScale((size) => Math.min(140, size + 10))}
          className={`${toolButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <span className="text-sm font-semibold">A+</span>
        </button>
        <button
          type="button"
          aria-label="Yazı boyutunu azalt"
          title="Yazı boyutunu azalt"
          disabled={fontScale <= 80}
          onClick={() => setFontScale((size) => Math.max(80, size - 10))}
          className={`${toolButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <span className="text-sm font-semibold">A−</span>
        </button>
        <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-white/10 xl:my-1 xl:mx-0 xl:h-px xl:w-7" />
        <button
          type="button"
          aria-label="Yazı bağlantısını kopyala"
          title="Bağlantıyı kopyala"
          onClick={copyLink}
          className={toolButtonClass}
        >
          <Link2 size={19} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="PDF oluştur veya yazdır"
          title="PDF oluştur veya yazdır"
          onClick={printArticle}
          className={toolButtonClass}
        >
          <Printer size={19} aria-hidden="true" />
        </button>
        <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-white/10 xl:my-1 xl:mx-0 xl:h-px xl:w-7" />
        <a
          href={`https://wa.me/?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp'ta paylaş"
          title="WhatsApp'ta paylaş"
          className={toolButtonClass}
        >
          <MessageCircle size={19} aria-hidden="true" />
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook'ta paylaş"
          title="Facebook'ta paylaş"
          className={`${toolButtonClass} text-lg font-semibold`}
        >
          f
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn'de paylaş"
          title="LinkedIn'de paylaş"
          className={`${toolButtonClass} text-xs font-bold`}
        >
          in
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="X'te paylaş"
          title="X'te paylaş"
          className={`${toolButtonClass} text-lg`}
        >
          𝕏
        </a>
        {copyStatus && (
          <span
            className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-zinc-950/90 px-3 py-2 text-xs text-zinc-200 shadow-lg"
            role="status"
            aria-live="polite"
          >
            {copyStatus}
          </span>
        )}
      </aside>
      <div
        className="blog-article-print-area"
        style={{ fontSize: `${fontScale}%` }}
      >
        {children}
      </div>
    </div>
  );
}
