"use client";

/**
 * AdminCommentsClient.tsx — Blog yorum moderasyon kuyruğu.
 *
 * Akış: ziyaretçi yorumu `pending` olarak yazar → admin burada onaylar /
 * spam olarak işaretler / siler. Yalnızca `approved` durumundaki yorumlar
 * kamuya görünür.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  X,
  Trash2,
  RotateCcw,
  RefreshCw,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import {
  getAdminCommentsAction,
  moderateCommentAction,
  deleteCommentAction,
} from "@/app/_actions/blog-comment-actions";
import type { AdminCommentRow } from "@/app/_actions/blog-comment-actions";
import type { CommentStatus } from "@/lib/comment-policy";

type Filter = CommentStatus | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "Bekleyen" },
  { key: "approved", label: "Yayında" },
  { key: "spam", label: "Spam" },
  { key: "rejected", label: "Reddedilen" },
  { key: "all", label: "Tümü" },
];

const STATUS_STYLES: Record<CommentStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  spam: "bg-red-50 text-red-700",
  rejected: "bg-zinc-100 text-zinc-600",
};

const STATUS_LABELS: Record<CommentStatus, string> = {
  pending: "Bekliyor",
  approved: "Yayında",
  spam: "Spam",
  rejected: "Reddedildi",
};

export default function AdminCommentsClient() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [comments, setComments] = useState<AdminCommentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getAdminCommentsAction(filter, 100, 0);
    if (res.ok) {
      setComments(res.comments);
      setTotal(res.total);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function moderate(id: number, status: CommentStatus) {
    setBusyId(id);
    const res = await moderateCommentAction(id, status);
    if (res.ok) await load();
    setBusyId(null);
  }

  async function remove(id: number) {
    if (!confirm("Yorum kalıcı olarak silinsin mi?")) return;
    setBusyId(id);
    const res = await deleteCommentAction(id);
    if (res.ok) await load();
    setBusyId(null);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-gray-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Yorum Yönetimi</h1>
            <p className="text-xs text-gray-500">
              Onaylanan yorumlar blog yazılarında yayımlanır
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Yorumları yenile"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              filter === f.key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {comments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 py-12 text-center text-sm text-gray-400">
          {loading ? "Yükleniyor..." : "Bu filtrede yorum yok."}
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {c.authorName}
                    </span>
                    {!c.isGuest && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700">
                        üye
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_STYLES[c.status]}`}
                    >
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span className="truncate">/{c.postSlug}</span>
                    <span className="text-gray-300">·</span>
                    <time dateTime={c.createdAt}>
                      {new Date(c.createdAt).toLocaleString("tr-TR")}
                    </time>
                    {c.email && (
                      <>
                        <span className="text-gray-300">·</span>
                        <a
                          href={`mailto:${c.email}`}
                          className="text-gray-500 hover:text-gray-900 underline underline-offset-2"
                        >
                          {c.email}
                        </a>
                      </>
                    )}
                  </p>
                </div>

                {c.postSlug && (
                  <a
                    href={`/blog/${c.postSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-gray-400 hover:text-gray-900"
                    aria-label="Yazıyı yeni sekmede aç"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* ⚠ DÜZ METİN render — admin paneli de HTML'e izin vermez. */}
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words border-l-2 border-gray-100 pl-3 mb-3">
                {c.body}
              </p>

              <div className="flex items-center justify-end gap-1.5">
                {c.status !== "approved" && (
                  <button
                    onClick={() => moderate(c.id, "approved")}
                    disabled={busyId === c.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" /> Onayla
                  </button>
                )}
                {c.status !== "spam" && (
                  <button
                    onClick={() => moderate(c.id, "spam")}
                    disabled={busyId === c.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-40"
                  >
                    <X className="w-3.5 h-3.5" /> Spam
                  </button>
                )}
                {c.status !== "pending" && (
                  <button
                    onClick={() => moderate(c.id, "pending")}
                    disabled={busyId === c.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Bekleme al
                  </button>
                )}
                <button
                  onClick={() => remove(c.id)}
                  disabled={busyId === c.id}
                  aria-label="Yorumu sil"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-gray-400 text-center">
        Toplam {total} yorum
      </p>
    </div>
  );
}