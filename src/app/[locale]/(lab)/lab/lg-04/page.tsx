import type { Metadata } from "next";
import "@/styles/lab/lg-04.css";
import Lg04Pricing from "@/components/Lab/Lg04Pricing";

/**
 * LAB — lg-04 önizlemesi.
 *
 * CSS olduğu gibi (`src/styles/lab/lg-04.css`), markup sözleşmesi
 * `src/components/Lab/Lg04Pricing.tsx` içinde.
 */

export const metadata: Metadata = {
  title: "lg-04 · Fiyatlandırma tablosu",
  robots: { index: false, follow: false },
};

export default function LabLg04Page() {
  return <Lg04Pricing />;
}
