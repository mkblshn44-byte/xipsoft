import type { Metadata } from "next";
import APP_CONFIG from "@/config/brand.config";
import { buildPageMetadata } from "@/lib/seo-helpers";
import { BASE_LOCALE, resolveContentPath } from "@/lib/content-tree";
import { buildContentTreeMetadata } from "@/components/ContentTree/ContentTreeViews";
import HomePageComponents from "./HomePageComponents";
import type { HomeHeroCopy } from "@/types/common";

export const dynamic = "force-dynamic";

type HomePageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const page = await resolveContentPath(["anasayfa"], locale);
  if (page) return buildContentTreeMetadata(page.node);

  return buildPageMetadata({
    title: APP_CONFIG.title,
    titleAbsolute: true,
    description: APP_CONFIG.description,
    canonicalPath: "/",
  });
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const page = await resolveContentPath(["anasayfa"], locale);
  const heroCopy = (page?.node.i18n?.[locale]?.hero ??
    page?.node.i18n?.[BASE_LOCALE]?.hero) as
    | Partial<HomeHeroCopy>
    | undefined;

  return <HomePageComponents heroCopy={heroCopy} />;
}
