import type { Metadata } from "next";
import AdminCommentsClient from "./AdminCommentsClient";

export const metadata: Metadata = {
  title: "Yorumlar | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function AdminCommentsPage() {
  return <AdminCommentsClient />;
}