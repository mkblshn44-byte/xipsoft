"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Cloudinary responsive URL seti.
 * Upload API'den dönen `urls` objesiyle eslesir.
 */
export interface ResponsiveUrls {
  thumb: string;    // ~200px  — thumbnail
  mobile: string;   // ~480px  — mobil
  tablet: string;   // ~900px  — tablet
  desktop: string;  // ~1600px — masaüstü
  original: string; // orijinal
}

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  fallback?: string;
  urls?: ResponsiveUrls;
  sizes?: string;
  /**
   * LCP (Above-the-fold) görseller için:
   * - IntersectionObserver atlanır (hemen render edilir)
   * - loading="eager" + fetchpriority="high" kullanılır
   * Madde 11: LCP ≤ 2,5sn hedefi için kullanılır.
   */
  priority?: boolean;
  /**
   * Görselin en/boy oranı — CLS önler. Örn: "16/9", "4/3", "1"
   * Madde 13: CLS ≤ 0,1 hedefi için kullanılır.
   */
  aspectRatio?: string;
}

const DEFAULT_SIZES =
  "(max-width: 480px) 480px, (max-width: 900px) 900px, 1600px";

export default function LazyImage({
  src,
  alt,
  className = "",
  style,
  width,
  height,
  fallback = "/placeholder.svg",
  urls,
  sizes = DEFAULT_SIZES,
  priority = false,
  aspectRatio,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // priority ise observer atla, hemen yükle
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || !imgRef.current) return; // priority görseller için observer gerekmez

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "300px 0px", threshold: 0.01 }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority]);

  const srcSet = urls
    ? [
        `${urls.mobile} 480w`,
        `${urls.tablet} 900w`,
        `${urls.desktop} 1600w`,
      ].join(", ")
    : undefined;

  const displaySrc = hasError ? fallback : src;
  const wrapperStyle: React.CSSProperties = {
    width,
    height,
    ...(aspectRatio && !height ? { aspectRatio } : {}),
    ...style,
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={wrapperStyle}
    >
      {!isLoaded && !priority && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
      )}

      {isInView && (
        <img
          src={displaySrc}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding={priority ? "sync" : "async"}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
          className={`w-full h-full object-cover ${
            priority
              ? "opacity-100"
              : `transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`
          }`}
        />
      )}
    </div>
  );
}
