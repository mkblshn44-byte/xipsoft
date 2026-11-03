/**
 * Root 404 — /app/not-found.tsx
 * Next.js App Router: uygulama kökünde tanımlanan 404 sayfası.
 * (site) grubundaki not-found.tsx ile aynı deneyimi sunar.
 */
import type { Metadata } from "next";
import NotFoundClient from "@/app/[locale]/(site)/not-found";

export const metadata: Metadata = {
  title: "404 — Sayfa Bulunamadı",
  description: "Aradığınız sayfa kaldırılmış, taşınmış ya da hiç var olmamış olabilir.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundClient />;
}
