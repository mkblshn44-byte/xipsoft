"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Navbar from "@/components/Common/Navbar/Navbar";
import Footer from "@/components/Common/Footer/Footer";

const AuctionBanner = dynamic(() => import("@/components/Common/AuctionBanner/AuctionBanner").then(m => m.AuctionBanner));
const Homebar = dynamic(() => import("@/components/Common/Homebar/Homebar"));

export default function SiteLayoutGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const normalizedPathname = pathname.replace(/^\/(tr|en)(?=\/|$)/, "");
  const isMaintenance = normalizedPathname === "/maintenance" || normalizedPathname.startsWith("/maintenance/");
  const isAuthPage = normalizedPathname === "/login" || normalizedPathname === "/register";
  const isHome = normalizedPathname === "/" || normalizedPathname === "";

  return (
    <>
      {!isMaintenance && !isAuthPage && (
        <>
          <AuctionBanner />
          {/* Semantic HTML: Navbar <header> içinde — tüm sayfalarda tek tip global menü.
              Anasayfa dahil tüm sayfalarda aynı koyu temalı header kullanılır.
              Hero bileşenlerinde pt-24/pt-32 ile navbar yüksekliği telafi edilir. */}
          <header role="banner">
            <Navbar />
          </header>
        </>
      )}
      <main
        id="main-content"
        className={
          isAuthPage
            ? ""
            : isHome
            ? "min-h-[calc(100vh-142px)]"
            : "min-h-[calc(100vh-142px)] pt-24"
        }
      >
        {children}
      </main>
      {!isMaintenance && !isAuthPage && <Footer />}
      {!isMaintenance && !isAuthPage && <Homebar />}
    </>
  );
}
