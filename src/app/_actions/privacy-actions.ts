"use server";

import pool from "@/lib/database";
import { getServerActionContext } from "@/lib/api-guard";

// Session'dan userId alır — client'tan userId kabul etmez
async function getAuthenticatedUserId(): Promise<number | null> {
  const ctx = await getServerActionContext();
  if (!ctx.isAuthenticated || !ctx.userId) return null;
  return Number(ctx.userId);
}

export async function updatePrivacySettingsAction(
  _ignoredUserId: number, // geriye dönük uyumluluk için parametre korundu ama kullanılmıyor
  Settings: {
    privacy_show_email?: boolean;
    privacy_show_activity?: boolean;
    privacy_allow_messages?: boolean;
    privacy_allow_mentions?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  // Session'dan userId al — parametre olarak gelen userId'yi kullanma
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Oturum açmanız gerekiyor" };

  try {
    await pool.query(
      `UPDATE users SET 
        privacy_show_email = COALESCE($1, privacy_show_email),
        privacy_show_activity = COALESCE($2, privacy_show_activity),
        privacy_allow_messages = COALESCE($3, privacy_allow_messages),
        privacy_allow_mentions = COALESCE($4, privacy_allow_mentions),
        updated_at = NOW()
       WHERE id = $5`,
      [
        Settings.privacy_show_email,
        Settings.privacy_show_activity,
        Settings.privacy_allow_messages,
        Settings.privacy_allow_mentions,
        userId,
      ]
    );
    return { success: true };
  } catch (err) {
    console.error("updatePrivacySettingsAction error:", err);
    return { success: false, error: "Sunucu hatası" };
  }
}

export async function getPrivacySettingsAction(
  _ignoredUserId?: number
): Promise<{
  privacy_show_email: boolean;
  privacy_show_activity: boolean;
  privacy_allow_messages: boolean;
  privacy_allow_mentions: boolean;
} | null> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  try {
    const { rows } = await pool.query(
      `SELECT privacy_show_email, privacy_show_activity, privacy_allow_messages, privacy_allow_mentions 
       FROM users 
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );
    if (!rows[0]) return null;
    return {
      privacy_show_email: rows[0].privacy_show_email,
      privacy_show_activity: rows[0].privacy_show_activity,
      privacy_allow_messages: rows[0].privacy_allow_messages,
      privacy_allow_mentions: rows[0].privacy_allow_mentions,
    };
  } catch (err) {
    console.error("getPrivacySettingsAction error:", err);
    return null;
  }
}

export async function enableTwoFactorAction(
  _ignoredUserId?: number
): Promise<{ success: boolean; secret?: string; qrCodeUrl?: string; error?: string }> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Oturum açmanız gerekiyor" };

  try {
    const crypto = await import("crypto");
    // RFC 4648 base32 — TOTP uyumlu secret
    const secretBytes = crypto.randomBytes(20);
    const base32Chars = "ABCDEFgHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < secretBytes.length; i += 5) {
      const c = secretBytes.slice(i, i + 5);
      const [b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0] = c;
      secret += base32Chars[(b0 >> 3) & 31];
      secret += base32Chars[((b0 & 7) << 2) | ((b1 >> 6) & 3)];
      secret += base32Chars[(b1 >> 1) & 31];
      secret += base32Chars[((b1 & 1) << 4) | ((b2 >> 4) & 15)];
      secret += base32Chars[((b2 & 15) << 1) | ((b3 >> 7) & 1)];
      secret += base32Chars[(b3 >> 2) & 31];
      secret += base32Chars[((b3 & 3) << 3) | ((b4 >> 5) & 7)];
      secret += base32Chars[b4 & 31];
    }
    secret = secret.slice(0, 32);

    // Secret'ı DB'ye kaydet (henüz aktif degil — verifyTwoFactorAction'da aktif edilecek)
    await pool.query(
      `UPDATE users SET two_factor_secret = $1, two_factor_enabled = false, updated_at = NOW() WHERE id = $2`,
      [secret, userId]
    );

    const issuer = encodeURIComponent("XipSoft");
    const account = encodeURIComponent(`user-${userId}`);
    const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    return { success: true, secret, qrCodeUrl };
  } catch (err) {
    console.error("enableTwoFactorAction error:", err);
    return { success: false, error: "Sunucu hatası" };
  }
}

export async function verifyTwoFactorAction(
  _ignoredUserId: number,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Oturum açmanız gerekiyor" };

  try {
    if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
      return { success: false, error: "geçersiz kod formatı" };
    }

    const { rows } = await pool.query(
      `SELECT two_factor_secret FROM users WHERE id = $1 AND deleted_at IS NULL AND two_factor_enabled = false`,
      [userId]
    );

    if (!rows[0]?.two_factor_secret) {
      return { success: false, error: "2FA yapılandırması bulunamadı" };
    }

    const secret = rows[0].two_factor_secret as string;

    // RFC 6238 TOTP dogrulama
    const crypto = await import("crypto");
    const timeStep = Math.floor(Date.now() / 1000 / 30);
    let verified = false;

    for (const offset of [-1, 0, 1]) {
      const counter = timeStep + offset;
      const counterBuf = Buffer.alloc(8);
      counterBuf.writeBigInt64BE(BigInt(counter));

      // Base32 decode
      const base32Chars = "ABCDEFgHIJKLMNOPQRSTUVWXYZ234567";
      const secretUpper = secret.toUpperCase().replace(/=+$/, "");
      let bits = 0, value = 0;
      const secretBytes: number[] = [];
      for (const char of secretUpper) {
        const idx = base32Chars.indexOf(char);
        if (idx === -1) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
          secretBytes.push((value >> (bits - 8)) & 255);
          bits -= 8;
        }
      }
      const secretBuf = Buffer.from(secretBytes);
      const hmac = crypto.createHmac("sha1", secretBuf).update(counterBuf).digest();
      const off = hmac[hmac.length - 1]! & 0xf;
      const otp = ((hmac.readUInt32BE(off) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
      if (otp === token) { verified = true; break; }
    }

    if (!verified) return { success: false, error: "geçersiz dogrulama kodu" };

    await pool.query(
      `UPDATE users SET two_factor_enabled = true, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
    return { success: true };
  } catch (err) {
    console.error("verifyTwoFactorAction error:", err);
    return { success: false, error: "Sunucu hatası" };
  }
}

export async function disableTwoFactorAction(
  _ignoredUserId?: number
): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Oturum açmanız gerekiyor" };

  try {
    await pool.query(
      `UPDATE users SET two_factor_secret = NULL, two_factor_enabled = false, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
    return { success: true };
  } catch (err) {
    console.error("disableTwoFactorAction error:", err);
    return { success: false, error: "Sunucu hatası" };
  }
}
