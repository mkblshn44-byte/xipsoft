import type { Metadata } from "next";
import RedirectsClient from "./RedirectsClient";

export const metadata: Metadata = {
  title: "Yönlendirmeler | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function RedirectsPage() {
  return <RedirectsClient />;
}