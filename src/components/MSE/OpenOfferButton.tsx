"use client";

import { Zap } from "lucide-react";
import { teklifModal } from "@/components/Common/TeklifModal/TeklifModal";

export default function OpenOfferButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => teklifModal.open()}
      className="site-cta-primary relative px-8 py-4 font-black text-sm transition-all duration-300 hover:scale-[1.03]"
    >
      <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-80 pointer-events-none" />
      <Zap className="w-4 h-4 relative z-10 text-white" />
      <span className="relative z-10 text-white">{label}</span>
    </button>
  );
}