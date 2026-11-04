import type { Metadata } from "next";
import { SITE_URL } from "@/config/brand.config";
import { buildPageMetadata } from "@/lib/seo-helpers";
import { getServicesHubData } from "@/lib/services-hub";
import HizmetlerHubClient from "./HizmetlerHubClient";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata(_props: PageProps): Promise<Metadata> {
  return buildPageMetadata({
    title: "Yazılım & Teknoloji Hizmetleri — XipSoft",
    description:
      "Özel yazılım, web tasarım, mobil uygulama, masaüstü ERP, siber güvenlik ve SEO hizmetleri. İstanbul merkezli 15 yıllık deneyimle 200+ proje.",
    canonicalPath: "/hizmetler",
    image: `${SITE_URL}/media/xipsoft-seo.webp`,
  });
}

export default async function HizmetlerPage(_props: PageProps) {
  const { services, faq } = await getServicesHubData();
  return <HizmetlerHubClient services={services} faq={faq} />;
}
