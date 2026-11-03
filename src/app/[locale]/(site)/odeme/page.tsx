import { Metadata } from "next";
import { Suspense } from "react";
import OdemeClient from "./OdemeClient";
import APP_CONFIG, { SITE_URL } from "@/config/brand.config";
import { getPageMeta } from "@/lib/page-content";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("odeme");
  return {
    title: meta?.title || APP_CONFIG.title,
    description: meta?.description || APP_CONFIG.description,
    robots: { index: false, follow: false },
    alternates: { canonical: `${SITE_URL}/odeme` },
  };
}

export default function OdemePage() {
  return <OdemeClient />;
}
