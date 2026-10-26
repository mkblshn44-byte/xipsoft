import dynamic from "next/dynamic";
import styles from "@/styles/styles";
import { cn } from "@/utils";
import AnalyticsScripts from "@/components/Common/AnalyticsScripts";
import SiteStarfield from "@/components/Common/SiteStarfield/SiteStarfield";
import SiteLayoutGuard from "./SiteLayoutGuard";
import TeklifModalHost from "@/components/Common/TeklifModal/TeklifModalHost";

const ScrollToTop       = dynamic(() => import("@/components/Common/ScrollToTop/ScrollToTop"));
const CartSidebar       = dynamic(() => import("@/components/Cart/CartSidebar"));
const DeviceTracker     = dynamic(() => import("@/components/Common/DeviceTracker/DeviceTracker"));
const AdSenseConsent    = dynamic(() => import("@/components/Common/AdSenseConsent/AdSenseConsent"));
const GoogleAdSense     = dynamic(() => import("@/components/Common/GoogleAdSense/GoogleAdSense"));
const WebVitalsReporter = dynamic(() => import("@/components/Common/WebVitalsReporter"));

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(styles.gradient, "site-ambient-led site-headings text-zinc-200")}
    >
      {/* Site geneli sabit yıldız katmanı — opak zeminin üstünde,
          içeriğin arkasında (bkz. styles.gradient `isolate`). */}
      <SiteStarfield />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-zinc-900 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:border focus:border-white/20 focus:shadow-xl"
      >
        Ana içeriğe geç
      </a>

      <SiteLayoutGuard>
        {children}
      </SiteLayoutGuard>

      <div suppressHydrationWarning>
        <TeklifModalHost />
        <CartSidebar />
        <ScrollToTop />
        <DeviceTracker />
        <AdSenseConsent />
        <GoogleAdSense />
        <WebVitalsReporter />
        <AnalyticsScripts />
      </div>
    </div>
  );
}
