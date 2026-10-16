"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight, Sparkles, Globe, Smartphone, Palette, Code, Zap, Shield,
  Layers, Database, Search, BarChart2, Monitor, Terminal, Cloud, Lock, Eye,
  FileCheck, AlertTriangle, Server, Brain, Bot, Workflow, Cpu, TrendingUp,
  Target, Users, MousePointer, GitBranch, RefreshCw, Code2, Link2, Webhook,
  GitMerge, PieChart, FileText, Filter, CheckCircle, Package, type LucideIcon,
} from "lucide-react";
import type { ServicePageData } from "@/lib/database";
import { cn } from "@/utils";
import { normalizeBrandColor } from "@/lib/brand-color";

const SERVICE_ICON_MAP: Record<string, LucideIcon> = {
  Globe, Smartphone, Palette, Code, Zap, Shield, Layers, Database, Search,
  BarChart2, Monitor, Terminal, Cloud, Lock, Eye, FileCheck, AlertTriangle,
  Server, Brain, Bot, Workflow, Cpu, TrendingUp, Target, Users, MousePointer,
  GitBranch, RefreshCw, Code2, Link2, Webhook, GitMerge, PieChart, FileText,
  Filter, CheckCircle, Package,
};

interface RelatedServicesProps {
  /** NeonDB `services` kaynağından gelen hizmetler (bkz. MIMARI.md). */
  services: ServicePageData[];
  currentSlug?: string;
  tags?: string[];
  limit?: number;
  className?: string;
}

function getIcon(service: ServicePageData): LucideIcon {
  const name = (service as any).badgeIcon || "Globe";
  return SERVICE_ICON_MAP[name] || Globe;
}

export default function RelatedServices({
  services,
  currentSlug,
  tags = [],
  limit = 3,
  className,
}: RelatedServicesProps) {
  const filtered = services.filter((s) => s.slug !== currentSlug);

  const scored = filtered
    .map((s) => {
      let score = 0;
      const bag = (tags || []).map((t) => t.toLowerCase());
      const haystack = [
        s.slug,
        s.title,
        s.subtitle ?? "",
        ...(s.servicesTag ?? []).map((t) => t.name),
        ...(s.features ?? []).map((f) => f.title + " " + f.description),
        ...(s.techStack ?? []).map((t) => t.name),
      ]
        .join(" ")
        .toLowerCase();

      for (const t of bag) {
        if (haystack.includes(t)) score += 2;
      }
      if (score === 0) score = 1;
      return { service: s, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.service);

  if (scored.length === 0) return null;

  return (
    <section className={cn("relative mt-12 pt-8 pb-4 border-t border-white/[0.06]", className)}>
      <div className="flex items-end justify-between mb-7">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-px w-10 bg-gradient-to-r from-prism-violet to-transparent" />
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-prism-violet">
              İlgili Hizmetler
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight">
            Sizin için uygun çözümler
          </h2>
        </div>
        <Link
          href="/hizmetler"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-prism-violet transition-colors"
        >
          Tüm Hizmetler <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {scored.map((s, i) => (
          <ServiceCard key={s.slug} service={s} index={i} />
        ))}
      </div>
    </section>
  );
}

function ServiceCard({ service, index }: { service: ServicePageData; index: number }) {
  const color = normalizeBrandColor(service.features?.[0]?.color ?? "#ddd6fe");
  const Icon = getIcon(service);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group relative rounded-2xl overflow-hidden border border-white/[0.04] bg-white/[0.02] transition-all duration-500 hover:-translate-y-1 hover:border-prism-cyan/30"
    >
      <Link
        href={`/hizmetler/${service.slug}`}
        className="block p-6 h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-prism-cyan/50"
      >
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${color}20, ${color}08)`,
              border: `1px solid ${color}30`,
              boxShadow: `0 0 14px ${color}20`,
            }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            {service.badge && (
              <span
                className={cn(
                  "inline-block text-[10px] font-mono uppercase tracking-[0.2em] mb-1.5",
                  (service as any).badgeColor || "text-zinc-400"
                )}
              >
                {service.badge}
              </span>
            )}
            <h3 className="font-bold text-[0.95rem] text-zinc-100 group-hover:text-white leading-snug line-clamp-2">
              {service.title}
            </h3>
          </div>
        </div>
        {service.subtitle && (
          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">
            {service.subtitle}
          </p>
        )}
        <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(service.servicesTag ?? []).slice(0, 2).map((tag) => (
              <span
                key={tag.name}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.03] border border-white/[0.04] text-zinc-400"
              >
                {tag.name}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-prism-cyan opacity-0 group-hover:opacity-100 transition-opacity">
            İncele <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
