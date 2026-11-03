"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import XipIcon from "@/components/Ui/Icon";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // rAF throttle: kare başına tek durum güncellemesi (main-thread).
    let rafId = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      setVisible(window.scrollY > 400);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const scrollUp = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          onClick={scrollUp}
          initial={{ opacity: 0, scale: 0.6, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Yukarı çık"
          className="fixed right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center
            bg-white/[0.06] backdrop-blur-md
            border border-white/[0.12]
            text-zinc-400 hover:text-white
            shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]
            hover:shadow-[0_4px_24px_rgba(167, 139, 250,0.25),inset_0_1px_0_rgba(255,255,255,0.12)]
            hover:border-white/[0.22]
            transition-colors duration-200"
          style={{ bottom: 'max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom)))' }}
        >
          {/* Sagdan ısık */}
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: "linear-gradient(135deg, rgba(167, 139, 250,0.08) 0%, transparent 60%)" }} />
          <XipIcon name="arrow-up" glow="strong" className="w-4 h-4 relative z-10" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
