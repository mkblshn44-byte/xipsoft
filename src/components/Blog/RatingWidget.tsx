"use client";

/**
 * RatingWidget.tsx — "Bu Yazıya Puan Ver!" + yıldız gösterimi.
 *
 * Erişilebilirlik: yıldızlar `<button>` (klavye ile seçilebilir), her biri
 * `aria-label` taşır, grup `radiogroup` semantiğiyle işaretlidir. Seçilen
 * puan `aria-live` ile duyurulur.
 */

import { useState, useTransition } from "react";
import XipIcon from "@/components/Ui/Icon";
import { cn } from "@/utils";
import { submitRatingAction } from "@/app/_actions/blog-comment-actions";
import type { RatingSummary } from "@/lib/comment-policy";

const STAR_LABELS: Record<number, string> = {
  1: "Çok kötü",
  2: "Kötü",
  3: "Orta",
  4: "İyi",
  5: "Mükemmel",
};

export default function RatingWidget({
  postId,
  initial,
}: {
  postId: number;
  initial: RatingSummary;
}) {
  const [summary, setSummary] = useState<RatingSummary>(initial);
  const [hover, setHover] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const active = hover ?? summary.userRating ?? 0;
  const hasVoted = summary.userRating != null;

  function handleRate(value: number) {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await submitRatingAction(postId, value);
      if (res.ok) {
        setSummary(res.summary);
      } else {
        setError(res.message);
      }
    });
  }

  const countLabel =
    summary.count === 0
      ? "Henüz puan verilmemiş"
      : `${summary.count} kişi puan verdi`;

  return (
    <section
      aria-labelledby="rating-heading"
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <h3
            id="rating-heading"
            className="text-base sm:text-lg font-semibold text-white"
          >
            Bu Yazıya Puan Ver!
          </h3>
          <p
            className="mt-1 text-xs text-zinc-400"
            aria-live="polite"
          >
            {summary.count > 0 && (
              <>
                Ortalama{" "}
                <span className="font-semibold text-amber-300">
                  {summary.rounded.toLocaleString("tr-TR")}
                </span>{" "}
                / 5 ·{" "}
              </>
            )}
            {countLabel}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Puan verme — yalnızca henüz oy vermemişken */}
          <div
            role="radiogroup"
            aria-label="Puanınızı seçin (1 – 5 yıldız)"
            className="flex items-center gap-1"
            onMouseLeave={() => setHover(null)}
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = n <= active;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={summary.userRating === n}
                  aria-label={`${n} yıldız — ${STAR_LABELS[n]}`}
                  disabled={isPending || hasVoted}
                  onClick={() => handleRate(n)}
                  onMouseEnter={() => setHover(n)}
                  onFocus={() => setHover(n)}
                  onBlur={() => setHover(null)}
                  className={cn(
                    "p-1 rounded-md transition-all duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60",
                    hasVoted
                      ? "cursor-default"
                      : "hover:scale-110 active:scale-95 cursor-pointer"
                  )}
                >
                  <XipIcon
                    name="star"
                    className={cn(
                      "w-7 h-7 transition-colors duration-200",
                      filled
                        ? "text-amber-400"
                        : "text-zinc-700",
                      !hasVoted && !isPending && "hover:text-amber-500"
                    )}
                    fill={filled ? "currentColor" : "none"}
                    strokeWidth={1.5}
                    glow="none"
                  />
                </button>
              );
            })}
          </div>

          {/* Ortalama rozet — yalnızca okuma */}
          {summary.count > 0 && (
            <div
              className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3.5 py-1.5"
              aria-hidden="true"
            >
              <XipIcon
                name="star"
                className="w-4 h-4 text-amber-400"
                fill="currentColor"
                strokeWidth={1.5}
                glow="none"
              />
              <span className="text-sm font-semibold tabular-nums text-amber-200">
                {summary.rounded.toLocaleString("tr-TR")}
              </span>
            </div>
          )}
        </div>
      </div>

      {hasVoted && !error && (
        <p className="mt-4 text-xs text-emerald-400" aria-live="polite">
          Teşekkürler! {summary.userRating} yıldız verdiniz.
        </p>
      )}
      {error && (
        <p className="mt-4 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}