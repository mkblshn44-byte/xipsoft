import type { Metadata } from "next";
import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";
import APP_CONFIG, { SITE_URL } from "@/config/brand.config";
import { getPageMeta } from "@/lib/page-content";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("login");
  return {
    title: meta?.title || APP_CONFIG.title,
    description: meta?.description || APP_CONFIG.description,
    robots: { index: false, follow: false },
    alternates: { canonical: `${SITE_URL}/login` },
  };
}

export default function LoginPage() {
  // useSearchParams CSR bailout → statik prerender için Suspense zorunlu
  return (
    <Suspense>
      <LoginPageClient />
    </Suspense>
  );
}
