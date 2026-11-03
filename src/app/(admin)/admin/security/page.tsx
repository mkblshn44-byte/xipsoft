import type { Metadata } from "next";
import AdminSecurityClient from "./AdminSecurityClient";

export const metadata: Metadata = {
  title: "Güvenlik | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function AdminSecurityPage() {
  return <AdminSecurityClient />;
}
