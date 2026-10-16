"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, FileText, Settings, Shield,
  Globe, Image as ImageIcon, Activity, Bot, Lock, PanelLeftClose,
  PanelLeft, Newspaper, BarChart3, Link2, HelpCircle
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Genel",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/orders", label: "Siparişler", icon: ShoppingCart },
      { href: "/admin/hizmetler", label: "Hizmetler", icon: Globe },
    ],
  },
  {
    label: "İçerik",
    items: [
      { href: "/admin/blog", label: "Blog", icon: Newspaper },
      { href: "/admin/cms/pages", label: "Sayfalar", icon: FileText },
      { href: "/admin/cms/local-pages", label: "Yerel Sayfalar", icon: Globe },
      { href: "/admin/redirects", label: "Yönlendirmeler", icon: Link2 },
      { href: "/admin/faq", label: "Site SSS", icon: HelpCircle },
      { href: "/admin/cms/media", label: "Medya", icon: ImageIcon },
    ],
  },
  {
    label: "Güvenlik",
    items: [
      { href: "/admin/security", label: "Güvenlik", icon: Shield },
      { href: "/admin/security/logs", label: "Günlükler", icon: Activity },
      { href: "/admin/ip-blocklist", label: "IP Engelleme", icon: Lock },
    ],
  },
  {
    label: "Araçlar",
    items: [
      { href: "/admin/seo", label: "SEO", icon: Globe },
      { href: "/admin/monitoring", label: "İzleme", icon: BarChart3 },
      { href: "/admin/automation", label: "Otomasyon", icon: Bot },
      { href: "/admin/telegram", label: "Telegram", icon: Bot },
      { href: "/admin/settings", label: "Ayarlar", icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  open: boolean;
  onToggle: () => void;
}

export default function AdminSidebar({ open, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-gray-200 bg-white shadow-sm transition-all duration-200 lg:translate-x-0 ${
        open ? "translate-x-0 lg:w-60" : "-translate-x-full lg:w-16"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-200">
        {open && (
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">X</span>
            </div>
            <span className="text-sm font-semibold text-gray-800 tracking-tight">Admin</span>
          </Link>
        )}
        <button
          onClick={onToggle}
          aria-label={open ? "Menüyü daralt" : "Menüyü genişlet"}
          aria-expanded={open}
          title={open ? "Menüyü daralt" : "Menüyü genişlet"}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {open ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {open && (
              <div className="px-3 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {section.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon, exact }) => {
                const active = isActive(href, exact);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={!open ? label : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                      active
                        ? "bg-violet-50 text-violet-700 font-medium border border-violet-100"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    } ${!open ? "justify-center px-2" : ""}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? "text-violet-600" : ""}`} />
                    {open && <span>{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-200">
        <Link
          href="/"
          className={`flex items-center gap-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors ${
            !open ? "justify-center" : ""
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          {open && <span>Siteye Dön</span>}
        </Link>
      </div>
    </aside>
  );
}
