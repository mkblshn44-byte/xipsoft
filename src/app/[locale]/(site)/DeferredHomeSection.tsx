"use client";

/**
 * Anasayfa hero-altı bölümlerini render eder.
 *
 * ÖNEMLİ: Bölümler eskiden `next/dynamic({ ssr: false })` + IntersectionObserver
 * ile yalnızca tarayıcıda (scroll'da) yükleniyordu. Bu yüzden istemci JS
 * çalışmadığında (veya hydration başarısız olduğunda) sayfanın hero altı
 * tamamen boş kalıyordu — sunucu sadece gri placeholder basıyordu.
 *
 * Artık bölümler sunucuda da render edilir; giriş animasyonları JS yerine
 * CSS (`home-reveal`, bkz. src/styles/home-lcp.css) ile yapılır. Böylece
 * şablon/grid tasarımı DB ve JS'ten bağımsız olarak her zaman görünür.
 */
import CarouselSection from "@/components/MSE/CarouselSection";
import MmsweTypoSection from "@/components/MSE/MmsweTypoSection";
import MusteriYorumlari from "@/components/MSE/MusteriYorumlari";
import NelerYapabiliriz from "@/components/MSE/NelerYapabiliriz";
import TechStackSection from "@/components/MSE/TechStackSection";
import WhyXipsoft from "@/components/MSE/WhyXipsoft";

type HomeSection =
  | "carousel"
  | "services"
  | "why"
  | "tech-stack"
  | "testimonials"
  | "about";

export default function DeferredHomeSection({ section }: { section: HomeSection }) {
  switch (section) {
    case "carousel":
      return <CarouselSection />;
    case "services":
      return <NelerYapabiliriz />;
    case "why":
      return <WhyXipsoft />;
    case "tech-stack":
      return <TechStackSection />;
    case "testimonials":
      return <MusteriYorumlari />;
    case "about":
      return <MmsweTypoSection />;
  }
}
