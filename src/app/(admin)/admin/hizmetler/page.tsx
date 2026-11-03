import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Hizmetler | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function AdminHizmetlerPage() {
  redirect("/admin/cms/content-tree");
}
