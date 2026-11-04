/**
 * /hizmetler/[...slug] — Hizmet detay ve hizmet×konum sayfaları.
 *
 * Tüm iş mantığı `ServiceContentPage` modülündedir; bu dosya yalnızca
 * Next.js'in beklediği `generateMetadata` ve `default export` sarmalayıcısını
 * sağlar.
 *
 * Desteklenen yollar:
 *   /hizmetler/[slug]            → hizmet detay sayfası
 *   /hizmetler/[slug]/[sehir]    → hizmet × şehir / ilçe sayfası
 *   /hizmetler/[slug]/...derin   → derin ağaç sayfası (ağaç DB'den açılır)
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  renderServiceContent,
  serviceContentMetadata,
} from "@/lib/service-content/ServiceContentPage";
import { serviceContentRequestFromTreePath } from "@/lib/service-content/request";
import { resolveContentPath } from "@/lib/content-tree";
import { NOINDEX_NOFOLLOW } from "@/lib/seo-helpers";

type Props = {
  params: Promise<{ locale: string; slug: string[] }>;
};

/** ISR: 1 saat — admin panelinden revalidateTag("services") ile anında tazelenir. */
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Kök dahil segmentler: ["hizmetler", ...slug]
  const raw = ["hizmetler", ...slug];

  // Kök catch-all'dan farklı olarak bu route her zaman hizmet zincirine aittir;
  // ağaç çözümlemesi yalnızca fallback için yapılır.
  const resolved = await resolveContentPath(raw).catch(() => null);
  const req = serviceContentRequestFromTreePath(raw, resolved ?? undefined);

  return serviceContentMetadata(req).catch(() => ({ robots: NOINDEX_NOFOLLOW }));
}

export default async function HizmetlerSlugPage({ params }: Props) {
  const { slug } = await params;
  if (!slug || slug.length === 0) notFound();

  const raw = ["hizmetler", ...slug];
  const resolved = await resolveContentPath(raw).catch(() => null);
  const req = serviceContentRequestFromTreePath(raw, resolved ?? undefined);

  return renderServiceContent(req);
}
