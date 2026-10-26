"use client";

import Link from "next/link";
import { motion } from "motion/react";
import XipIcon from "@/components/Ui/Icon";
import type { ServicePageData } from "@/lib/db/services";
import { cn } from "@/utils";
import { normalizeBrandColor } from "@/lib/brand-color";
import { servicePath } from "@/lib/content-path";
import GlassServiceCard from "@/components/Ui/GlassServiceCard";

// XipSoft özel ikon seti — DB `badgeIcon` adlarıyla birebir aynı anahtarlar.
// `ServicePageClient.SERVICE_ICONS` ile aynı aile (içe aktarma döngüsü olmasın
// diye burada bağımsız tutulur).
const SERVICE_ICON_NAMES = new Set<string>([
  "Globe", "Smartphone", "Palette", "Code", "Zap", "Shield", "Layers", "Database",
  "Search", "BarChart2", "Monitor", "Terminal", "Cloud", "Lock", "Eye", "FileCheck",
  "AlertTriangle", "Server", "Brain", "Bot", "Workflow", "Cpu", "TrendingUp",
  "Target", "Users", "MousePointer", "GitBranch", "RefreshCw", "Code2", "Link2",
  "Webhook", "GitMerge", "PieChart", "FileText", "Filter", "CheckCircle", "Package",
]);

function getIcon(service: ServicePageData): string {
  const name = (service as { badgeIcon?: string }).badgeIcon || "Globe";
  return SERVICE_ICON_NAMES.has(name) ? name : "Globe";
}

interface RelatedServicesProps {
  /** NeonDB `services` kaynağından gelen hizmetler (bkz. MIMARI.md). */
  services: ServicePageData[];
  currentSlug?: string;
  tags?: string[];
  limit?: number;
  className?: string;
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
          <h2 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight brand-gradient-text">
            Sizin için uygun çözümler
          </h2>
        </div>
        <Link
          href="/hizmetler"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-prism-violet transition-colors"
        >
          Tüm Hizmetler <XipIcon name="arrow-right" className="w-3.5 h-3.5" />
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
  const iconName = getIcon(service);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
    >
      <GlassServiceCard
        title={service.title}
        description={service.subtitle ?? ""}
        icon={<XipIcon name={iconName} className="h-6 w-6" style={{ color }} />}
        href={servicePath(service.slug)}
        accentColor={color}
        badge={service.badge}
        tags={(service.servicesTag ?? []).slice(0, 2).map((tag) => tag.name)}
      />
    </motion.div>
  );
}
