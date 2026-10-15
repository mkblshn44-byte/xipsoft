"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, ArrowLeft, Share2 } from "lucide-react";
import MseLink from "@/components/Ui/MseLink/MseLink";
import type { BlogActionsProps, BlogShareButtonsProps } from "./types";

/* ── Social Media Icons ── */
const IconWhatsApp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
  </svg>
);

const IconFacebook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const IconLinkedIn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const IconTwitter = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const IconReddit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12zm6.5 8.5a1.5 1.5 0 0 1-1.5 1.5 1.5 1.5 0 0 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5zm-1.25 2.75h-10.5a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5zm-8.5 1.5a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5zm9.25-4.25a8.25 8.25 0 0 1-16.5 0c0-.5.04-.99-.12-1.47-.22l1.28-1.28c.2.2.31.47.31.73 0 .27-.2.48-.47.48-.73L7.53 5.03c-.48-.1-.97-.18-1.47-.18a8.25 8.25 0 0 0-8.25 8.25c0 .5.04.99.12 1.47.22l-1.28 1.28c-.2-.2-.31-.47-.31-.73 0-.27.2-.48.47-.48l1.28 1.28c.1.48.18.97.18 1.47.18a8.25 8.25 0 0 0 8.25-8.25c0-.5-.04-.99-.12-1.47-.22l-1.28 1.28c-.2-.2-.31-.47-.31-.73 0-.27.2-.48.47-.48l1.28 1.28c.1.48.18.97.18 1.47.18z" />
  </svg>
);

const IconCopy = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v5h-10z" />
  </svg>
);

/* ── Transparent Share Button ── */
const ShareButton = ({
  onClick,
  tooltip,
  children,
  hoverColor,
}: {
  onClick: () => void;
  tooltip: string;
  children: React.ReactNode;
  hoverColor?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    onClick();
    if (tooltip.includes("Kopyala")) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative flex items-center justify-center group">
      <button
        type="button"
        onClick={handleClick}
        aria-label={tooltip}
        className="relative w-10 h-10 flex items-center justify-center rounded-full cursor-pointer transition-all duration-300 text-zinc-300 hover:text-white"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.08) 100%)",
          backdropFilter: "blur(18px) saturate(1.6)",
          WebkitBackdropFilter: "blur(18px) saturate(1.6)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
        onMouseEnter={e => {
          if (hoverColor) (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 20px ${hoverColor}33, inset 0 1px 0 rgba(255,255,255,0.16)`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)";
        }}
      >
        {children}
      </button>
      <div className="absolute bottom-full mb-2.5 px-2.5 py-1 rounded-xl text-[11px] font-medium text-zinc-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 shadow-lg"
        style={{
          background: "rgba(20,20,28,0.88)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        {copied ? "✓ Kopyalandı!" : tooltip}
      </div>
    </div>
  );
};

/* ── Share Buttons ── */
export function BlogShareButtons({ title }: BlogShareButtonsProps) {
  const [shareUrl, setShareUrl] = useState("");
  const shareTitle = encodeURIComponent(title || "");

  useEffect(() => {
    setShareUrl(encodeURIComponent(window.location.href));
  }, []);

  const shareWhatsApp = useCallback(() => {
    window.open(`https://wa.me/?text=${shareTitle}%20${shareUrl}`, "_blank", "noopener,noreferrer");
  }, [shareUrl, shareTitle]);

  const shareFacebook = useCallback(() => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, "_blank", "noopener,noreferrer");
  }, [shareUrl]);

  const shareLinkedIn = useCallback(() => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, "_blank", "noopener,noreferrer");
  }, [shareUrl]);

  const shareTwitter = useCallback(() => {
    window.open(`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`, "_blank", "noopener,noreferrer");
  }, [shareUrl, shareTitle]);

  const shareReddit = useCallback(() => {
    window.open(`https://www.reddit.com/submit?url=${shareUrl}&title=${shareTitle}`, "_blank", "noopener,noreferrer");
  }, [shareUrl, shareTitle]);

  const copyLink = useCallback(() => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
    }
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ShareButton onClick={shareWhatsApp} tooltip="WhatsApp'ta Paylaş" hoverColor="#25D366">
        <IconWhatsApp />
      </ShareButton>
      <ShareButton onClick={shareFacebook} tooltip="Facebook'ta Paylaş" hoverColor="#1877F2">
        <IconFacebook />
      </ShareButton>
      <ShareButton onClick={shareLinkedIn} tooltip="LinkedIn'de Paylaş" hoverColor="#0A66C2">
        <IconLinkedIn />
      </ShareButton>
      <ShareButton onClick={shareTwitter} tooltip="X'te Paylaş" hoverColor="#ffffff">
        <IconTwitter />
      </ShareButton>
      <ShareButton onClick={shareReddit} tooltip="Reddit'te Paylaş" hoverColor="#FF4500">
        <IconReddit />
      </ShareButton>
      <ShareButton onClick={copyLink} tooltip="Bağlantıyı Kopyala" hoverColor="#ddd6fe">
        <IconCopy />
      </ShareButton>
    </div>
  );
}

