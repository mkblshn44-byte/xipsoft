"use client";
import { PropsWithChildren, useState, useEffect } from "react";
import { motion } from "motion/react";
import { cn } from "@/utils";

type TPageTransitionWrapper = PropsWithChildren<{}>;

const PageTransitionWrapper: React.FC<TPageTransitionWrapper> = ({
  children,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  // Mobilde animasyonu atla — sadece children döndür
  if (isMobile) {
    return (
      <div className={cn("min-h-screenHeightWithoutHeader relative")}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn("min-h-screenHeightWithoutHeader relative")}
    >
      {children}
    </motion.div>
  );
};

export default PageTransitionWrapper;
