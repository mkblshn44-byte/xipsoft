import type { Metadata } from "next";
import AdminIPBlocklistClient from "./AdminIPBlocklistClient";

export const metadata: Metadata = {
  title: "IP Engelleme | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function AdminIPBlocklistPage() {
  return <AdminIPBlocklistClient />;
}
