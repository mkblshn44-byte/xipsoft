import type { Metadata } from "next";
import RegisterPageClient from "./RegisterPageClient";
import APP_CONFIG, { SITE_URL } from "@/config/brand.config";
import { getPageMeta } from "@/lib/page-content";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("register");
  return {
    title: meta?.title || APP_CONFIG.title,
    description: meta?.description || APP_CONFIG.description,
    robots: { index: false, follow: false },
    alternates: { canonical: `${SITE_URL}/register` },
  };
}

export default function RegisterPage() {
  return <RegisterPageClient />;
}
