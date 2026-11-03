/**
 * lib/comment-policy.ts — Blog yorumları için SAYISAL SINIRLAR ve doğrulama.
 *
 * Güvenlik sözleşmesinin TEK kaynağı: hem server action doğrulaması hem client
 * form ipuçları hem admin ekranı buradan okur. Böylece "kullanıcıya 2000
 * karakter yazma" deneyimi ile "sunucu 2000 karakteri kabul edir" davranışı
 * ayrışamaz.
 *
 * ⚠ CLIENT-SAFE: Bu modül "use client" bileşenlerinden de import edilir
 * (`CommentSection` sınırları kullanıcıya gösterir). Bu yüzden HİÇBİR Node-only
 * bağımlılık içermemelidir — özellikle `node:crypto`. Hash yardımcıları
 * bilinçli olarak `lib/comment-hash.ts` dosyasındadır.
 */

// ── Sınırlar ───────────────────────────────────────────────────────────────────

export const COMMENT_LIMITS = {
  /** Gövde: 20–2000 karakter. Kısa yorum spam'ı, uzun yorum ise depolama/DoS. */
  body: { min: 20, max: 2000 },
  /** Ad Soyad: 3–80 karakter. */
  name: { min: 3, max: 80 },
  /** E-posta: makul bir üst sınır (RFC gereği 254). */
  email: { max: 254 },
  /** Yanıt (parent) zinciri derinliği. İç içe yorum kutu kuyusu engellenir. */
  maxReplyDepth: 2,
  /** Sayfa başına onaylı yorum. */
  pageSize: 20,
} as const;

export const COMMENT_STATUSES = [
  "pending",
  "approved",
  "spam",
  "rejected",
] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export const COMMENT_MAX_RATING = 5;
export const COMMENT_MIN_RATING = 1;

// ── Tipler ────────────────────────────────────────────────────────────────────

/** Kullanıcıya döndürülen yorum satırı. `email`/`ip_hash` BİLEREK YOKTUR. */
export interface PublicComment {
  id: number;
  postId: number;
  parentId: number | null;
  authorName: string;
  isGuest: boolean;
  /** Üye yorumlarında gösterilir; misafirlerde `null`. */
  authorAvatar: string | null;
  body: string;
  createdAt: string;
}

export interface CommentPage {
  comments: PublicComment[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface RatingSummary {
  average: number;
  /** 1–5 aralığında, iki ondalığa yuvarlanmış. */
  rounded: number;
  count: number;
  /** Kullanıcının bu yazı için mevcut puanı (yoksa `null`). */
  userRating: number | null;
}

// ── Doğrulama ─────────────────────────────────────────────────────────────────

export interface ValidationOk<T> {
  ok: true;
  value: T;
}
export interface ValidationErr {
  ok: false;
  message: string;
  field?: "name" | "email" | "body" | "rating" | "consent" | "general";
}

export type ValidationResult<T> = ValidationOk<T> | ValidationErr;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Kontrol karakterleri: C0 (tab, satır sonu ve NUL dahil) + DEL.
 * Log satırlarını bölmek ve render'ı bozmak dışında hiçbir işe yaramazlar.
 * Kaynak dosyada görünmez karakter yazmamak için unicode kaçışı kullanılır.
 */
const CONTROL_CHARS_ALL = /[\u0000-\u001F\u007F]/g;
/** Aynı küme, ancak TAB ve SATIR SONU korunur (çok satırlı yorumlarda gereklidir). */
const CONTROL_CHARS_KEEP_NL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Ad Soyad: trim, kontrol karakteri temizliği, uzunluk, engellenen desenler. */
export function validateCommentName(raw: unknown): ValidationResult<string> {
  if (typeof raw !== "string") {
    return { ok: false, message: "Adınızı yazın.", field: "name" };
  }
  const name = raw.replace(CONTROL_CHARS_ALL, " ").replace(/\s+/g, " ").trim();

  if (name.length < COMMENT_LIMITS.name.min) {
    return {
      ok: false,
      message: `Adınız en az ${COMMENT_LIMITS.name.min} karakter olmalı.`,
      field: "name",
    };
  }
  if (name.length > COMMENT_LIMITS.name.max) {
    return {
      ok: false,
      message: `Adınız en fazla ${COMMENT_LIMITS.name.max} karakter olabilir.`,
      field: "name",
    };
  }
  // Yorumlarda bağlantı/mention satışı engellemek için sert blok.
  if (/(https?:\/\/|www\.|@)/i.test(name)) {
    return {
      ok: false,
      message: "Ad alanına bağlantı veya @ kullanılamaz.",
      field: "name",
    };
  }
  return { ok: true, value: name };
}

/** E-posta: opsiyonel (misafir için zorunlu değil) ama girilirse geçerli olmalı. */
export function validateCommentEmail(
  raw: unknown
): ValidationResult<string | null> {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: null };
  }
  if (typeof raw !== "string") {
    return { ok: false, message: "E-posta adresi geçersiz.", field: "email" };
  }
  const email = raw.trim().toLowerCase();
  if (email.length > COMMENT_LIMITS.email.max) {
    return { ok: false, message: "E-posta adresi çok uzun.", field: "email" };
  }
  if (!EMAIL_RE.test(email)) {
    return {
      ok: false,
      message: "Geçerli bir e-posta adresi girin.",
      field: "email",
    };
  }
  return { ok: true, value: email };
}

