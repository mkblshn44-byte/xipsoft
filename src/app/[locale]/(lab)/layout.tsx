import type { Metadata } from "next";
import Link from "next/link";

/**
 * LAB — Bileşen laboratuvarı kabuğu
 *
 * `[locale]/(lab)` route grubu bilinçli olarak `(site)` DIŞINDA durur:
 * böylece demo sayfaları navbar / Homebar / starfield / modal katmanlarını
 * almaz, bileşenler kendi full-bleed zeminleriyle (ör. `.lg-04` min-height:100vh)
 * birebir görünür. Root layout yine devrede (html/body, globals.scss, provider'lar).
 */

export const metadata: Metadata = {
  title: "Bileşen Laboratuvarı",
  description: "Teslim alınan bileşenlerin iç önizleme sayfaları.",
  // İç önizleme: arama motorlarına kapalı
  robots: { index: false, follow: false },
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Sabit geri dönüş bağlantısı — bileşenlerin üstüne binmemesi için küçük ve köşede */}
      <Link
        href="/lab"
        className="fixed left-4 top-4 z-[60] inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur transition-colors hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        ← Tüm bileşenler
      </Link>
      {children}
    </>
  );
}
