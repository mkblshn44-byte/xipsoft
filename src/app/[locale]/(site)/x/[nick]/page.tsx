import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import APP_CONFIg, { SITE_URL } from "@/config/brand.config";
import ProfilePageClient from "./ProfilePageClient";
import JsonLd from "@/components/seo/JsonLd";
import { personSchema } from "@/lib/schema-helpers";
import { getPublicUserByNick } from "@/lib/user-profile";

interface ProfilePageProps {
  params: Promise<{ nick: string }>;
}

// generateMetadata ve sayfa gövdesi aynı DB isteğini paylaşır (React cache).
const getUser = cache((nick: string) => getPublicUserByNick(nick));

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
  const image = profile.photo_url || `${SITE_URL}/images/xipsoft-seo.png`;
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
      siteName: APP_CONFIg.title,
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
