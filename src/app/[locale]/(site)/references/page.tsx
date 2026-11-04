import type { Metadata } from "next";
import { SITE_URL } from "@/config/brand.config";
import { buildPageMetadata } from "@/lib/seo-helpers";
import { getAllReferences } from "@/lib/db/references";
import ReferencesPageClient from "./ReferencesPageClient";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata(_props: PageProps): Promise<Metadata> {
  return buildPageMetadata({
    title: "Referanslarımız — 200+ Başarılı Proje | XipSoft",
    description:
      "Web, mobil, masaüstü yazılım ve siber güvenlik alanlarında tamamladığımız 200+ proje ve müşteri referansları. 15 yıllık tecrübe, 12 sektör.",
    canonicalPath: "/references",
    image: `${SITE_URL}/media/xipsoft-seo.webp`,
  });
}

export default async function ReferencesPage(_props: PageProps) {
  let dbReferences: Awaited<ReturnType<typeof getAllReferences>> = [];
  try {
    dbReferences = await getAllReferences(true);
  } catch {
    // DB erişilemezse boş liste ile render edilir
  }

  return <ReferencesPageClient dbReferences={dbReferences} />;
}
