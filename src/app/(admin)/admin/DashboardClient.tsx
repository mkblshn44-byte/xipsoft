"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart, FileText, Users, Activity, Globe, Shield,
  TrendingUp, Clock, ArrowRight, RefreshCw, Zap
} from "lucide-react";

type Stats = {
  orders: { total: number; pending: number; revenue: number };
  blog: { total: number; published: number; draft: number };
  security: { blockedIPs: number; blockedCountries: number; recentThreats: number };
  system: { status: string; dbLatency: number | null; uptime: string };
};

const QUICK_LINKS = [
  { href: "/admin/blog", label: "Blog Yönetimi", icon: FileText },
  { href: "/admin/orders", label: "Siparişler", icon: ShoppingCart },
  { href: "/admin/security", label: "Güvenlik", icon: Shield },
  { href: "/admin/seo", label: "SEO", icon: Globe },
  { href: "/admin/monitoring", label: "İzleme", icon: Activity },
  { href: "/admin/settings", label: "Ayarlar", icon: Zap },
];

export default function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard-stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadStats(); }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">XipSoft yönetim paneli</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <StatCard title="Toplam Sipariş" value={stats?.orders.total ?? "—"} subtitle={`${stats?.orders.pending ?? 0} bekliyor`} icon={ShoppingCart} />
        <StatCard title="Blog Yazıları" value={stats?.blog.total ?? "—"} subtitle={`${stats?.blog.published ?? 0} yayında`} icon={FileText} />
        <StatCard title="Engellenen IP" value={stats?.security.blockedIPs ?? "—"} subtitle={`${stats?.security.blockedCountries ?? 0} ülke`} icon={Shield} />
        <StatCard title="Sistem Durumu" value={stats?.system.status === "ok" ? "Sağlıklı" : stats?.system.status ?? "—"} subtitle={stats?.system.dbLatency != null ? `DB: ${stats.system.dbLatency}ms` : ""} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-5">
        <section className="space-y-4 xl:col-span-3">
          <h2 className="text-sm font-semibold text-gray-800">Hızlı Erişim</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-12 items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition-colors hover:border-gray-300 hover:bg-gray-50 group"
              >
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors">{label}</span>
                <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-gray-500 ml-auto transition-colors" />
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4 xl:col-span-2">
          <h2 className="text-sm font-semibold text-gray-800">Son Aktiviteler</h2>
          <div className="space-y-3">
            <ActivityItem icon={Clock} text="Sistem başlatıldı" time="Şimdi" />
            <ActivityItem icon={Shield} text={`${stats?.security.recentThreats ?? 0} son tehdit`} time="24 saat" />
            <ActivityItem icon={TrendingUp} text="SEO denetimi mevcut" time="—" />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <p className="break-words text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

function ActivityItem({ icon: Icon, text, time }: {
  icon: React.ElementType;
  text: string;
  time: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
      <Icon className="w-4 h-4 text-gray-500" />
      <span className="text-xs text-gray-500 flex-1">{text}</span>
      <span className="text-[10px] text-gray-400">{time}</span>
    </div>
  );
}
