"use client";

import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { iconListData } from "@/data/IconList";
import { cn } from "@/utils";
import { BRAND_COLORS } from "@/config/brand.config";

// Her teknolojinin kendi orijinal renk vurgusu
const techColors: Record<string, { primary: string; secondary: string; glow: string }> = {
  HTML:         { primary: "#E34F26", secondary: "#F06529", glow: "#E34F2680" },
  CSS:          { primary: "#1572B6", secondary: "#33A9DC", glow: "#1572B680" },
  JS:           { primary: "#F7DF1E", secondary: "#F0DB4F", glow: "#F7DF1E80" },
  NodeJs:       { primary: "#339933", secondary: "#68A063", glow: "#33993380" },
  Android:      { primary: "#3DDC84", secondary: "#A4C639", glow: "#3DDC8480" },
  Flutter:      { primary: "#54C5F8", secondary: "#01579B", glow: "#54C5F880" },
  Python:       { primary: "#3776AB", secondary: "#FFD43B", glow: "#3776AB80" },
  Laravel:      { primary: "#FF2D20", secondary: "#FB503B", glow: "#FF2D2080" },
  Angular:      { primary: "#DD0031", secondary: "#C3002F", glow: "#DD003180" },
  Docker:       { primary: "#2496ED", secondary: "#0DB7ED", glow: "#2496ED80" },
  React:        { primary: "#61DAFB", secondary: "#00D8FF", glow: "#61DAFB80" },
  Electron:     { primary: "#47848F", secondary: "#9FEAF9", glow: "#47848F80" },
  Vue:          { primary: "#4FC08D", secondary: "#35495E", glow: "#4FC08D80" },
  Sass:         { primary: "#CC6699", secondary: "#BF4080", glow: "#CC669980" },
  Amplify:      { primary: "#FF9900", secondary: "#FF6600", glow: "#FF990080" },
  Amazon:       { primary: "#FF9900", secondary: "#232F3E", glow: "#FF990080" },
  Stencil:      { primary: "#FFFFFF", secondary: "#CCCCCC", glow: "#FFFFFF40" },
  github:       { primary: "#F0F6FC", secondary: "#8B949E", glow: "#F0F6FC40" },
  gitlab:       { primary: "#FC6D26", secondary: "#E24329", glow: "#FC6D2680" },
  Figma:        { primary: "#F24E1E", secondary: "#FF7262", glow: "#F24E1E80" },
  Octocat:      { primary: "#F0F6FC", secondary: "#8B949E", glow: "#F0F6FC40" },
  Bootstrap:    { primary: "#7952B3", secondary: "#563D7C", glow: "#7952B380" },
  Npm:          { primary: "#CB3837", secondary: "#CC3534", glow: "#CB383780" },
  Pwa:          { primary: "#5A0FC8", secondary: "#8B5CF6", glow: "#5A0FC880" },
  WebComponent: { primary: "#29ABE2", secondary: "#005C97", glow: "#29ABE280" },
  Stackoverflow:{ primary: "#F48024", secondary: "#BCBBBB", glow: "#F4802480" },
  Vercel:       { primary: "#FFFFFF", secondary: "#CCCCCC", glow: "#FFFFFF40" },
};

const fallbackColors = { primary: BRAND_COLORS.secondary, secondary: BRAND_COLORS.primary, glow: `${BRAND_COLORS.secondary}80` };

