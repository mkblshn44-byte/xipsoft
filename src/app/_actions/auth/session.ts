"use server";

import { cookies } from "next/headers";
import { verifySessionCookie } from "@/lib/security";
import { queryOne } from "@/lib/db/pool";

export async function getMeAction(): Promise<any | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("xipsoft_session")?.value;
    if (!sessionToken) return null;

    const payload = await verifySessionCookie(sessionToken);
    if (!payload) return null;

    const userId = payload.sub || payload.id || payload.userId;
    if (!userId) return null;

    const user = await queryOne<any>(
      `SELECT id, uid, email, display_name, photo_url, role, rank_id, reputation, message_count,
              bio, website, location, job, branch, signature, is_banned, last_active, created_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    return user || null;
  } catch {
    return null;
  }
}

export async function logoutAction(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("xipsoft_session");
    cookieStore.delete("xipsoft_logged_in");
    cookieStore.delete("xipsoft_admin_access");
    cookieStore.delete("xipsoft_2fa_verified");
    cookieStore.delete("xipsoft_admin_login_challenge");
  } catch {
    // silent
  }
}
