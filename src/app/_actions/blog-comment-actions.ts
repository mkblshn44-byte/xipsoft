"use server";

/**
 * blog-comment-actions.ts — Blog yorumları + yıldız puanlaması.
 *
 * GÜVENLİK SÖZLEŞMESİ:
 *   1. Yorum gövdesi ASLA HTML'e dönüştürülmez. Render tarafı React text
 *      node kullanır; `dangerouslySetInnerHTML` bu yolda YOKTUR.
 *   2. Tüm sayısal sınırlar `@/lib/comment-policy`'den gelir; bu dosya
 *      kendi limit tanımlamaz.
 *   3. Ham IP hiçbir yerde saklanmaz/ döndürülmez; yalnızca `hashIp()` çıktısı
 *      rate-limit ve spam sinyali için kullanılır.
 *   4. Yazma işlemleri her zaman rate-limit'e takılır (Redis yoksa fail-open).
 *   5. `email` yalnızca moderasyon içindir; `toPublicComment` bunu asla
 *      dışarı vermez.
 */

import { headers } from "next/headers";
import pool from "@/lib/db/pool";
import { getServerActionContext, requireAdminAction } from "@/lib/api-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { cacheDel, cacheKeys, cacheSet } from "@/lib/redis/client";
import { invalidateBlogCaches } from "@/lib/blog-cache";
import {
  COMMENT_LIMITS,
  toDisplayName,
  validateCommentBody,
  validateCommentEmail,
  validateCommentName,
  validateKvkkConsent,
  validateRating,
  type CommentPage,
  type CommentStatus,
  type PublicComment,
  type RatingSummary,
} from "@/lib/comment-policy";
import { buildVoterKey, hashIp } from "@/lib/comment-hash";

// ── Rate-limit politikaları ───────────────────────────────────────────────────
//
// `@/lib/rate-limit` sliding-window (Lua/ZSET) kullanır — sabit penceredeki
// sınır patlaması (2x burst) yoktur. Aynı modül middleware tarafından da
// kullanıldığı için ikinci bir limiter yazılmadı: TEK kaynak ilkesi.
//
// `failClosed: true` → üretimde Redis düşerse yorum/puan YAZILMAZ (aksi halde
// saldırgan Redis'i devre dışı bırakıp limitsiz yorum dökerdi).
const LIMITS = {
  /** 10 dakikada 3 yorum. */
  comment: {
    windowMs: 10 * 60 * 1000,
    maxRequests: 3,
    keyPrefix: "rl:comment",
    failClosed: true,
  },
  /** 24 saatte 1 yorum — spam kümelenmesini yakalar. */
  commentDaily: {
    windowMs: 24 * 60 * 60 * 1000,
    maxRequests: 1,
    keyPrefix: "rl:comment-day",
    failClosed: true,
  },
  /** 24 saatte 10 puan — puan zorlanmasını engeller. */
  rating: {
    windowMs: 24 * 60 * 60 * 1000,
    maxRequests: 10,
    keyPrefix: "rl:rating",
    failClosed: true,
  },
} as const;

