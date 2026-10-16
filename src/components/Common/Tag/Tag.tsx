import { cn } from "@/utils";
import { checkIsFoundTag } from "@/utils/profileHelper";
import { MouseEvent, useCallback, useMemo } from "react";
import { X } from "lucide-react";

/* ── Curated accent palette — yalnızca marka tonları (mor + cyan) ── */
const TAg_PALETTE = [
  { bg: "#a78bfa", glow: "rgba(167,139,250,0.25)" },  // neon mor
  { bg: "#ddd6fe", glow: "rgba(34,211,238,0.25)" },   // cyan
  { bg: "#c4b5fd", glow: "rgba(196,181,253,0.25)" },  // mor (açık)
  { bg: "#67e8f9", glow: "rgba(103,232,249,0.25)" },  // cyan (açık)
  { bg: "#8b5cf6", glow: "rgba(139,92,246,0.25)" },   // mor (derin)
  { bg: "#06b6d4", glow: "rgba(6,182,212,0.25)" },    // cyan (derin)
] as const;

/* ── Deterministic hash → palette index from tag name ── */
const hashTag = (tag: string): number => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % TAg_PALETTE.length;
};

const Tag = ({
  tag,
  searchTag,
  bgColor: _bgColor,
  isShowClose = false,
  onClick,
}: {
  tag: string;
  searchTag: string;
  bgColor: string;
  isShowClose?: boolean;
  onClick?: (tag: string) => void;
}) => {
  const isTagActive = checkIsFoundTag(tag, searchTag);
  const accent = useMemo(() => TAg_PALETTE[hashTag(tag)]!, [tag]);

  const onClickTag = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      onClick?.(tag);
    },
    [onClick, tag]
  );

  return (
    <span
      onClick={onClickTag}
      className={cn(
        "tag-pill relative inline-flex items-center gap-1.5 cursor-pointer -display tracking-tight px-3 py-1.5 rounded-full mb-1 mr-[5px] select-none",
        "text-[10px] transition-all duration-200",
        isTagActive
          ? "text-white active:scale-95"
          : "bg-white/[0.06] text-zinc-400 hover:text-zinc-200 border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.1] active:scale-95"
      )}
      style={
        isTagActive
          ? {
              background: `linear-gradient(135deg, ${(accent?.bg ?? "#a78bfa")}cc, ${(accent?.bg ?? "#a78bfa")}88)`,
              boxShadow: `0 0 12px ${accent?.glow ?? "rgba(167,139,250,0.25)"}`,
              border: `1px solid ${(accent?.bg ?? "#a78bfa")}60`,
            }
          : undefined
      }
    >
      {/* Colored dot indicator */}
      <span
        className={cn(
          "inline-block w-1.5 h-1.5 rounded-full shrink-0",
          isTagActive ? "opacity-100" : "opacity-40"
        )}
        style={{ backgroundColor: accent.bg }}
      />

      {tag}

      {isShowClose && (
        <X className="w-3 h-3 opacity-70 hover:opacity-100 transition-opacity" />
      )}
    </span>
  );
};

export default Tag;
