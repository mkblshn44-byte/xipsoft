"use client";

/**
 * CommentSection.tsx — Blog yazısı yorum listesi + sağdan kayan yorum drawer'ı.
 *
 * ⚠ GÜVENLİK (dışarıdan saldırıya karşı):
 *   * Yorum gövdesi `dangerouslySetInnerHTML` İLE ASLA render edilmez.
 *     React text node (`{comment.body}`) kullanılır — React varsayılan olarak
 *     escape eder, dolayısıyla hiçbir HTML yorumu çalıştırılamaz.
 *   * Sunucu tarafı zaten gövdeyi düz metne indirger ve uzunluk/bağlantı
 *     sınırı uygular (`@/lib/comment-policy`). Buradaki `maxLength` yalnızca
 *     UX ipucudur, güvenlik sınırı DEĞİLDİR.
 *   * Form gönderimi server action'a gider; rate-limit, honeypot ve KVKK
 *     onayı orada zorunlu kılınır.
 *   * Yorumlar 'pending' durumuna yazılır; kullanıcı "onaylandı" mesajı görür,
 *     yorum listeye DÜŞMEZ (admin onaylayana kadar).
 */

import { useEffect, useState, useTransition } from "react";
import XipIcon from "@/components/Ui/Icon";
import { cn } from "@/utils";
import {
  getCommentsAction,
  submitCommentAction,
} from "@/app/_actions/blog-comment-actions";
import { COMMENT_LIMITS } from "@/lib/comment-policy";
import type { CommentPage, PublicComment } from "@/lib/comment-policy";

const EMPTY_PAGE: CommentPage = { comments: [], total: 0, hasMore: false, nextOffset: 0 };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");
}