/** İstek başlıklarından istemci IP'si. Proxy arkasında `x-forwarded-for` ilk değer alınır. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "0.0.0.0";
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────

/** DB satırını kullanıcıya döndürülebilir biçime çevirir (PII temizlenmiş). */
function toPublicComment(row: Record<string, unknown>): PublicComment {
  return {
    id: Number(row.id),
    postId: Number(row.post_id),
    parentId: row.parent_id != null ? Number(row.parent_id) : null,
    authorName: String(row.author_name),
    isGuest: row.user_id == null,
    authorAvatar: (row.author_photo_url as string) ?? null,
    body: String(row.body),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

const COMMENT_CACHE_TTL = 60 * 5;

/**
 * Onaylı yorum listesini Redis'ten okur.
 * Yorumlar moderasyon durumuna bağlı olduğu için her invalidate'da düşer.
 */
async function getCachedComments(
  postId: number,
  page: number
): Promise<CommentPage | null> {
  const key = `Blog:comments:${postId}:${page}`;
  const cached = await cacheGetSafe<CommentPage>(key);
  return cached;
}

async function cacheGetSafe<T>(key: string): Promise<T | null> {
  const { cacheGet } = await import("@/lib/redis/client");
  return cacheGet<T>(key);
}

/** Onaylı yorum sayısı + ortalama puan (tek sorgu). */
async function getRatingSummaryRaw(
  postId: number,
  userId: string | null,
  voterKey: string | null
): Promise<RatingSummary> {
  const { rows } = await pool.query<{
    average: string | null;
    count: number;
    user_rating: number | null;
  }>(
    `SELECT
       AVG(r.rating)::float AS average,
       COUNT(*)::int        AS count,
       (SELECT ur.rating FROM Blog_ratings ur
         WHERE ur.post_id = $1
           AND (($2::text IS NOT NULL AND ur.user_id::text = $2)
             OR ($3::text IS NOT NULL AND ur.user_id IS NULL AND ur.voter_key = $3))
         LIMIT 1) AS user_rating
     FROM Blog_ratings r
     WHERE r.post_id = $1`,
    [postId, userId, voterKey]
  );
  const row = rows[0];
  const average = row?.average != null ? Number(row.average) : 0;
  return {
    average,
    rounded: Math.round(average * 10) / 10,
    count: Number(row?.count ?? 0),
    userRating: row?.user_rating != null ? Number(row.user_rating) : null,
  };
}

// ── Public: Listeleme ─────────────────────────────────────────────────────────

/**
 * Bir yazının ONAYLANMIŞ yorumlarını sayfalı döndürür.
 * Misafirler de çağırabilir; herhangi bir PII sızdırmaz.
 */
export async function getCommentsAction(
  postId: number,
  page = 0
): Promise<CommentPage> {
  const empty: CommentPage = {
    comments: [],
    total: 0,
    hasMore: false,
    nextOffset: 0,
  };
  if (!Number.isInteger(postId) || postId <= 0) return empty;
  const safePage = Math.max(0, Math.floor(page));

  try {
    const cached = await getCachedComments(postId, safePage);
    if (cached) return cached;

    const offset = safePage * COMMENT_LIMITS.pageSize;
    const { rows } = await pool.query(
      `SELECT c.id, c.post_id, c.parent_id, c.author_name, c.user_id,
              c.body, c.created_at, u.photo_url AS author_photo_url
       FROM Blog_comments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
         AND c.status = 'approved'
         AND c.deleted_at IS NULL
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [postId, COMMENT_LIMITS.pageSize + 1, offset]
    );

    const hasMore = rows.length > COMMENT_LIMITS.pageSize;
    const comments = rows.slice(0, COMMENT_LIMITS.pageSize).map(toPublicComment);

    // Toplam (sayfalama için) — COUNT her seferde değil, sadece ilk sayfada.
    let total = offset + comments.length;
    if (!hasMore) {
      const c = await pool.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM Blog_comments
         WHERE post_id = $1 AND status = 'approved' AND deleted_at IS NULL`,
        [postId]
      );
      total = Number(c.rows[0]?.total ?? total);
    }

    const result: CommentPage = {
      comments,
      total,
      hasMore,
      nextOffset: offset + COMMENT_LIMITS.pageSize,
    };
    await cacheSet(
      `Blog:comments:${postId}:${safePage}`,
      result,
      COMMENT_CACHE_TTL
    );
    return result;
  } catch (err) {
    console.error("getCommentsAction error:", err);
    return empty;
  }
}

// ── Public: Puan özeti ────────────────────────────────────────────────────────

export async function getRatingSummaryAction(
  postId: number
): Promise<RatingSummary> {
  const empty: RatingSummary = { average: 0, rounded: 0, count: 0, userRating: null };
  if (!Number.isInteger(postId) || postId <= 0) return empty;

  try {
    const ctx = await getServerActionContext();
    const ip = await clientIp();
    const h = await headers();
    const ipHash = hashIp(ip);
    const voterKey = ctx.isAuthenticated
      ? null
      : buildVoterKey(ipHash, h.get("user-agent") ?? "");

    return await getRatingSummaryRaw(
      postId,
      ctx.isAuthenticated ? ctx.userId : null,
      voterKey
    );
  } catch (err) {
    console.error("getRatingSummaryAction error:", err);
    return empty;
  }
}

// ── Public: Puan ver ──────────────────────────────────────────────────────────

export async function submitRatingAction(
  postId: number,
  rating: unknown
): Promise<{ ok: true; summary: RatingSummary } | { ok: false; message: string }> {
  if (!Number.isInteger(postId) || postId <= 0) {
    return { ok: false, message: "Geçersiz yazı." };
  }
  const ratingCheck = validateRating(rating);
  if (!ratingCheck.ok) return { ok: false, message: ratingCheck.message };

  try {
    const ctx = await getServerActionContext();
    const ip = await clientIp();
    const h = await headers();
    const ipHash = hashIp(ip);

    const rl = await checkRateLimit(`${postId}:${ipHash}`, LIMITS.rating);
    if (!rl.success) {
      return {
        ok: false,
        message: "Çok sık puan verdiniz. Lütfen biraz sonra tekrar deneyin.",
      };
    }

    // Yazının gerçekten yayında olduğunu doğrula (varlık oynama koruması).
    const exists = await pool.query(
      `SELECT 1 FROM Blog_posts WHERE id = $1 AND status = 'published' AND deleted_at IS NULL LIMIT 1`,
      [postId]
    );
    if (!exists.rows[0]) return { ok: false, message: "Yazı bulunamadı." };

    const userId = ctx.isAuthenticated ? ctx.userId : null;
    const voterKey = userId ? null : buildVoterKey(ipHash, h.get("user-agent") ?? "");

    // Tek puan kuralı: kısmi benzersiz indeksler sayesinde UPSERT.
    // user_id doluysa user_id indeksi, değilse voter_key indeksi hedeflenir.
    if (userId) {
      await pool.query(
        `INSERT INTO Blog_ratings (post_id, rating, user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (post_id, user_id) WHERE user_id IS NOT NULL
         DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
        [postId, ratingCheck.value, userId]
      );
    } else {
      await pool.query(
        `INSERT INTO Blog_ratings (post_id, rating, voter_key)
         VALUES ($1, $2, $3)
         ON CONFLICT (post_id, voter_key) WHERE voter_key IS NOT NULL AND user_id IS NULL
         DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()`,
        [postId, ratingCheck.value, voterKey]
      );
    }

    await invalidateCommentCache(postId);
    const summary = await getRatingSummaryRaw(postId, userId, voterKey);
    return { ok: true, summary };
  } catch (err) {
    console.error("submitRatingAction error:", err);
    return { ok: false, message: "Puan kaydedilemedi. Lütfen tekrar deneyin." };
  }
}

// ── Public: Yorum gönder ──────────────────────────────────────────────────────

export interface SubmitCommentInput {
  postId: number;
  parentId?: number | null;
  name: string;
  email?: string;
  body: string;
  kvkkConsent: boolean;
  /**
   * Görünmez tuzak alanı (honeypot). Gerçek kullanıcı doldurmaz; botlar
   * otomatik doldurur. Boş değilse istek sessizce başarı gibi döner.
   */
  website?: string;
}

export async function submitCommentAction(
  input: SubmitCommentInput
): Promise<
  { ok: true; pending: true } | { ok: false; message: string; field?: string }
> {
  const failMsg = (message: string, field?: string) =>
    ({ ok: false as const, message, field }) as const;

  // 0) Honeypot — bot tuzağı. Kullanıcıya hata göstermeyiz (bilgi sızdırma).
  if (input.website && input.website.trim() !== "") {
    console.warn("[comment] honeypot triggered");
    return { ok: true, pending: true };
  }

  // 1) Doğrulama
  const postId = input.postId;
  if (!Number.isInteger(postId) || postId <= 0) {
    return failMsg("Geçersiz yazı.", "postId");
  }

  const nameCheck = validateCommentName(input.name);
  if (!nameCheck.ok) return failMsg(nameCheck.message, nameCheck.field);

  const emailCheck = validateCommentEmail(input.email);
  if (!emailCheck.ok) return failMsg(emailCheck.message, emailCheck.field);

  const bodyCheck = validateCommentBody(input.body);
  if (!bodyCheck.ok) return failMsg(bodyCheck.message, bodyCheck.field);

  const consentCheck = validateKvkkConsent(input.kvkkConsent);
  if (!consentCheck.ok) return failMsg(consentCheck.message, consentCheck.field);

  const parentId =
    input.parentId != null && Number.isInteger(input.parentId) && input.parentId > 0
      ? input.parentId
      : null;

  try {
    const ctx = await getServerActionContext();
    const ip = await clientIp();
    const h = await headers();
    const ipHash = hashIp(ip);
    const userAgent = (h.get("user-agent") ?? "").slice(0, 512);

    // 2) Rate-limit (iki katman: kısa + uzun pencere)
    const [rlShort, rlLong] = await Promise.all([
      checkRateLimit(`${postId}:${ipHash}`, LIMITS.comment),
      checkRateLimit(`${postId}:${ipHash}`, LIMITS.commentDaily),
    ]);
    if (!rlShort.success || !rlLong.success) {
      return failMsg("Çok sık yorum gönderdiniz. Lütfen daha sonra tekrar deneyin.");
    }

    // 3) Yazı yayında mı?
    const post = await pool.query<{ id: number }>(
      `SELECT id FROM Blog_posts
       WHERE id = $1 AND status = 'published' AND deleted_at IS NULL LIMIT 1`,
      [postId]
    );
    if (!post.rows[0]) return failMsg("Yazı bulunamadı.");

    // 4) Yanıt zinciri derinliğini kontrol et (parent yorum onaylı olmalı).
    let depth = 0;
    if (parentId != null) {
      const parent = await pool.query<{ post_id: number; parent_id: number | null; status: string }>(
        `SELECT post_id, parent_id, status FROM Blog_comments WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [parentId]
      );
      const p = parent.rows[0];
      if (!p || p.post_id !== postId || p.status !== "approved") {
        return failMsg("Yanıt yapılacak yorum bulunamadı.");
      }
      // parent'ın parent'ına bak → derinlik 2'yi aşamaz.
      depth = p.parent_id != null ? 2 : 1;
      if (depth >= COMMENT_LIMITS.maxReplyDepth) {
        return failMsg("Bu yorum için yanıt zinciri en fazla 2 seviye olabilir.");
      }
    }

    // 5) Yaz — durum 'pending' (moderasyon onayı bekliyor).
    const displayName = toDisplayName(nameCheck.value);
    await pool.query(
      `INSERT INTO Blog_comments
         (post_id, parent_id, author_name, email, user_id, is_guest,
          body, status, ip_hash, user_agent, kvkk_consent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, TRUE)`,
      [
        postId,
        parentId,
        displayName,
        emailCheck.value,
        ctx.isAuthenticated ? ctx.userId : null,
        !ctx.isAuthenticated,
        bodyCheck.value, // düz metin — HTML değil
        ipHash,
        userAgent,
      ]
    );

    return { ok: true, pending: true };
  } catch (err) {
    console.error("submitCommentAction error:", err);
    return failMsg("Yorumunuz gönderilemedi. Lütfen tekrar deneyin.");
  }
}

// ── Admin: Moderasyon ─────────────────────────────────────────────────────────

export interface AdminCommentRow {
  id: number;
  postId: number;
  postTitle: string;
  postSlug: string;
  parentId: number | null;
  authorName: string;
  email: string | null;
  isGuest: boolean;
  body: string;
  status: CommentStatus;
  createdAt: string;
}

export async function getAdminCommentsAction(
  status: CommentStatus | "all" = "pending",
  limit = 50,
  offset = 0
): Promise<{ ok: boolean; comments: AdminCommentRow[]; total: number; error?: string }> {
  try {
    await requireAdminAction();
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const safeOffset = Math.max(0, offset);

    const where = ["c.deleted_at IS NULL"];
    const params: unknown[] = [];
    if (status !== "all") {
      params.push(status);
      where.push(`c.status = $${params.length}`);
    }
    params.push(safeLimit, safeOffset);

    const { rows } = await pool.query<Record<string, unknown>>(
      `SELECT c.id, c.post_id, c.parent_id, c.author_name, c.email, c.user_id,
              c.body, c.status, c.created_at,
              bp.title AS post_title, bp.slug AS post_slug
       FROM Blog_comments c
       LEFT JOIN Blog_posts bp ON bp.id = c.post_id
       WHERE ${where.join(" AND ")}
       ORDER BY c.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const totalRes = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM Blog_comments c
       WHERE ${where.join(" AND ")}`,
      params.slice(0, params.length - 2)
    );

    const comments: AdminCommentRow[] = rows.map((r) => ({
      id: Number(r.id),
      postId: Number(r.post_id),
      postTitle: String(r.post_title ?? "(silinmiş yazı)"),
      postSlug: String(r.post_slug ?? ""),
      parentId: r.parent_id != null ? Number(r.parent_id) : null,
      authorName: String(r.author_name),
      email: (r.email as string) ?? null,
      isGuest: r.user_id == null,
      body: String(r.body),
      status: r.status as CommentStatus,
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
    }));

    return { ok: true, comments, total: Number(totalRes.rows[0]?.total ?? 0) };
  } catch (error: any) {
    console.error("getAdminCommentsAction error:", error);
    return { ok: false, comments: [], total: 0, error: error.message };
  }
}

export async function moderateCommentAction(
  commentId: number,
  status: CommentStatus
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdminAction();
    if (!Number.isInteger(commentId) || commentId <= 0) {
      return { ok: false, error: "Geçersiz yorum ID." };
    }
    if (!["approved", "pending", "spam", "rejected"].includes(status)) {
      return { ok: false, error: "Geçersiz durum." };
    }

    const res = await pool.query<{ post_id: number }>(
      `UPDATE Blog_comments
       SET status = $1, moderated_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING post_id`,
      [status, commentId]
    );
    if (!res.rows[0]) return { ok: false, error: "Yorum bulunamadı." };

    // Yorum listesi değişti → ilgili yazının yorum cache'ini düşür.
    await invalidateCommentCache(res.rows[0].post_id);
    return { ok: true };
  } catch (error: any) {
    console.error("moderateCommentAction error:", error);
    return { ok: false, error: error.message };
  }
}

export async function deleteCommentAction(
  commentId: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdminAction();
    if (!Number.isInteger(commentId) || commentId <= 0) {
      return { ok: false, error: "Geçersiz yorum ID." };
    }

    const res = await pool.query<{ post_id: number }>(
      `UPDATE Blog_comments SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL RETURNING post_id`,
      [commentId]
    );
    if (!res.rows[0]) return { ok: false, error: "Yorum bulunamadı." };

    await invalidateCommentCache(res.rows[0].post_id);
    return { ok: true };
  } catch (error: any) {
    console.error("deleteCommentAction error:", error);
    return { ok: false, error: error.message };
  }
}

// ── Cache invalidation ────────────────────────────────────────────────────────

/** Bir yazının tüm onaylı yorum + puan cache'ini düşürür. */
async function invalidateCommentCache(postId: number): Promise<void> {
  const keys = await cacheKeys(`Blog:comments:${postId}:*`);
  await cacheDel(keys);
  await cacheDel([`Blog:rating:${postId}`]);
  // Blog detay sayfası yorum/puan sayısını gösterdiği için içerik cache'i de
  // geçersiz kılınır (yazının slug'ı bilinmediği için tüm liste düşer).
  await invalidateBlogCaches();
}