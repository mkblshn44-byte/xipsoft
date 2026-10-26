"use server";

import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import argon2 from "argon2";
import { queryOne } from "@/lib/db/pool";
import { createSessionCookie, SECURE_COOKIE_OPTIONS } from "@/lib/security";
import { verifyTurnstile } from "@/lib/turnstile";

interface LoginResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    display_name: string;
    photo_url: string | null;
    role: string;
  };
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith("$argon2")) {
    return argon2.verify(hash, password);
  }
  return bcrypt.compare(password, hash);
}

/**
 * Birleşik giriş — TÜM roller (normal üye + admin) aynı akışla giriş yapar.
 *
 * Admin 2FA'sı burada ÇALIŞMAZ. 2FA yalnızca kullanıcı /admin paneline
 * erişmeye çalıştığında (middleware + /admin/verify-2fa) tetiklenir.
 *
 * Bu sayede:
 *   - Normal üye girişi Telegram env değişkenlerinden bağımsızdır.
 *   - Env eksik olsa bile giriş ve genel site akışı BOZULMAZ.
 *   - Admin, 2FA olmadan da siteye normal üye olarak giriş yapabilir;
 *     admin paneline girmek istediğinde 2FA devreye girer.
 */
export async function loginAction(
  email: string,
  password: string,
  turnstileToken: string
): Promise<LoginResult> {
  try {
    if (!email || !password) {
      return { success: false, error: "Email ve şifre gereklidir" };
    }

    // Turnstile doğrulama
    const headerStore = await headers();
    const remoteip = headerStore.get("x-forwarded-for") ?? headerStore.get("x-real-ip") ?? undefined;
    const captcha = await verifyTurnstile(turnstileToken, remoteip);
    if (!captcha.success) {
      return { success: false, error: captcha.error ?? "Bot doğrulaması başarısız" };
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await queryOne<{
      id: string;
      email: string;
      display_name: string;
      photo_url: string | null;
      role: string;
      password_hash: string;
      is_banned: boolean | null;
    }>(
      `SELECT id, email, display_name, photo_url, role, password_hash, is_banned
       FROM users WHERE LOWER(email) = $1 AND deleted_at IS NULL`,
      [cleanEmail]
    );

    if (!user) {
      return { success: false, error: "Email veya şifre hatalı" };
    }

    if (user.is_banned) {
      return { success: false, error: "Hesabınız engellenmiştir" };
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return { success: false, error: "Email veya şifre hatalı" };
    }

    // Her girişte 2FA durumu SIFIRLANIR — admin olmayan oturumlarda da
    // eski doğrulama çerezleri kalmamalı. `two_factor_verified` claim'i
    // bilinçli olarak eklenmez; admin /admin'e girince yeniden doğrular.
    const token = await createSessionCookie(user.id, {
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      photo_url: user.photo_url,
    });

    const cookieStore = await cookies();
    cookieStore.delete("xipsoft_admin_login_challenge");
    cookieStore.delete("xipsoft_admin_access");
    cookieStore.delete("xipsoft_2fa_verified");
    cookieStore.set("xipsoft_session", token, {
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

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        photo_url: user.photo_url,
        role: user.role,
      },
    };
  } catch (err) {
    console.error("[loginAction]", err);
    return { success: false, error: "Giriş sırasında bir hata oluştu" };
  }
}
