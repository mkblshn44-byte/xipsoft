import type { Metadata } from "next";
import { 
  ShoppingCart, FileText, Users, Activity, Globe, Shield,
  TrendingUp, Clock, AlertTriangle
} from "lucide-react";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return <DashboardClient />;
}
