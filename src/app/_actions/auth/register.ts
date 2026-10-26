"use server";

import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db/pool";
import { z } from "zod";
import { verifyTurnstile } from "@/lib/turnstile";

const IS_LOCAL_DEV = process.env.NODE_ENV === "development";

const RegisterSchema = z.object({
  display_name: z.string().min(2, "İsim en az 2 karakter olmalıdır").max(50),
  email: z.string().email("Geçerli bir email girin"),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır")
    .max(72, "Şifre çok uzun"),
});

interface RegisterResult {
  success: boolean;
  error?: string;
}

export async function registerAction(
  display_name: string,
  email: string,
  password: string,
  turnstileToken: string
): Promise<RegisterResult> {
  try {
    if (!IS_LOCAL_DEV) {
      if (!turnstileToken) {
        return { success: false, error: "Bot doğrulaması eksik" };
      }
      const headerStore = await headers();
      const remoteip = headerStore.get("x-forwarded-for") ?? headerStore.get("x-real-ip") ?? undefined;
      const captcha = await verifyTurnstile(turnstileToken, remoteip);
      if (!captcha.success) {
        return { success: false, error: captcha.error ?? "Bot doğrulaması başarısız" };
      }
    }

    const parsed = RegisterSchema.safeParse({ display_name, email, password });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues?.[0]?.message || "Geçersiz form verisi" };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = display_name.trim();

    // Email zaten kayıtlı mı?
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [cleanEmail]
    );

    if (existing) {
      return { success: false, error: "Bu email adresi zaten kullanılıyor" };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await query(
      `INSERT INTO users (email, display_name, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, 'user', NOW(), NOW())`,
      [cleanEmail, cleanName, passwordHash]
    );

    return { success: true };
  } catch (err) {
    console.error("[registerAction]", err);
    return { success: false, error: "Kayıt sırasında bir hata oluştu" };
  }
}
