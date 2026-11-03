"use server";

import { cookies } from "next/headers";
import { verifySessionCookie } from "@/lib/security";
import { queryOne, query } from "@/lib/db/pool";
import bcrypt from "bcryptjs";
import argon2 from "argon2";

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith("$argon2")) {
    return argon2.verify(hash, password);
  }
  return bcrypt.compare(password, hash);
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("xipsoft_session")?.value;
    if (!sessionToken) return { success: false, error: "Oturum bulunamadı" };

    const payload = await verifySessionCookie(sessionToken);
    if (!payload) return { success: false, error: "Oturum süresi dolmuş" };

    const userId = payload.sub || payload.id || payload.userId;
    if (!userId) return { success: false, error: "Kullanıcı bulunamadı" };

    const user = await queryOne<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL",
      [userId]
    );

    if (!user) return { success: false, error: "Kullanıcı bulunamadı" };

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) return { success: false, error: "Mevcut şifre hatalı" };

    const newHash = await bcrypt.hash(newPassword, 12);
    await query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [newHash, userId]);

    return { success: true };
  } catch (err) {
    console.error("[changePassword]", err);
    return { success: false, error: "Şifre güncellenirken hata oluştu" };
  }
}
