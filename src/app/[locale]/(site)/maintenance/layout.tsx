import type { Metadata } from "next";
import APP_CONFIG from "@/config/brand.config";
import { getPageMeta } from "@/lib/page-content";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getPageMeta("maintenance");
  return {
    title: meta?.title || APP_CONFIG.title,
    description: meta?.description || APP_CONFIG.description,
    robots: { index: false, follow: false },
  };
}

/**
 * Bakım sayfası için minimal layout.
 * Root layout'taki navbar, footer, cart vb. bilesenler gösterilmez.
 * Ancak global CSS (globals.scss, noise overlay vb.) root layout üzerinden gelir.
 */
export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
