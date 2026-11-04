import type { Metadata } from "next";
import { SITE_URL } from "@/config/brand.config";
import { buildPageMetadata } from "@/lib/seo-helpers";
import { BASE_LOCALE, resolveContentPath } from "@/lib/content-tree";
import { buildContentTreeMetadata } from "@/components/ContentTree/ContentTreeViews";
import AboutPageClient from "./AboutPageClient";
import type { HomeHeroCopy } from "@/types/common";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const page = await resolveContentPath(["hakkimizda"], locale);
  if (page) return buildContentTreeMetadata(page.node);

  return buildPageMetadata({
    title: "Hakkımızda — XipSoft Yazılım & Teknoloji",
    description:
      "2010'dan bu yana web, mobil, masaüstü, siber güvenlik ve dijital pazarlama alanlarında 200'den fazla proje tamamladık. İstanbul merkezli yazılım şirketi.",
    canonicalPath: "/hakkimizda",
    image: `${SITE_URL}/media/xipsoft-seo.webp`,
  });
}

export default async function HakkimizdaPage({ params }: PageProps) {
  const { locale } = await params;
  const page = await resolveContentPath(["hakkimizda"], locale);

  const heroCopy = (page?.node.i18n?.[locale]?.hero ??
    page?.node.i18n?.[BASE_LOCALE]?.hero) as Partial<HomeHeroCopy> | undefined;

  const sections = (page?.node.i18n?.[locale]?.sections ??
    page?.node.i18n?.[BASE_LOCALE]?.sections) as
    | import("./AboutPageClient").AboutSections
    | undefined;

  return <AboutPageClient heroCopy={heroCopy} sections={sections} />;
}
