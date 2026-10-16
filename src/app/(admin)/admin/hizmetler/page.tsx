import type { Metadata } from "next";
import HizmetlerClient from "./HizmetlerClient";

export const metadata: Metadata = {
  title: "Hizmetler | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function AdminHizmetlerPage() {
  return <HizmetlerClient />;
}
