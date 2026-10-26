import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTeklifByToken, getTeklifEvents } from "@/lib/db/teklif";
import { toPublicTeklif, type PublicTeklifEvent } from "@/lib/teklif-shared";
import TakipClient from "./TakipClient";

// Aşamalar admin onayıyla ilerler → sayfa istekte üretilir.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Süreç Takibi | XipSoft",
  robots: { index: false, follow: false },
};

export default async function TakipPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const teklif = await getTeklifByToken(token);
  if (!teklif) notFound();

  const events = await getTeklifEvents(teklif.id);
  // İç notlar müşteriye gönderilmez — yalnız aşama + zaman.
  const publicEvents: PublicTeklifEvent[] = events.map(({ status, created_at }) => ({
    status,
    created_at,
  }));

  return (
    <TakipClient token={teklif.token} initial={toPublicTeklif(teklif)} initialEvents={publicEvents} />
  );
}
