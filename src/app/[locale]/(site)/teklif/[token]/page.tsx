import type { Metadata } from "next";
import TeklifClient from "./TeklifClient";

export const metadata: Metadata = {
  title: 'Teklif Detayı | XipSoft',
  robots: { index: false, follow: false },
};

export default function TeklifPage() {
  return <TeklifClient />;
}
