import type { Metadata } from "next";
import AdminMonitoringClient from "./AdminMonitoringClient";

export const metadata: Metadata = {
  title: "İzleme | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function AdminMonitoringPage() {
  return <AdminMonitoringClient />;
}
