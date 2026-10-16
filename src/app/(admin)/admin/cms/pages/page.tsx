import type { Metadata } from "next";
import AdminPageContentClient from "./AdminPageContentClient";

export const metadata: Metadata = {
  title: "Sayfalar | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function PagesListPage() {
  return <AdminPageContentClient />;
}
