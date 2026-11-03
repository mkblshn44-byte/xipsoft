import XipSoftTypoSection from "@/components/MSE/XipSoftTypoSection";

// Geliştirme/taslak sayfası: metadata'sız bırakmak kök layout'un başlık ve
// açıklamasını miras alıp dizine girmesine yol açıyordu (kopya içerik sinyali).
export const metadata = { robots: { index: false, follow: false } };

export default function TestNeonPage() {
  return (
    <div className="min-h-screen bg-space-950">
      <XipSoftTypoSection />
    </div>
  );
}
