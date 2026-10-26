/**
 * Admin Telegram 2FA OTP (serverless-safe saklayıcı)
 * OTP'ler instance belleği/Redis yerine PostgreSQL'de tutulur. Böylece Vercel
 * gibi sunucusuz ortamda gönderim ve doğrulama farklı instance'lara düşse bile
 * aynı koda erişilir. Kod yalnızca sha-256 hash olarak saklanır, tek kullanımlıktır,
 * 5 dakikada süresi dolar; hatalı denemeler veya kullanım sonrası satır silinir.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import pool from "./pool";

const ADMIN_2FA_MAX_ATTEMPTS_DEFAULT = 5;
const ADMIN_2FA_TTL_SECONDS_DEFAULT = 5 * 60;

let admin2faTableReady = false;

async function ensureAdmin2faOtpTable(): Promise<void> {
  if (admin2faTableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_2fa_otps (
      chat_id TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS admin_2fa_otps_chat_id_uidx
    ON admin_2fa_otps (chat_id)
  `);
  admin2faTableReady = true;
}

function hashAdmin2faOtp(code: string): Buffer {
  return createHash("sha256").update(code).digest();
}

/** Admin 2FA OTP'sini sakla (varsa üzerine yazar ve deneme sayacını sıfırlar). */
export async function storeAdmin2faOtp(
  chatId: string,
  code: string,
  ttlSeconds = ADMIN_2FA_TTL_SECONDS_DEFAULT
): Promise<void> {
  await ensureAdmin2faOtpTable();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await pool.query(
    `INSERT INTO admin_2fa_otps (chat_id, code_hash, attempts, expires_at)
     VALUES ($1, $2, 0, $3)
     ON CONFLICT (chat_id)
     DO UPDATE SET code_hash = EXCLUDED.code_hash,
                   attempts = 0,
                   expires_at = EXCLUDED.expires_at,
                   created_at = NOW()`,
    [chatId, hashAdmin2faOtp(code).toString("hex"), expiresAt]
  );
}

export type Admin2faOtpVerifyResult =
  | { status: "ok"; remaining: number }
  | { status: "wrong"; remaining: number }
  | { status: "not_found"; remaining: number }
  | { status: "expired"; remaining: number }
  | { status: "locked"; remaining: number };

/** Kodu doğrula; başarı / kilitlenme / süre dolumunda kaydı siler (tek kullanımlık). */
export async function verifyAdmin2faOtp(
  chatId: string,
  givenCode: string,
  maxAttempts = ADMIN_2FA_MAX_ATTEMPTS_DEFAULT
): Promise<Admin2faOtpVerifyResult> {
  await ensureAdmin2faOtpTable();

  const { rows } = await pool.query<{
    chat_id: string;
    code_hash: string;
    attempts: number;
    expires_at: Date;
  }>(
    `SELECT chat_id, code_hash, attempts, expires_at
     FROM admin_2fa_otps WHERE chat_id = $1`,
    [chatId]
  );

  if (!rows[0]) return { status: "not_found", remaining: maxAttempts };

  const record = rows[0];

  if (new Date(record.expires_at) < new Date()) {
    await pool.query(`DELETE FROM admin_2fa_otps WHERE chat_id = $1`, [chatId]);
    return { status: "expired", remaining: maxAttempts };
  }

  if (record.attempts >= maxAttempts) {
    await pool.query(`DELETE FROM admin_2fa_otps WHERE chat_id = $1`, [chatId]);
    return { status: "locked", remaining: 0 };
  }

  const givenHash = hashAdmin2faOtp(givenCode.trim());
  const storedHash = Buffer.from(record.code_hash, "hex");
  const matches =
    givenHash.length === storedHash.length &&
    timingSafeEqual(givenHash, storedHash);

  if (matches) {
    await pool.query(`DELETE FROM admin_2fa_otps WHERE chat_id = $1`, [chatId]);
    return { status: "ok", remaining: maxAttempts };
  }

  const attempts = record.attempts + 1;
  const remaining = maxAttempts - attempts;
  if (remaining <= 0) {
    await pool.query(`DELETE FROM admin_2fa_otps WHERE chat_id = $1`, [chatId]);
    return { status: "locked", remaining: 0 };
  }

  await pool.query(
    `UPDATE admin_2fa_otps SET attempts = $2 WHERE chat_id = $1`,
    [chatId, attempts]
  );
  return { status: "wrong", remaining };
}

/** Kullanılmış/iptal edilmiş OTP kaydını siler. */
export async function deleteAdmin2faOtp(chatId: string): Promise<void> {
  await ensureAdmin2faOtpTable();
  await pool.query(`DELETE FROM admin_2fa_otps WHERE chat_id = $1`, [chatId]);
}
