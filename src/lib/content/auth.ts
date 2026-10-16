/**
 * İçerik API'sinin kimlik doğrulama + yazar çözümleme yardımcıları.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import pool from "@/lib/database";
import { timingSafeEqual } from "@/lib/api-guard";
import { getClientIp as getRequestClientIp } from "@/lib/rate-limit";
import { fail } from "./response";

// ── BOT_AUTHOR_ID: build-time değil runtime'da resolve et ────────────────────
// process.env erişimi fonksiyon içinde yapılarak Vercel runtime injection sorunu önlenir

function getBotAuthorId(): number {
  const val = process.env.BOT_AUTHOR_ID;
  const parsed = Number(val);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 14;
}

/** Bot yazarının geçerli kullanıcı id'sini çözer (yoksa ilk admin, o da yoksa null). */
export async function resolveBotAuthorId(): Promise<number | null> {
  const botId = getBotAuthorId(); // runtime'da oku

  const userResult = await pool.query(
    "SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1",
    [botId],
  );
  if (userResult.rows.length > 0) return botId;

  // Fallback: ilk admin kullanıcıyı bul
  const adminResult = await pool.query(
    `SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL LIMIT 1`,
  );
  if (adminResult.rows.length > 0) return adminResult.rows[0].id;

  return null;
}

/**
 * X-Bot-Key header'ını doğrular (timing-safe). Geçersizse NextResponse döner;
 * geçerliyse null. /api/bot ve /api/content aynı anahtarı kullanır.
 */
export function verifyContentApiKey(req: NextRequest): NextResponse | null {
  const key = req.headers.get("x-bot-key");
  const ip = getRequestClientIp(req);

  if (!key) {
    console.warn(`[ContentAPI] MISSING_API_KEY ip=${ip}`);
    return fail(401, "MISSING_API_KEY");
  }

  const valid = process.env.BOT_API_KEY;
  if (!valid) {
    console.error("[ContentAPI] BOT_API_KEY env tanımlı değil");
    return fail(500, "SERVER_ERROR");
  }

  if (key.length < 16 || key.length > 256) {
    console.warn(`[ContentAPI] INVALID_KEY_LENGTH len=${key.length} ip=${ip}`);
    return fail(401, "INVALID_API_KEY");
  }

  if (!timingSafeEqual(key, valid)) {
    console.warn(`[ContentAPI] INVALID_API_KEY ip=${ip} ua="${req.headers.get("user-agent") ?? ""}"`);
    return fail(401, "INVALID_API_KEY");
  }

  return null;
}
