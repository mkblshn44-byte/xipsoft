import type { Metadata } from "next";
import AutomationClient from "./AutomationClient";

export const metadata: Metadata = {
  title: "Otomasyon | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function AutomationPage() {
  return <AutomationClient />;
}
