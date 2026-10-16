import type { Metadata } from "next";
import SEOClient from "./SEOClient";

export const metadata: Metadata = {
  title: "SEO | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default function SEOPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <div>
          <h1 className="text-xl font-bold text-white">SEO Dashboard</h1>
          <p className="text-xs text-zinc-500">Site SEO durumu, performans ve denetim</p>
        </div>
      </div>
      <SEOClient />
    </div>
  );
}
