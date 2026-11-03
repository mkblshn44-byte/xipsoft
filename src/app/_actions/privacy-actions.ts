"use server";

import pool from "@/lib/db/pool";
import { getServerActionContext } from "@/lib/api-guard";
import QRCode from "qrcode";
import {
  TOTP_DIGITS,
  TOTP_PERIOD_SECONDS,
  decodeBase32,
  generateTotpSecret,
  verifyTotp,
} from "@/lib/totp";
import { decryptSecret, encryptSecret, isWrappedSecret } from "@/lib/secret-box";

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
    const secret = generateTotpSecret();

    // Secret'ı DB'ye kaydet (henüz aktif degil — verifyTwoFactorAction'da aktif edilecek)
    await pool.query(
      `UPDATE users SET two_factor_secret = $1, two_factor_enabled = false, updated_at = NOW() WHERE id = $2`,
      [encryptSecret(secret), userId]
    );

    const issuer = encodeURIComponent("XipSoft");
    const account = encodeURIComponent(`user-${userId}`);
    const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
    // QR YERİNDE üretilir: üçüncü taraf QR servisine gitseydi secret + hesap
    // adı HTTPS query olarak dışarıya sızardı (karşı taraf loglar).
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl, { margin: 2, width: 240 });

    // `secret` bilinçli olarak döndürülmüyor: server action sonucu RSC payload'ı
    // ile istemciye serialize edilir → düz metin TOTP anahtarı ağ/React log'unda
    // görünür olurdu. Kurulum için yalnızca QR gerekiyor.
    return { success: true, qrCodeUrl };
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

    const stored = rows[0].two_factor_secret as string;
    const secret = decryptSecret(stored);

    if (decodeBase32(secret) === null) {
      return { success: false, error: "2FA yapılandırması bozuk, sıfırla" };
    }

    if (!verifyTotp(secret, token)) {
      return { success: false, error: "geçersiz dogrulama kodu" };
    }

    // Eski düz metin satırları ilk doğrulamada sarılır: ayrı migrate koşusu gerekmez.
    if (!isWrappedSecret(stored)) {
      await pool.query(
        `UPDATE users SET two_factor_secret = $1, updated_at = NOW() WHERE id = $2`,
        [encryptSecret(secret), userId]
      );
    }

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
