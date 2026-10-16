/**
 * ContentFreshnessBadge - Displays content freshness indicators
 * 
 * This component shows "Updated: Month 2026" badges to signal content freshness
 * to both users and search engines, which is important for SEO.
 */

import { Calendar, Clock } from "lucide-react";

interface ContentFreshnessBadgeProps {
  updatedAt: Date | string;
  createdAt?: Date | string;
  showDate?: boolean;
  className?: string;
  variant?: "default" | "compact" | "minimal";
}

export function ContentFreshnessBadge({
  updatedAt,
  createdAt,
  showDate = true,
  className = "",
  variant = "default",
}: ContentFreshnessBadgeProps) {
  const updatedDate = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const createdDate = typeof createdAt === "string" ? new Date(createdAt) : createdAt;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
    });
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isRecentlyUpdated = () => {
    const now = new Date();
    const monthsSinceUpdate = (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsSinceUpdate <= 6; // Recently updated if within 6 months
  };

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-zinc-500 ${className}`}>
        <Clock className="w-3 h-3" />
        <span>Güncellendi: {formatDate(updatedDate)}</span>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <span className={`text-xs text-zinc-500 ${className}`}>
        Son güncelleme: {formatDate(updatedDate)}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          isRecentlyUpdated()
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
        }`}
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>Güncellendi: {formatDate(updatedDate)}</span>
      </div>
      {showDate && createdDate && (
        <span className="text-xs text-zinc-600">
          İlk yayın: {formatDate(createdDate)}
        </span>
      )}
    </div>
  );
}

/**
 * Get freshness status for SEO purposes
 * Returns information about how fresh the content is
 */
export function getContentFreshnessStatus(updatedAt: Date | string): {
  isFresh: boolean;
  status: "very-fresh" | "fresh" | "moderate" | "stale";
  monthsSinceUpdate: number;
  message: string;
} {
  const updatedDate = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const now = new Date();
  const monthsSinceUpdate = (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

  let status: "very-fresh" | "fresh" | "moderate" | "stale";
  let message: string;

  if (monthsSinceUpdate <= 1) {
    status = "very-fresh";
    message = "Son 1 ay içinde güncellendi";
  } else if (monthsSinceUpdate <= 3) {
    status = "fresh";
    message = "Son 3 ay içinde güncellendi";
  } else if (monthsSinceUpdate <= 6) {
    status = "moderate";
    message = "Son 6 ay içinde güncellendi";
  } else {
    status = "stale";
    message = "6 aydan daha önce güncellendi";
  }

  return {
    isFresh: monthsSinceUpdate <= 6,
    status,
    monthsSinceUpdate,
    message,
  };
}

/**
 * Auto-generate freshness badge text
 */
export function generateFreshnessBadgeText(updatedAt: Date | string): string {
  const status = getContentFreshnessStatus(updatedAt);
  return `Güncellendi: ${new Date(updatedAt).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
  })} (${status.message})`;
}