// --- 3D Icon Card ---
const IconCard = ({
  item,
  index,
  isInView,
}: {
  item: (typeof iconListData)[number];
  index: number;
  isInView: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const colors = techColors[item.title] ?? fallbackColors;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.75, rotateX: -20 }}
      animate={
        isInView
          ? { opacity: 1, y: 0, scale: 1, rotateX: 0 }
          : {}
      }
      transition={{
        duration: 0.8,
        delay: 0.08 + index * 0.045,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative"
      style={{ perspective: "800px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Outer glow bloom */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1.6 : 1.2,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          background: `radial-gradient(ellipse at center, ${colors.glow}, transparent 65%)`,
          filter: "blur(16px)",
          zIndex: 0,
        }}
      />

      {/* Card wrapper with 3D tilt */}
      <motion.div
        className="relative"
        animate={{
          rotateX: isHovered ? -8 : 0,
          rotateY: isHovered ? 6 : 0,
          translateY: isHovered ? -10 : 0,
          translateZ: isHovered ? 20 : 0,
          scale: isHovered ? 1.08 : 1,
        }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: "preserve-3d", zIndex: 1 }}
      >
        {/* === CARD BODY === */}
        <div
          className={cn(
            "relative flex flex-col items-center gap-3.5 cursor-pointer",
            "w-[88px] sm:w-[100px]"
          )}
        >
          {/* Icon Box */}
          <div className="relative">
            {/* gradient border ring */}
            <motion.div
              className="absolute -inset-[1.5px] rounded-2xl"
              animate={{ opacity: isHovered ? 1 : 0.35 }}
              transition={{ duration: 0.4 }}
              style={{
                background: `linear-gradient(135deg, ${colors.primary}cc, ${colors.secondary}55, transparent 80%)`,
                borderRadius: "18px",
              }}
            />

            {/* glass card */}
            <div
              className={cn(
                "relative w-[72px] h-[72px] sm:w-[82px] sm:h-[82px] rounded-[16px] flex justify-center items-center overflow-hidden",
                "backdrop-blur-xl"
              )}
              style={{
                background: isHovered
                  ? `linear-gradient(145deg, ${colors.primary}22, ${colors.secondary}12, rgba(255,255,255,0.04))`
                  : "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
                border: `1px solid ${isHovered ? colors.primary + "50" : "rgba(255,255,255,0.08)"}`,
                boxShadow: isHovered
                  ? `0 8px 32px ${colors.glow}, 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)`
                  : `0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`,
                transition: "background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease",
              }}
            >
              {/* Inner specular highlight */}
              <div
                className="absolute top-0 left-0 right-0 h-1/2 rounded-t-[16px] pointer-events-none"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)",
                }}
              />

              {/* Bottom inner shadow for depth */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1/3 rounded-b-[16px] pointer-events-none"
                style={{
                  background: "linear-gradient(0deg, rgba(0,0,0,0.25) 0%, transparent 100%)",
                }}
              />

              {/* Radial glow inside box */}
              <motion.div
                className="absolute inset-0 rounded-[16px] pointer-events-none"
                animate={{ opacity: isHovered ? 0.6 : 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${colors.primary}30, transparent 65%)`,
                }}
              />

              {/* Icon */}
              <motion.div
                animate={{
                  scale: isHovered ? 1.18 : 1,
                  filter: isHovered
                    ? `drop-shadow(0 0 8px ${colors.primary}cc)`
                    : "drop-shadow(0 0 0px transparent)",
                }}
                transition={{ duration: 0.35 }}
              >
                <item.icon
                  className="w-8 h-8 sm:w-9 sm:h-9 relative z-10"
                  style={{
                    color: isHovered ? colors.primary : "rgba(180,180,180,0.75)",
                    transition: "color 0.35s ease",
                  }}
                />
              </motion.div>

              {/* Top-left corner accent line */}
              <motion.div
                className="absolute top-[6px] left-[6px] w-3 h-3 pointer-events-none"
                animate={{ opacity: isHovered ? 0.9 : 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  borderTop: `1.5px solid ${colors.primary}cc`,
                  borderLeft: `1.5px solid ${colors.primary}cc`,
                  borderRadius: "2px 0 0 0",
                }}
              />
              {/* Bottom-right corner accent line */}
              <motion.div
                className="absolute bottom-[6px] right-[6px] w-3 h-3 pointer-events-none"
                animate={{ opacity: isHovered ? 0.9 : 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  borderBottom: `1.5px solid ${colors.secondary}cc`,
                  borderRight: `1.5px solid ${colors.secondary}cc`,
                  borderRadius: "0 0 2px 0",
                }}
              />
            </div>

            {/* Accent spark dot */}
            <motion.div
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full pointer-events-none"
              animate={{
                opacity: isHovered ? 1 : 0,
                scale: isHovered ? 1 : 0.3,
              }}
              transition={{ duration: 0.3 }}
              style={{
                background: colors.primary,
                boxShadow: `0 0 8px 2px ${colors.glow}`,
              }}
            />
          </div>

          {/* Label */}
          <motion.span
            className="text-[11px] font-medium tracking-widest uppercase select-none"
            animate={{ color: isHovered ? colors.primary : "rgba(120,120,130,1)" }}
            transition={{ duration: 0.35 }}
            style={{
              textShadow: isHovered ? `0 0 12px ${colors.glow}` : "none",
            }}
          >
            {item.title}
          </motion.span>

          {/* Colored underline bar */}
          <motion.div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] rounded-full pointer-events-none"
            animate={{
              width: isHovered ? "60%" : "0%",
              opacity: isHovered ? 1 : 0,
            }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{
              background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)`,
              boxShadow: `0 0 8px ${colors.glow}`,
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

// === MAIN COMPONENT ===

const LanguageIconSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.15, once: true });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const xTransform = useTransform(scrollYProgress, [0, 0.1, 1], [0, 0, 400]);

  return (
    <div
      ref={ref}
      className="relative py-6 w-full"
      style={{ overflowX: "clip", overflowY: "visible" }}
    >
      {/* Subtle background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 80%, rgba(34,211,238,0.04), transparent 70%)",
        }}
      />

      {/* Scroll-driven horizontal translate — overflow-y stays visible for 3D hover */}
      <motion.div
        className="relative z-10"
        style={{ translateX: xTransform }}
      >
        <div className="flex flex-row gap-4 sm:gap-5 px-4 py-4">
          {iconListData.map((item, index) => (
            <IconCard
              key={item.title}
              item={item}
              index={index}
              isInView={isInView}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default LanguageIconSection;
