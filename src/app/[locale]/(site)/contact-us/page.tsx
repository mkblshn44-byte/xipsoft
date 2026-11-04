import type { Metadata } from "next";
import { SITE_URL } from "@/config/brand.config";
import { buildPageMetadata } from "@/lib/seo-helpers";
import ContactPageClient from "./ContactPageClient";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "İletişim — XipSoft Yazılım & Teknoloji",
    description:
      "Proje fikrinizi paylaşın, 24 saat içinde ücretsiz teklifinizi alın. İstanbul merkezli XipSoft yazılım ekibi ile WhatsApp, e-posta veya telefon üzerinden iletişime geçin.",
    canonicalPath: "/contact-us",
    image: `${SITE_URL}/media/xipsoft-seo.webp`,
  });
}

export default function ContactUsPage() {
  return <ContactPageClient />;
}
