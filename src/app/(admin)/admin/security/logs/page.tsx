import type { Metadata } from "next";
import SecurityLogsClient from "./SecurityLogsClient";

export const metadata: Metadata = {
  title: "Günlükler | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function SecurityLogsPage() {
  return <SecurityLogsClient />;
}
