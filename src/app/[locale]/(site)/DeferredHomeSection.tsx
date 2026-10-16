"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ServicesSection = dynamic(() => import("@/components/MSE/NelerYapabiliriz"), {
  ssr: false,
  loading: () => <GridSkeleton count={6} />,
});
const CarouselSection = dynamic(() => import("@/components/MSE/CarouselSection"), {
  ssr: false,
  loading: () => <GridSkeleton count={3} />,
});
const TechStackSection = dynamic(() => import("@/components/MSE/TechStackSection"), {
  ssr: false,
  loading: () => <GridSkeleton count={6} />,
});
const TestimonialsSection = dynamic(() => import("@/components/MSE/MusteriYorumlari"), {
  ssr: false,
  loading: () => <GridSkeleton count={4} />,
});
const LanguageIconSection = dynamic(() => import("@/components/MSE/LanguageIconSection"), {
  ssr: false,
  loading: () => <div className="h-96 rounded-2xl bg-zinc-800/50" />,
});
const AboutSection = dynamic(() => import("@/components/MSE/MmsweTypoSection"), {
  ssr: false,
  loading: () => <div className="h-64 rounded-2xl bg-zinc-800/50" />,
});
const WhySection = dynamic(() => import("@/components/MSE/WhyXipsoft"), {
  ssr: false,
  loading: () => <div className="h-80 rounded-2xl bg-zinc-800/50" />,
});

type HomeSection =
  | "carousel"
  | "services"
  | "why"
  | "tech-stack"
  | "testimonials"
  | "languages"
  | "about";

function GridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-48 rounded-2xl bg-zinc-800/50" />
      ))}
    </div>
  );
}

function SectionContent({ section }: { section: HomeSection }) {
  switch (section) {
    case "carousel":
      return <CarouselSection />;
    case "services":
      return <ServicesSection />;
    case "why":
      return <WhySection />;
    case "tech-stack":
      return <TechStackSection />;
    case "testimonials":
      return <TestimonialsSection />;
    case "languages":
      return <LanguageIconSection />;
    case "about":
      return <AboutSection />;
  }
}

export default function DeferredHomeSection({ section }: { section: HomeSection }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {shouldRender ? (
        <SectionContent section={section} />
      ) : (
        <div aria-hidden="true">
          {section === "carousel" && <GridSkeleton count={3} />}
          {section === "services" && <GridSkeleton count={6} />}
          {section === "why" && <div className="h-80 rounded-2xl bg-zinc-800/50" />}
          {section === "tech-stack" && <GridSkeleton count={6} />}
          {section === "testimonials" && <GridSkeleton count={4} />}
          {section === "languages" && <div className="h-96 rounded-2xl bg-zinc-800/50" />}
          {section === "about" && <div className="h-64 rounded-2xl bg-zinc-800/50" />}
        </div>
      )}
    </div>
  );
}
