import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTeklifByToken } from "@/lib/db/teklif";
import { toPublicTeklif } from "@/lib/teklif-shared";
import TeklifClient from "./TeklifClient";

// Teklif içeriği admin tarafından her an güncellenebilir → istekte üretilir.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teklif Detayı | XipSoft",
  robots: { index: false, follow: false },
};

export default async function TeklifPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Kayıt sunucuda çözülür; yoksa gerçek 404 döner (soft-404 / boş 200 olmaz).
  const teklif = await getTeklifByToken(token);
  if (!teklif) notFound();

  return <TeklifClient token={teklif.token} initial={toPublicTeklif(teklif)} />;
}
