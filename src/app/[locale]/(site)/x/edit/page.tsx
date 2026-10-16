import type { Metadata } from "next";
import EditProfileClient from "./EditProfileClient";
import { SITE_URL } from "@/config/brand.config";

export const metadata: Metadata = {
  title: 'Profili Düzenle | XipSoft',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/x/edit` },
};

export default function EditProfilePage() {
  return <EditProfileClient />;
}
