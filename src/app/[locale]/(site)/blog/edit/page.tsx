import PageTransitionWrapper from "@/components/Animate/PageTransitionWrapper/PageTransitionWrapper";
import APP_CONFIg from "@/config/brand.config";
import { SITE_URL } from "@/config/brand.config";
import { Metadata } from "next";
import BlogEditClient from "./BlogEditClient";
import { getServerActionContext } from "@/lib/api-guard";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Edit Blog",
  description: "Edit your Blog.",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/blog/edit` },
};

export default async function BlogEditPage() {
  const context = await getServerActionContext();
  if (!context.isAuthenticated) redirect("/login?callbackUrl=/blog/edit");

  return (
    <PageTransitionWrapper>
      <BlogEditClient />
    </PageTransitionWrapper>
  );
}
