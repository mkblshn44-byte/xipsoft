import type { Metadata } from "next";
import SiteFaqClient from "./SiteFaqClient";

export const metadata: Metadata = {
  title: "Site SSS | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function SiteFaqPage() {
  return <SiteFaqClient />;
}