export default function CommentSection({
  postId,
  initial,
  currentUser,
}: {
  postId: number;
  initial: CommentPage;
  currentUser: { name: string; email: string; isAuthenticated: boolean };
}) {
  const [page, setPage] = useState<CommentPage>(initial ?? EMPTY_PAGE);
  const [replyTo, setReplyTo] = useState<PublicComment | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Form state
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [body, setBody] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const bodyLen = body.length;
  const bodyOver = bodyLen > COMMENT_LIMITS.body.max;
  const bodyTooShort = bodyLen > 0 && bodyLen < COMMENT_LIMITS.body.min;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    setError(null);
    setFieldError(null);

    startTransition(async () => {
      const res = await submitCommentAction({
        postId,
        parentId: replyTo?.id ?? null,
        name,
        email,
        body,
        kvkkConsent: consent,
        website,
      });

      if (res.ok) {
        setSuccess(true);
        setBody("");
        setConsent(false);
        setWebsite("");
        setReplyTo(null);
        setDrawerOpen(false);
        return;
      }
      setError(res.message);
      if (res.field) setFieldError(res.field);
    });
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = await getCommentsAction(postId, page.nextOffset / COMMENT_LIMITS.pageSize);
      setPage((prev) => ({
        comments: [...prev.comments, ...next.comments],
        total: next.total,
        hasMore: next.hasMore,
        nextOffset: next.nextOffset,
      }));
    } finally {
      setLoadingMore(false);
    }
  }

  const topLevel = page.comments.filter((c) => c.parentId == null);
  const repliesByParent = new Map<number, PublicComment[]>();
  for (const c of page.comments) {
    if (c.parentId != null) {
      const list = repliesByParent.get(c.parentId) ?? [];
      list.push(c);
      repliesByParent.set(c.parentId, list);
    }
  }

  return (
    <section aria-labelledby="comments-heading">
      <div className="flex items-center gap-2 mb-2">
        <span className="h-px w-10 bg-gradient-to-r from-cyan-400 to-transparent" />
        <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-cyan-400">
          Tartışma
        </span>
      </div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <h2 id="comments-heading" className="text-xl md:text-2xl font-bold text-zinc-100 brand-gradient-text">
          Yorumlar
          {page.total > 0 && (
            <span className="ml-3 text-base font-normal text-zinc-500 tabular-nums">
              ({page.total})
            </span>
          )}
        </h2>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition-all shadow-lg shadow-violet-500/10"
        >
          <XipIcon name="message-square" className="w-4 h-4" glow="strong" />
          Yorum Yaz
        </button>
      </div>

      {/* ── Drawer ───────────────────────────────────────────────────────── */}
      <CommentDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setReplyTo(null);
        }}
        replyTo={replyTo}
        onSubmit={handleSubmit}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        body={body}
        setBody={setBody}
        consent={consent}
        setConsent={setConsent}
        website={website}
        setWebsite={setWebsite}
        error={error}
        fieldError={fieldError}
        success={success}
        bodyLen={bodyLen}
        bodyOver={bodyOver}
        bodyTooShort={bodyTooShort}
        isPending={isPending}
      />

      {/* ── Liste ────────────────────────────────────────────────────────── */}

        {/* ── Liste ──────────────────────────────────────────────────────────── */}
      {topLevel.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500 text-center py-8">
          Henüz yorum yok. İlk yorumu siz yazın.
        </p>
      ) : (
        <ul className="mt-8 space-y-5">
          {topLevel.map((c) => (
            <li key={c.id}>
              <CommentItem
                comment={c}
                onReply={() => {
                  setReplyTo(c);
                  setDrawerOpen(true);
                }}
              />
              {(repliesByParent.get(c.id) ?? []).length > 0 && (
                <ul className="mt-3 ml-6 sm:ml-10 space-y-3 border-l border-white/[0.08] pl-4">
                  {(repliesByParent.get(c.id) ?? []).map((r) => (
                    <li key={r.id}>
                      <CommentItem comment={r} compact />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {page.hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs text-zinc-300 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all disabled:opacity-40"
          >
            {loadingMore ? (
              <span className="w-3.5 h-3.5 border border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
            ) : (
              <XipIcon name="message-square" className="w-3.5 h-3.5" />
            )}
            Daha fazla yorum
          </button>
        </div>
      )}
    </section>
  );
}

// ── Sağdan kayan yorum drawer'ı ──────────────────────────────────────────────

function CommentDrawer({
  open,
  onClose,
  replyTo,
  onSubmit,
  name,
  setName,
  email,
  setEmail,
  body,
  setBody,
  consent,
  setConsent,
  website,
  setWebsite,
  error,
  fieldError,
  success,
  bodyLen,
  bodyOver,
  bodyTooShort,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  replyTo: PublicComment | null;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  consent: boolean;
  setConsent: (v: boolean) => void;
  website: string;
  setWebsite: (v: string) => void;
  error: string | null;
  fieldError: string | null;
  success: boolean;
  bodyLen: number;
  bodyOver: boolean;
  bodyTooShort: boolean;
  isPending: boolean;
}) {
  // ESC ile kapat + body scroll kilidi
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      {/* Karartma katmanı */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Panel — sağdan kayarak gelir */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="comment-drawer-title"
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full sm:max-w-md flex flex-col",
          "bg-space-900/95 backdrop-blur-xl border-l border-white/[0.08] shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3
            id="comment-drawer-title"
            className="text-sm font-semibold text-white flex items-center gap-2"
          >
            {replyTo ? "Yanıt Yaz" : "Yorum Yaz"}
            {replyTo && (
              <button
                type="button"
                onClick={() => {
                  /* parent state'ini sıfırlamak için onClose çağırılır */
                  onClose();
                }}
                className="ml-1 text-[10px] font-normal text-zinc-500 hover:text-white underline underline-offset-2"
              >
                vazgeç
              </button>
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <XipIcon name="x" className="w-4 h-4" />
          </button>
        </div>

        {/* Yanıt edilen yorum önizlemesi */}
        {replyTo && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 mb-1.5">
              Yanıt veriliyor
            </p>
            <p className="text-xs text-zinc-400 line-clamp-3">
              <span className="text-zinc-300 font-medium">{replyTo.authorName}:</span>{" "}
              {replyTo.body}
            </p>
          </div>
        )}

        {/* Form — kaydırılabilir gövde */}
        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        >
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label htmlFor="comment-name" className="block text-[11px] text-zinc-400 mb-1.5">
                Ad Soyad <span className="text-red-400">*</span>
              </label>
              <input
                id="comment-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adınız Soyadınız"
                maxLength={COMMENT_LIMITS.name.max}
                autoComplete="name"
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl text-sm bg-black/40 border text-white placeholder-zinc-600",
                  "focus:outline-none focus:border-cyan-400/50 transition-colors",
                  fieldError === "name" ? "border-red-500/60" : "border-white/10"
                )}
              />
            </div>
            <div>
              <label htmlFor="comment-email" className="block text-[11px] text-zinc-400 mb-1.5">
                E-Posta <span className="text-zinc-600">(yayımlanmaz)</span>
              </label>
              <input
                id="comment-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@mail.com"
                maxLength={COMMENT_LIMITS.email.max}
                autoComplete="email"
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl text-sm bg-black/40 border text-white placeholder-zinc-600",
                  "focus:outline-none focus:border-cyan-400/50 transition-colors",
                  fieldError === "email" ? "border-red-500/60" : "border-white/10"
                )}
              />
            </div>
          </div>

          <div>
            <label htmlFor="comment-body" className="block text-[11px] text-zinc-400 mb-1.5">
              Değerlendirmenizi yazın <span className="text-red-400">*</span>
            </label>
            <textarea
              id="comment-body"
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Deneyiminizi paylaşın…"
              maxLength={COMMENT_LIMITS.body.max}
              aria-describedby="comment-body-help"
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl text-sm bg-black/40 border text-white placeholder-zinc-600 resize-y min-h-[120px]",
                "focus:outline-none focus:border-cyan-400/50 transition-colors",
                fieldError === "body" || bodyOver
                  ? "border-red-500/60"
                  : "border-white/10"
              )}
            />
            <p
              id="comment-body-help"
              className={cn(
                "mt-1 text-[10px] font-mono tabular-nums",
                bodyOver ? "text-red-400 font-semibold" : "text-zinc-600"
              )}
            >
              {bodyLen}/{COMMENT_LIMITS.body.max}
              {bodyTooShort && !bodyOver && (
                <span className="ml-2 text-zinc-500">
                  (en az {COMMENT_LIMITS.body.min} karakter)
                </span>
              )}
            </p>
          </div>

          {/* Honeypot — ekranda görünmez, otomatik doldurucular için tuzak.
              `inert`: kapsayıcı aria-hidden iken içindeki input'un klavye/AT
              odağına girmesini engeller (Lighthouse: aria-hidden-focus). */}
          <div className="absolute -left-[9999px]" aria-hidden="true" inert>
            <label htmlFor="comment-website">Web siteniz</label>
            <input
              id="comment-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <label className="flex items-start gap-2 text-[11px] text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-0.5 w-3.5 h-3.5 accent-cyan-500 shrink-0"
            />
            <span>
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-zinc-200"
              >
                KVKK
              </a>{" "}
              aydınlatma metnini okudum ve verilerimin işlenmesine onay veriyorum.
            </span>
          </label>

          {error && (
            <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
              <XipIcon name="shield-check" className="w-3.5 h-3.5 mt-0.5 shrink-0" glow="none" />
              <span>
                Yorumunuz alındı. Onaylandıktan sonra yayımlanacaktır.
              </span>
            </p>
          )}
        </form>

        {/* Alt bar — sabit */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-white/[0.06] bg-space-900/80">
          <p className="text-[10px] text-zinc-600">
            Yorumunuz onaylandıktan sonra yayımlanır.
          </p>
          <button
            type="submit"
            form="comment-form"
            disabled={isPending || bodyOver || bodyTooShort || !consent}
            className={cn(
              "shrink-0 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl",
              "text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-cyan-600",
              "hover:from-violet-500 hover:to-cyan-500 transition-all shadow-lg shadow-violet-500/10",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {isPending ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
      </div>
    </>
  );
}

function CommentItem({
  comment,
  onReply,
  compact = false,
}: {
  comment: PublicComment;
  onReply?: () => void;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border border-white/[0.06] bg-white/[0.015] p-4",
        compact && "bg-transparent border-transparent p-0"
      )}
    >
      <header className="flex items-center gap-3 mb-2.5">
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-mono font-bold text-white bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 shrink-0",
            compact ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-[11px]"
          )}
          aria-hidden="true"
        >
          {initials(comment.authorName)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-200 truncate">
            {comment.authorName}
            {!comment.isGuest && (
              <span className="ml-2 text-[10px] font-normal text-cyan-400">üye</span>
            )}
          </p>
          <p className="text-[10px] text-zinc-600">
            <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
          </p>
        </div>
      </header>

      {/* ⚠ DÜZ METİN — HTML render YOK. React varsayılan escape uygular. */}
      <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap break-words">
        {comment.body}
      </p>

      {onReply && !compact && (
        <button
          type="button"
          onClick={onReply}
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors"
        >
          <XipIcon name="corner-down-right" className="w-3 h-3" />
          Yanıtla
        </button>
      )}
    </article>
  );
}