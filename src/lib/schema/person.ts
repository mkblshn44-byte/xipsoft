/**
 * schema/person.ts — Yazar profili (Person, E-E-A-T) JSON-LD üreticisi.
 */

import { SITE_URL } from "@/lib/site-url";
import { SCHEMA_CONTEXT } from "./shared";

export interface PersonSchemaInput {
  nick: string;
  displayName: string;
  /** Kısa bio / açıklama */
  description?: string | null;
  /** Avatar / profil fotoğrafı URL */
  image?: string | null;
  /** İş unvanı, ör: "Senior Full-Stack Developer" */
  jobTitle?: string | null;
  /** Çalıştığı şirket / kuruluş */
  worksForName?: string | null;
  /** Toplam deneyim süresi (yıl) */
  yearsExperience?: number | null;
  /** Uzmanlık alanları, ör: ["Next.js", "SEO", "DevOps"] */
  knowsAbout?: string[] | string | null;
  /** Kayıt / üyelik tarihi */
  memberSince?: string | null;
  /** E-posta */
  email?: string | null;
  /** Web sitesi */
  websiteUrl?: string | null;
  /** Şehir / ülke */
  addressLocality?: string | null;
  /** Sosyal medya profilleri (LinkedIn, GitHub vb) — E-E-A-T sameAs */
  sameAs?: string[] | null;
  /** Aldığı ödüller veya sertifikalar */
  hasCertification?: string[] | null;
}

/**
 * Task 16 — Author Profile için geliştirilmiş Person (E-E-A-T) şeması.
 * Google yazar otoritesini değerlendirirken jobTitle, knowsAbout, sameAs,
 * yearsExperience ve hasOccupation alanlarını ağırlıklandırır.
 */
export function personSchema(profile: PersonSchemaInput) {
  const profileUrl = `${SITE_URL}/x/${profile.nick}`;
  const knowsAbout = Array.isArray(profile.knowsAbout)
    ? profile.knowsAbout
    : typeof profile.knowsAbout === "string" && profile.knowsAbout.length > 0
    ? [profile.knowsAbout]
    : undefined;

  const sameAs = Array.isArray(profile.sameAs) && profile.sameAs.length > 0
    ? profile.sameAs.filter((u) => u && u.length > 4)
    : undefined;

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Person",
    "@id": `${profileUrl}#person`,
    name: profile.displayName,
    url: profileUrl,
    image: profile.image || undefined,
    ...(profile.description && { description: profile.description }),
    ...(profile.email && { email: profile.email }),
    ...(profile.jobTitle && { jobTitle: profile.jobTitle }),
    ...(profile.addressLocality && {
      address: {
        "@type": "PostalAddress",
        addressLocality: profile.addressLocality,
      },
    }),
    ...(profile.websiteUrl && {
      sameAs: Array.from(new Set([...(sameAs ?? []), profile.websiteUrl])),
    }),
    ...(!profile.websiteUrl && sameAs && sameAs.length > 0 && { sameAs }),
    ...(knowsAbout && knowsAbout.length > 0 && { knowsAbout }),
    ...(profile.yearsExperience && profile.yearsExperience > 0 && {
      hasOccupation: {
        "@type": "Occupation",
        name: profile.jobTitle || "Software Professional",
        occupationLocation: profile.addressLocality || undefined,
        experienceInPlace: {
          "@type": "DefinedTerm",
          inDefinedTermSet: "Years of Experience",
          name: `${profile.yearsExperience}+ years`,
        },
      },
      alumniOf: profile.worksForName
        ? {
            "@type": "Organization",
            name: profile.worksForName,
          }
        : undefined,
    }),
    ...(profile.worksForName && !profile.yearsExperience && {
      worksFor: {
        "@type": "Organization",
        name: profile.worksForName,
      },
    }),
    ...(profile.memberSince && {
      foundingDate: profile.memberSince,
      dateCreated: profile.memberSince,
    }),
    ...(Array.isArray(profile.hasCertification) && profile.hasCertification.length > 0 && {
      hasCredential: profile.hasCertification.map((c) => ({
        "@type": "EducationalOccupationalCredential",
        name: c,
      })),
    }),
  };
}
