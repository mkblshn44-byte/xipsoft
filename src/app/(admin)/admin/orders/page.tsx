import type { Metadata } from "next";
import AdminOrdersClient from "./AdminOrdersClient";

export const metadata: Metadata = {
  title: "Siparişler | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function AdminOrdersPage() {
  return <AdminOrdersClient />;
}
