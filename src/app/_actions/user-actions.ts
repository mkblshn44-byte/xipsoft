"use server";

import pool from "@/lib/db/pool";
import { getServerActionContext } from "@/lib/api-guard";

// Whitelist: kullanıcının güncelleyebilecegi alanlar — bunların dısındaki
// her key SQL column injection vektörüdür (ör: "password_hash", "role", "id").
const ALLOWED_PROFILE_COLUMNS = new Set([
  "display_name",
  "bio",
  "website",
  "location",
  "job",
  "branch",
  "linkedin_url",
  "github_url",
  "twitter_url",
  "expertise_area",
  "years_experience",
] as const);

type AllowedColumn = "display_name" | "bio" | "website" | "location" | "job" | "branch" | "linkedin_url" | "github_url" | "twitter_url" | "expertise_area" | "years_experience";

const COLUMN_LIMITS: Record<AllowedColumn, number> = {
  display_name: 60,
  bio:          500,
  website:      255,
  location:     100,
  job:          100,
  branch:       100,
  linkedin_url: 255,
  github_url:   255,
  twitter_url:  255,
  expertise_area: 100,
  years_experience: 2,
};

export async function getUserByNickAction(nick: string) {
  try {
    // nick veya display_name ile eslestir (büyük/küçük harf fark etmez)
    const result = await pool.query(
      `SELECT id, display_name, nick, email, photo_url, cover_url, bio, website, location, job, branch, role, rank_id, is_banned, last_active, created_at,
              linkedin_url, github_url, twitter_url, expertise_area, years_experience, is_expert
       FROM users
       WHERE (
         LOWER(nick) = LOWER($1)
         OR (nick IS NULL AND LOWER(display_name) = LOWER($1))
       )
         AND deleted_at IS NULL
       LIMIT 1`,
      [nick]
    );
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function updateUserProfileAction(data: {
  display_name?: string;
  bio?: string;
  website?: string;
  location?: string;
  job?: string;
  branch?: string;
  linkedin_url?: string;
  github_url?: string;
  twitter_url?: string;
  expertise_area?: string;
  years_experience?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await getServerActionContext();
    if (!ctx.isAuthenticated || !ctx.userId) {
      return { success: false, error: "giris yapmanız gerekiyor" };
    }
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, val] of Object.entries(data)) {
      if (val === undefined) continue;

      // ── Column Injection koruması ─────────────────────────────────────────
      // key dogrudan SQL sorgusuna giriyor; whitelist dısındaki her deger
      // (ör: "role", "password_hash", "id") kötü niyetli bir saldırı vektörüdür.
      // TypeScript tipi derleme sonrası silinir — bu çalısma zamanı kontrolü zorunludur.
      if (!ALLOWED_PROFILE_COLUMNS.has(key as AllowedColumn)) {
        return { success: false, error: `güncellenemeyen alan: ${key}` };
      }

      // Deger uzunluk limiti
      if (typeof val === "string") {
        const limit = COLUMN_LIMITS[key as AllowedColumn];
        if (val.length > limit) {
          return { success: false, error: `${key} en fazla ${limit} karakter olabilir.` };
        }

        // URL validation for social media fields
        if (key === "linkedin_url" && val && !val.match(/^https?:\/\/(www\.)?linkedin\.com\//)) {
          return { success: false, error: "LinkedIn URL geçersiz format" };
        }
        if (key === "github_url" && val && !val.match(/^https?:\/\/(www\.)?github\.com\//)) {
          return { success: false, error: "GitHub URL geçersiz format" };
        }
        if (key === "twitter_url" && val && !val.match(/^https?:\/\/(www\.)?(twitter|x)\.com\//)) {
          return { success: false, error: "Twitter/X URL geçersiz format" };
        }
      }

      // Validate years_experience is a positive number
      if (key === "years_experience" && typeof val === "number" && val < 0) {
        return { success: false, error: "Deneyim yılı 0 veya pozitif olmalı" };
      }

      fields.push(`${key} = $${i++}`);
      values.push(val);
    }

    if (fields.length === 0) return { success: true };
    values.push(ctx.userId);
    await pool.query(
      `UPDATE users SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${i}`,
      values
    );
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Sunucu hatası" };
  }
}
