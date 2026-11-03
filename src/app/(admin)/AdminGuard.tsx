"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // 2FA doğrulama sayfası tam ekran gösterilir — yan menü/başlık render edilmez.
  const isVerify2faPage =
    pathname === "/admin/verify-2fa" || pathname.startsWith("/admin/verify-2fa/");

  useEffect(() => {
    if (isVerify2faPage) return;
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const syncSidebar = () => setSidebarOpen(desktopQuery.matches);
    syncSidebar();
    setIsHydrated(true);
    desktopQuery.addEventListener("change", syncSidebar);
    return () => desktopQuery.removeEventListener("change", syncSidebar);
  }, [isVerify2faPage]);

  if (isVerify2faPage) {
    return <>{children}</>;
  }

  // Keep server markup and the first client render identical; apply the
  // viewport-dependent sidebar state only after hydration.
  const isSidebarOpen = isHydrated && sidebarOpen;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-gray-950/30 lg:hidden"
        />
      )}
      <AdminSidebar open={isSidebarOpen} onToggle={() => setSidebarOpen(!isSidebarOpen)} />
      <div className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ${isSidebarOpen ? "lg:ml-60" : "lg:ml-16"}`}>
        <AdminHeader sidebarOpen={isSidebarOpen} onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
