/**
 * Telegram 2FA — Admin OTP Servisi
 *
 * Admin paneline giris için Telegram üzerinden OTP kodu gönderir ve dogrular.
 * OTP'ler PostgreSQL'de (Neon) saklanir: Vercel gibi sunucusuz ortamda gönderim
 * ve dogrulama farkli instance'lara düsse bile ayni koda erisilir. Kod yalnizca
 * sha-256 hash olarak tutulur; tek kullanimliktir ve 5 dakikada süresi dolar.
 *
 * Env degiskenleri:
 *   TELEGRAM_BOT_TOKEN     — BotFather'dan alınan token
 *   TELEGRAM_ADMIN_CHAT_ID — Admin'in kisisel Telegram chat ID'si
 */

import { randomInt } from "node:crypto";
import { storeAdmin2faOtp, verifyAdmin2faOtp } from "@/lib/database";

function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

// ── Telegram üzerinden OTP gönder ────────────────────────────────────────────

export async function sendTelegramAdmin2faOtp(
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return { success: false, error: "TELEGRAM_BOT_TOKEN eksik" };

  const otp = generateOtp();

  // OTP'yi veritabanına kaydet — her instance'tan erişilebilir olması için.
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
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      }
    );
    const json = await res.json();
    if (!json.ok) {
      return { success: false, error: json.description ?? "Telegram hatası" };
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Telegram baglantı hatası",
    };
  }
}

// ── OTP dogrula ──────────────────────────────────────────────────────────────

export async function verifyTelegramAdmin2faOtp(
  chatId: string,
  code: string
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