/* ── Blog Actions (Share + Previous/Next Navigation) ── */
export function BlogActions({
  post,
  adjacent,
}: BlogActionsProps) {
  const basePath = "/blog";
  const backLabel = "Tüm Blog Yazılarına Dön";
  const shareLabel = "Bu yazıyı paylaşın:";
  const prevLabel = "Önceki Yazı";
  const nextLabel = "Sonraki Yazı";
  const navLabel = "Makale navigasyonu";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mt-10 space-y-8"
    >
      {/* Paylaş Satırı */}
      <div
        className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 60%, rgba(255,255,255,0.05) 100%)",
          backdropFilter: "blur(24px) saturate(1.5)",
          WebkitBackdropFilter: "blur(24px) saturate(1.5)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex items-center gap-2 text-zinc-200 font-medium text-sm">
          <Share2 className="w-4 h-4 text-neon-300" />
          <span>{shareLabel}</span>
        </div>
        <BlogShareButtons title={post.title} />
      </div>

      {/* Önceki ve Sonraki Yazı Kartları — Semantic HTML: nav elementi ile sarıldı */}
      {(adjacent?.prev || adjacent?.next) && (
        <nav aria-label={navLabel}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {adjacent.prev ? (
              <MseLink
                href={`${basePath}/${adjacent.prev.slug}`}
                rel="prev"
                className="group relative flex flex-col gap-2 p-5 rounded-2xl transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 60%, rgba(255,255,255,0.05) 100%)",
                  backdropFilter: "blur(20px) saturate(1.5)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
                  border: "1px solid rgba(167,139,250,0.18)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.09)",
                }}
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-neon-300 font-semibold">
                  <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                  {prevLabel}
                </span>
                <span className="text-sm sm:text-base font-semibold text-zinc-200 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                  {adjacent.prev.title}
                </span>
              </MseLink>
            ) : (
              <div className="hidden sm:block" />
            )}

            {adjacent.next ? (
              <MseLink
                href={`${basePath}/${adjacent.next.slug}`}
                rel="next"
                className="group relative flex flex-col gap-2 p-5 rounded-2xl transition-all duration-300 text-left sm:text-right"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 60%, rgba(255,255,255,0.05) 100%)",
                  backdropFilter: "blur(20px) saturate(1.5)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
                  border: "1px solid rgba(34,211,238,0.18)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.09)",
                }}
              >
                <span className="inline-flex items-center sm:justify-end gap-1.5 text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold">
                  {nextLabel}
                  <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
                <span className="text-sm sm:text-base font-semibold text-zinc-200 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                  {adjacent.next.title}
                </span>
              </MseLink>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>
        </nav>
      )}

      {/* Tüm Yazılara Dön Butonu */}
      <div className="pt-2 flex justify-center">
        <MseLink
          href={basePath}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider text-zinc-200 hover:text-white transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.08) 100%)",
            backdropFilter: "blur(18px) saturate(1.6)",
            WebkitBackdropFilter: "blur(18px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 2px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{backLabel}</span>
        </MseLink>
      </div>
    </motion.div>
  );
}
