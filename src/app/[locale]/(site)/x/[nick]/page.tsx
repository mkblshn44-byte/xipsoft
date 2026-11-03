import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import APP_CONFIG, { DEFAULT_OG_IMAGE_URL, SITE_URL } from "@/config/brand.config";
import pool from "@/lib/db/pool";
import type { PublicUserProfile } from "@/types/user-profile";
import ProfilePageClient from "./ProfilePageClient";
import JsonLd from "@/components/seo/JsonLd";
import { personSchema } from "@/lib/schema/person";

interface ProfilePageProps {
  params: Promise<{ nick: string }>;
}

// generateMetadata ve sayfa gövdesi aynı DB isteğini paylaşır (React cache).
const getUser = cache((nick: string) => getPublicUserByNick(nick));

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

async function getPublicUserByNick(
  nick: string | null | undefined,
): Promise<PublicUserProfile | null> {
  const normalized = (nick ?? "").trim();
  if (!normalized || !process.env.DATABASE_URL) return null;
  try {
    return await getCachedUserByNick(normalized);
  } catch (error) {
    console.error(`[user-profile] Failed to load nick "${normalized}":`, error);
    return null;
  }
}

function displayNameOf(profile: { display_name: string | null; nick: string | null }, fallback: string) {
  return profile.display_name || profile.nick || fallback;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { nick } = await params;
  const profile = await getUser(nick);

  // Kayıt yok veya banlı → indekslenmez (sayfa da 404 döner).
  if (!profile || profile.is_banned) {
    return {
      title: "Kullanıcı Bulunamadı",
      robots: { index: false, follow: false },
    };
  }

  const handle = profile.nick ?? nick;
  const displayName = displayNameOf(profile, nick);
  const title = `${displayName} (@${handle})`;
  const bio = profile.bio?.trim();
  const description = (
    bio ||
    `${displayName} — XipSoft topluluğu profili. Yazılım, teknoloji ve dijital ürünler üzerine paylaşımlar.`
  ).slice(0, 160);
  const image = profile.photo_url || DEFAULT_OG_IMAGE_URL;
  const canonical = `${SITE_URL}/x/${handle}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    openGraph: {
      type: "profile",
      locale: "tr_TR",
      url: canonical,
      siteName: APP_CONFIG.title,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: displayName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { nick } = await params;
  const profile = await getUser(nick);

  // Sunucuda kayıt yoksa gerçek 404 döner — "boş ama 200" (soft 404) olmaz.
  if (!profile || profile.is_banned) notFound();

  const handle = profile.nick ?? nick;
  const displayName = displayNameOf(profile, nick);
  const sameAs = [profile.linkedin_url, profile.github_url, profile.twitter_url].filter(
    (url): url is string => Boolean(url && /^https?:\/\//.test(url)),
  );

  // E-E-A-T: Person şeması TEK kaynaktan (sunucu) üretilir.
  const schema = personSchema({
    nick: handle,
    displayName,
    description: profile.bio,
    image: profile.photo_url,
    jobTitle: profile.job,
    worksForName: "XipSoft",
    yearsExperience: profile.years_experience,
    knowsAbout: profile.expertise_area || profile.job || null,
    memberSince: profile.created_at,
    websiteUrl: profile.website,
    addressLocality: profile.location,
    sameAs: sameAs.length > 0 ? sameAs : null,
  });

  return (
    <>
      <JsonLd schemas={[schema]} id={`profile-${profile.id}`} />
      <ProfilePageClient initialProfile={profile} />
    </>
  );
}
