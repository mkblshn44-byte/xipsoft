import { motion } from "motion/react";
import { FileText, ArrowLeft } from "lucide-react";
import MseLink from "@/components/Ui/MseLink/MseLink";
import TitleText from "@/components/Common/TitleText/TitleText";

export function BlogLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-obsidian pt-24 pb-20 px-5">
      <div className="max-w-3xl mx-auto animate-pulse space-y-6">
        <div className="flex items-center justify-between mb-10">
          <div className="h-4 w-20 bg-zinc-800 rounded" />
          <div className="h-7 w-16 bg-zinc-800 rounded-lg" />
        </div>
        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.015] p-6 md:p-8 space-y-4">
          <div className="flex gap-3">
            <div className="h-3 w-16 bg-zinc-800 rounded" />
            <div className="h-3 w-24 bg-zinc-800 rounded" />
            <div className="h-3 w-14 bg-zinc-800 rounded" />
          </div>
          <div className="h-8 w-3/4 bg-zinc-800 rounded" />
          <div className="h-4 w-full bg-zinc-800 rounded" />
          <div className="h-4 w-2/3 bg-zinc-800 rounded" />
          <div className="flex gap-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-16 bg-zinc-800 rounded-lg" />
            ))}
          </div>
          <div className="h-px bg-zinc-800 my-2" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-800" />
            <div className="space-y-1">
              <div className="h-3 w-24 bg-zinc-800 rounded" />
              <div className="h-2 w-12 bg-zinc-800 rounded" />
            </div>
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`h-4 bg-zinc-800 rounded ${i % 3 === 0 ? "w-2/3" : "w-full"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function BlogNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div
          className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/[0.06]"
          style={{
            background:
              "linear-gradient(135deg, rgba(167,139,250,0.08), rgba(34,211,238,0.08))",
          }}
        >
          <FileText className="w-7 h-7 text-zinc-500" />
        </div>
        <TitleText tag="h2" variant="section" className="mb-2">
          Post not found
        </TitleText>
        <p className="text-sm text-zinc-500 mb-6">
          This post may have been removed or is no longer available.
        </p>
        <MseLink
          href="/blog"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-zinc-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Blog</span>
        </MseLink>
      </motion.div>
    </div>
  );
}
