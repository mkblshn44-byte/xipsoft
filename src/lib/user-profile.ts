/**
 * user-profile.ts — Genel kullanıcı profili sunucu veri katmanı.
 *
 * `/x/[nick]` yazar/profil sayfası artık sunucu tarafında render edilir; bu
 * sayede dönen HTML'de gerçek içerik bulunur (istemci iskeleti değil) ve sayfa
 * güvenle indekslenebilir. Aynı sorgu paylaşılan `unstable_cache` ile
 * önbelleklenir; metadata ve sayfa gövdesi tek DB isteğini paylaşır.
 */

import pool from "@/lib/database";
import { unstable_cache } from "next/cache";
import type { PublicUserProfile } from "@/types/user-profile";

/** Profil sayfasında gösterilen güvenli (public) kolonlar. */
const USER_PROFILE_SQL = `
  SELECT id, display_name, nick, photo_url, cover_url, bio, website, location,
         job, branch, signature, role, rank_id, is_banned, last_active, created_at,
         linkedin_url, github_url, twitter_url, expertise_area,
         years_experience, is_expert
    FROM users
   WHERE (
           LOWER(nick) = LOWER($1)
           OR (nick IS NULL AND LOWER(display_name) = LOWER($1))
         )
     AND deleted_at IS NULL
   LIMIT 1`;

interface RawUserProfileRow extends Omit<PublicUserProfile, "last_active" | "created_at"> {
  last_active: Date | null;
  created_at: Date;
}

const getCachedUserByNick = unstable_cache(
  async (nick: string): Promise<PublicUserProfile | null> => {
    const { rows } = await pool.query<RawUserProfileRow>(USER_PROFILE_SQL, [nick]);
    const row = rows[0];
    if (!row) return null;

    return {
      ...row,
      last_active: row.last_active ? row.last_active.toISOString() : null,
      created_at: row.created_at.toISOString(),
    };
  },
  ["public-user-by-nick"],
  { revalidate: 600, tags: ["user-profile"] },
);

/**
 * Nick (veya nick yoksa display_name) ile genel kullanıcı profilini çözer.
 *
 * **Hata politikası:** kayıt yoksa veya `DATABASE_URL` tanımlı değilse `null`
 * (fail-soft) döner. Çağıran taraf `null` durumunda `notFound()` çağırarak
 * gerçek 404 üretir — böylece Google "soft 404" (boş ama 200) görmez.
 */
export async function getPublicUserByNick(
  nick: string | null | undefined,
): Promise<PublicUserProfile | null> {
  const normalized = (nick ?? "").trim();
  if (!normalized) return null;
  if (!process.env.DATABASE_URL) return null;

  try {
    return await getCachedUserByNick(normalized);
  } catch (error) {
    console.error(`[user-profile] Failed to load nick "${normalized}":`, error);
    return null;
  }
}
