"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, PanelLeft, PanelLeftClose } from "lucide-react";
import { logoutAction } from "@/app/_actions/auth/session";

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/settings": "Ayarlar",
  "/admin/blog": "Blog",
  "/admin/orders": "Siparişler",
  "/admin/security": "Güvenlik",
  "/admin/security/logs": "Günlükler",
  "/admin/ip-blocklist": "IP Engelleme",
  "/admin/monitoring": "İzleme",
  "/admin/seo": "SEO",
  "/admin/automation": "Otomasyon",
  "/admin/telegram": "Telegram",
  "/admin/cms/pages": "Sayfalar",
  "/admin/cms/content-tree": "İçerik Ağacı",
  "/admin/cms/media": "Medya",
  "/admin/cms/local-pages": "Yerel Sayfalar",
  "/admin/redirects": "Yönlendirmeler",
  "/admin/hizmetler": "Hizmetler",
};

interface AdminHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function AdminHeader({ sidebarOpen, onToggleSidebar }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const title = PAGE_TITLES[pathname]
    || (pathname.startsWith("/admin/cms/content-tree/") ? "İçerik Düzenle" : null)
    || (pathname.startsWith("/admin/cms/local-pages/") ? "Yerel Sayfa Düzenle" : null)
    || pathname.split("/").filter(Boolean).pop()
    || "Admin";

  const handleLogout = async () => {
    try {
      await logoutAction();
    } catch {}
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={sidebarOpen}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors lg:hidden"
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>
        <h1 className="text-sm font-semibold text-gray-800">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Çıkış</span>
        </button>
      </div>
    </header>
  );
}
