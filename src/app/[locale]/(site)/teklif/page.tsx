import type { Metadata } from "next";
import { SITE_URL } from "@/config/brand.config";
import TeklifLandingClient from "./TeklifLandingClient";

/**
 * `/teklif` — teklif isteği giriş noktası.
 *
 * Sitedeki tüm "Teklif Al" CTA'larının hedefi. Daha önce bu kök rota
 * tanımlı değildi ve 404 dönüyordu. robots.ts `/teklif`'i taramadan muaf
 * tuttuğu için sayfa indekslenmez; canonical yine de kendine işaret eder.
 */
export const metadata: Metadata = {
  title: "Ücretsiz Proje Teklifi Alın",
  description:
    "Web, mobil, masaüstü yazılım ve siber güvenlik projeleriniz için ücretsiz analiz ve sabit fiyatlı teklif. XipSoft ile projenizi birlikte planlayalım.",
  alternates: { canonical: `${SITE_URL}/teklif` },
  robots: { index: false, follow: true },
};

export default function TeklifPage() {
  return <TeklifLandingClient />;
}
