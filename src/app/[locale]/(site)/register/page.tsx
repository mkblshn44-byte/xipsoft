import type { Metadata } from "next";
import RegisterPageClient from "./RegisterPageClient";
import APP_CONFIg, { SITE_URL } from "@/config/brand.config";
import { getPageMeta } from "@/lib/page-content";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("register");
  return {
    title: meta?.title || APP_CONFIg.title,
    description: meta?.description || APP_CONFIg.description,
    robots: { index: false, follow: false },
    alternates: { canonical: `${SITE_URL}/register` },
  };
}

export default function RegisterPage() {
  return <RegisterPageClient />;
}
