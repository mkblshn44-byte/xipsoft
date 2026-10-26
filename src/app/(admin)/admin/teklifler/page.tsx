import type { Metadata } from "next";
import AdminTekliflerClient from "./AdminTekliflerClient";

export const metadata: Metadata = {
  title: "Teklifler | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function AdminTekliflerPage() {
  return <AdminTekliflerClient />;
}
