"use server";

/**
 * Admin 2FA Server Actions
 *
 * Akış:
 *   - Admin, normal giriş akışıyla (loginAction) siteye girer ve `xipsoft_session`
 *     JWT'sine sahip olur (Henüz `two_factor_verified` YOK).
 *   - /admin paneline erişmeye çalışınca middleware onu /admin/verify-2fa'ya yönlendirir.
 *   - Bu action'lar OTP'yi Telegram üzerinden gönderir ve doğrular.
 *   - Doğrulama başarılı olunca `xipsoft_session` yeniden üretilir ve
 *     `two_factor_verified: true` claim'i eklenir.
 *
 * Güvenlik notları:
 *   - userId/email her zaman session JWT'den türetilir — client'tan GÜVENİLMEZ.
 *   - OTP Redis'te TTL ile saklanır (5 dakika), yoksa in-memory fallback.
 *   - Env değişkenleri eksikse yalnızca o an uyarı döner; normal giriş/site etkilenmez.
 */

import { cookies } from "next/headers";
import { randomInt } from "node:crypto";
import { queryOne } from "@/lib/db/pool";
import { storeAdmin2faOtp, verifyAdmin2faOtp } from "@/lib/db/admin-2fa";
import { createSessionCookie, SECURE_COOKIE_OPTIONS, verifySessionCookie } from "@/lib/security";
import { getAdmin2faConfig } from "@/lib/admin-2fa-config";

type ActionResult = { success: boolean; error?: string };

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  role: string;
  is_banned: boolean | null;
}

type PendingAdmin =
  | { ok: true; user: AdminUser; chatId: string }
  | { ok: false; error: string };

function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

async function sendTelegramAdmin2faOtp(
  chatId: string,
): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return { success: false, error: "TELEGRAM_BOT_TOKEN eksik" };

  const otp = generateOtp();
  try {
    await storeAdmin2faOtp(chatId, otp);
  } catch (error) {
    console.error("[Admin 2FA] OTP persistence failed:", error);
    return {
      success: false,
      error: "Doğrulama kodu güvenli şekilde kaydedilemedi. Lütfen sistem yöneticisine bildirin.",
    };
  }

  const text = [
    "🔐 <b>XipSoft Admin — 2FA Kodu</b>",
    "",
    `Kodunuz: <code>${otp}</code>`,
    "",
    "⏱ 5 dakika geçerlidir.",
    "<i>Bu kodu kimseyle paylasmayın.</i>",
  ].join("\n");

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const result = await response.json();
    if (!result.ok) {
      return { success: false, error: result.description ?? "Telegram hatası" };
    }
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Telegram baglantı hatası",
    };
  }
}

async function verifyTelegramAdmin2faOtp(
  chatId: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await verifyAdmin2faOtp(chatId, code.trim());
    switch (result.status) {
      case "ok":
        return { success: true };
      case "not_found":
        return { success: false, error: "Kod bulunamadı. Lütfen yeni kod isteyin." };
      case "expired":
        return { success: false, error: "Kodun süresi doldu. Lütfen yeni kod isteyin." };
      case "locked":
        return { success: false, error: "Çok fazla hatalı deneme. Kod iptal edildi — yeni kod isteyin." };
      case "wrong":
        return { success: false, error: `Kod hatalı. Kalan deneme: ${result.remaining}` };
      default:
        return { success: false, error: "Beklenmeyen durum. Lütfen tekrar deneyin." };
    }
  } catch (error) {
    console.error("[Admin 2FA] OTP verification failed:", error);
    return { success: false, error: "Kod doğrulanamadı. Lütfen tekrar deneyin." };
  }
}

/**
 * Bekleyen admin oturumunu session JWT'den çözer.
 * - Oturum yoksa / admin değilse reddeder.
 * - Env eksikse açıklayıcı hata döner (çağıran taraf uyarı gösterir).
 * - ADMIN_EMAIL kısıtı burada da uygulanır (middleware'e ek savunma katmanı).
 */
async function getPendingAdmin(): Promise<PendingAdmin> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("xipsoft_session")?.value;
  if (!sessionToken) {
    return { ok: false, error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const payload = await verifySessionCookie(sessionToken);
  if (!payload || payload.role !== "admin") {
    return { ok: false, error: "Admin yetkisi gerekli." };
  }

  const config = getAdmin2faConfig();
  if (!config.ready) {
    return {
      ok: false,
      error: `Admin Telegram 2FA yapılandırması eksik: ${config.missing.join(", ")}`,
    };
  }

  const email = String(payload.email ?? "").trim().toLowerCase();
  if (email !== config.authorizedEmail) {
    return { ok: false, error: "Bu hesap admin paneline yetkili değil." };
  }

  const user = await queryOne<AdminUser>(
    `SELECT id, email, display_name, photo_url, role, is_banned
     FROM users
     WHERE LOWER(email) = $1 AND role = 'admin' AND deleted_at IS NULL
     LIMIT 1`,
    [config.authorizedEmail],
  );
  if (!user || user.is_banned) {
    return { ok: false, error: "Admin hesabı bulunamadı." };
  }

  return { ok: true, user, chatId: config.chatId as string };
}

/**
 * Admin 2FA OTP gönder (Telegram).
 * Yalnızca geçerli bir admin oturumu varken çalışır.
 */
export async function sendAdmin2faOtpAction(): Promise<ActionResult> {
  try {
    const pending = await getPendingAdmin();
    if (!pending.ok) return { success: false, error: pending.error };
    return sendTelegramAdmin2faOtp(pending.chatId);
  } catch (error) {
    console.error("[Admin 2FA] OTP send action failed:", error);
    return {
      success: false,
      error: "Kod gönderilemedi. Lütfen tekrar deneyin veya sistem yöneticisine bildirin.",
    };
  }
}

/**
 * Admin 2FA OTP doğrula.
 * Başarılı doğrulama sonrası oturum `two_factor_verified: true` ile yenilenir.
 */
export async function verifyAdmin2faOtpAction(code: string): Promise<ActionResult> {
  const cleanCode = String(code ?? "").trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    return { success: false, error: "6 haneli doğrulama kodunu girin" };
  }

  try {
    const pending = await getPendingAdmin();
    if (!pending.ok) return { success: false, error: pending.error };

    const result = await verifyTelegramAdmin2faOtp(pending.chatId, cleanCode);
    if (!result.success) return result;

    const sessionToken = await createSessionCookie(pending.user.id, {
      email: pending.user.email,
      display_name: pending.user.display_name,
      photo_url: pending.user.photo_url,
      role: "admin",
      two_factor_verified: true,
    });

    const cookieStore = await cookies();
    cookieStore.set("xipsoft_session", sessionToken, {
      ...SECURE_COOKIE_OPTIONS,
      maxAge: 60 * 30,
    });
    cookieStore.set("xipsoft_logged_in", "1", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    cookieStore.set("xipsoft_2fa_verified", "1", {
      ...SECURE_COOKIE_OPTIONS,
      maxAge: 60 * 30,
    });
    cookieStore.set("xipsoft_admin_access", "1", {
      ...SECURE_COOKIE_OPTIONS,
      maxAge: 60 * 30,
    });
    cookieStore.delete("xipsoft_admin_login_challenge");

    return { success: true };
  } catch (error) {
    console.error("[Admin 2FA] OTP verification action failed:", error);
    return {
      success: false,
      error: "Doğrulama sırasında sunucu hatası oluştu. Lütfen yeni kod isteyip tekrar deneyin.",
    };
  }
}
