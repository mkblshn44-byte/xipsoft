import type { Metadata } from "next";
import AdminSecurityClient from "./security/AdminSecurityClient";

export const metadata: Metadata = {
  title: "Güvenlik | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function AdminSecurityPage() {
  return <AdminSecurityClient />;
}
