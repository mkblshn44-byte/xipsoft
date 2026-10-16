import PageTransitionWrapper from "@/components/Animate/PageTransitionWrapper/PageTransitionWrapper";
import APP_CONFIg from "@/config/brand.config";
import { SITE_URL } from "@/config/brand.config";
import { Metadata } from "next";
import BlogWriteClient from "./BlogWriteClient";
import { getServerActionContext } from "@/lib/api-guard";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Write",
  description: "Write a new Blog post for the community.",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/blog/write` },
};

export default async function BlogWritePage() {
  const context = await getServerActionContext();
  if (!context.isAuthenticated) redirect("/login?callbackUrl=/blog/write");

  return (
    <PageTransitionWrapper>
      <BlogWriteClient />
    </PageTransitionWrapper>
  );
}
