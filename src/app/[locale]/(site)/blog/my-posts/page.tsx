import PageTransitionWrapper from "@/components/Animate/PageTransitionWrapper/PageTransitionWrapper";
import APP_CONFIg from "@/config/brand.config";
import { SITE_URL } from "@/config/brand.config";
import { Metadata } from "next";
import MyPostsClient from "./MyPostsClient";
import { getServerActionContext } from "@/lib/api-guard";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "My Blogs",
  description: "Manage your Blogs.",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/blog/my-posts` },
};

export default async function MyPostsPage() {
  const context = await getServerActionContext();
  if (!context.isAuthenticated) redirect("/login?callbackUrl=/blog/my-posts");

  return (
    <PageTransitionWrapper>
      <MyPostsClient />
    </PageTransitionWrapper>
  );
}
