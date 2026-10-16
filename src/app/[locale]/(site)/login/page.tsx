import type { Metadata } from "next";
import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";
import APP_CONFIg, { SITE_URL } from "@/config/brand.config";
import { getPageMeta } from "@/lib/page-content";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("login");
  return {
    title: meta?.title || APP_CONFIg.title,
    description: meta?.description || APP_CONFIg.description,
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