/**
 * Yorum gövdesi — plain text sözleşmesinin kalbi.
 *
 * HTML KABUL EDİLMEZ ve zaten depolanmaz. Yorum hiçbir noktada HTML'e
 * dönüştürülmediğinden (React text node) kaçış yüzeyi yoktur.
 *
 * Yine de katmanlı savunma için `<` ve `>` karakterleri kaldırılır: ileride
 * biri hatalı bir şablonla `dangerouslySetInnerHTML` kullanırsa bu yorumlar
 * yine de etkisiz kalır.
 */
export function validateCommentBody(raw: unknown): ValidationResult<string> {
  if (typeof raw !== "string") {
    return { ok: false, message: "Yorumunuzu yazın.", field: "body" };
  }
  const body = raw
    .replace(/\r\n/g, "\n")
    .replace(CONTROL_CHARS_KEEP_NL, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (body.length < COMMENT_LIMITS.body.min) {
    return {
      ok: false,
      message: `Yorumunuz en az ${COMMENT_LIMITS.body.min} karakter olmalı.`,
      field: "body",
    };
  }
  if (body.length > COMMENT_LIMITS.body.max) {
    return {
      ok: false,
      message: `Yorumunuz en fazla ${COMMENT_LIMITS.body.max} karakter olabilir.`,
      field: "body",
    };
  }
  // Yorum satışı / spam filtresi: bağlantı sayısı sınırlanır.
  const linkCount = (body.match(/https?:\/\/|www\./gi) ?? []).length;
  if (linkCount > 2) {
    return {
      ok: false,
      message: "Yorumunuzda en fazla 2 bağlantı olabilir.",
      field: "body",
    };
  }
  return { ok: true, value: body };
}

/** 1–5 arası tam sayı puan. */
export function validateRating(raw: unknown): ValidationResult<number> {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isInteger(n)) {
    return { ok: false, message: "Geçerli bir puan seçin.", field: "rating" };
  }
  if (n < COMMENT_MIN_RATING || n > COMMENT_MAX_RATING) {
    return {
      ok: false,
      message: `Puan ${COMMENT_MIN_RATING}–${COMMENT_MAX_RATING} arasında olmalı.`,
      field: "rating",
    };
  }
  return { ok: true, value: n };
}

/** KVKK onayı zorunlu (yasal dayanak: aydınlatma metni). */
export function validateKvkkConsent(
  raw: unknown
): ValidationResult<boolean> {
  if (raw !== true) {
    return {
      ok: false,
      message:
        "Yorumu paylaşmak için KVKK aydınlatma metnini onaylamalısınız.",
      field: "consent",
    };
  }
  return { ok: true, value: true };
}

/** Yorum listesinde gösterilecek temiz ad (kelime baş harfleri büyütülür). */
export function toDisplayName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
      .join(" ")
      .slice(0, COMMENT_LIMITS.name.max)
  );
}
