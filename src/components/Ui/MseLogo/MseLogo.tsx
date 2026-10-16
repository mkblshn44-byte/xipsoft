"use client";

import MseLink from "../MseLink/MseLink";
import Image from "next/image";
import { useEffect, useState } from "react";

const MseLogo = () => {
  // flipped: 10s sonra true, 20s sonra false
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const flipTimer = setTimeout(() => {
      setFlipped(true);
    }, 10000);

    const unflipTimer = setTimeout(() => {
      setFlipped(false);
    }, 20000);

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(unflipTimer);
    };
  }, []);

  return (
    <div className="flex items-center justify-center">
      <MseLink href="/">
        {/* CSS animasyonu — JS infinite loop kaldırıldı, TBT azaltıldı */}
        <div
          className="transition-transform duration-300 hover:scale-105"
          style={{ transform: flipped ? "scaleY(-1)" : "scaleY(1)", transition: "transform 0.6s ease-in-out" }}
        >
          <Image
            src="/media/logo.webp"
            alt="XipSoft"
            width={240}
            height={77}
            className="object-contain"
            style={{ height: "56px", width: "auto" }}
            sizes="(max-width: 768px) 174px, 240px"
            priority
            fetchPriority="high"
          />
        </div>
      </MseLink>
    </div>
  );
};

export default MseLogo;
