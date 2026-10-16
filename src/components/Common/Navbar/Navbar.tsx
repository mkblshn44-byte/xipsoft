"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useCallback, useEffect, useRef, useContext } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/utils";
import Container from "@/components/Common/Container/Container";
import { ChevronDown, ArrowRight, Globe, Smartphone, Monitor, Shield, BarChart2, Zap } from "lucide-react";
import MseLink from "@/components/Ui/MseLink/MseLink";
import { navLabel } from "@/utils/latinize";
import { AuthContext } from "@/context/AuthContext";
import { teklifModal } from "@/components/Common/TeklifModal/TeklifModal";

// ── Constants ──────────────────────────────────────────────────────────────
const linkKeys = [
  { key: "home",       href: "/" },
  { key: "about",      href: "/hakkimizda" },
  { key: "Blog",       href: "/blog" },
  { key: "services",   href: "/#services" },
  { key: "contact",    href: "/contact-us" },
] as const;

const megaMenuItems = [
  { icon: Smartphone, color: "#a78bfa", labelKey: "web"      as const, descKey: "webDesc"      as const, longKey: "webLong"      as const, service: "Web Yazılım & Tasarım",    href: "/hizmetler/web-yazilim-tasarim" },
  { icon: Globe,      color: "#ddd6fe", labelKey: "mobile"   as const, descKey: "mobileDesc"   as const, longKey: "mobileLong"   as const, service: "Mobil Uygulama",            href: "/hizmetler/mobil-uygulama" },
  { icon: Monitor,    color: "#a78bfa", labelKey: "desktop"  as const, descKey: "desktopDesc"  as const, longKey: "desktopLong"  as const, service: "Masaüstü Yazılım",          href: "/hizmetler/masaustu-yazilim" },
  { icon: Shield,     color: "#ddd6fe", labelKey: "security" as const, descKey: "securityDesc" as const, longKey: "securityLong" as const, service: "Siber Güvenlik",            href: "/hizmetler/siber-guvenlik" },
  { icon: BarChart2,  color: "#a78bfa", labelKey: "seo"      as const, descKey: "seoDesc"      as const, longKey: "seoLong"      as const, service: "SEO & Dijital Pazarlama",   href: "/hizmetler/seo-dijital-pazarlama" },
] as const;

// ── Active indicator ──────────────────────────────────────────────────────────
const ActiveIndicator = () => (
  <div className="absolute -bottom-[1px] left-0 right-0 flex justify-center">
    <div className="h-[3px] w-10 rounded-full bg-gradient-to-r from-neon-500 to-accent-cyan" />
  </div>
);

// ── Logo ─────────────────────────────────────────────────────────────────────
const NavbarLogo = () => (
  <MseLink href="/" className="flex flex-shrink-0 items-center">
    <Image
      src="/media/logo.webp"
      alt="XipSoft"
      width={240}
      height={77}
      className="h-14 w-auto object-contain"
      sizes="(max-width: 768px) 174px, 240px"
      priority
      fetchPriority="high"
    />
  </MseLink>
);

// ── Hamburger icon ────────────────────────────────────────────────────────────
const MenuIcon = ({ isOpen }: { isOpen: boolean }) => (
  <div className="relative flex h-7 w-8 flex-col justify-center gap-1.5 p-1">
    <span className={cn("block h-[2px] w-full rounded-full bg-gradient-to-r from-accent-cyan to-neon-500", isOpen && "translate-y-2 rotate-45")} />
    {!isOpen && <span className="block h-[2px] w-[60%] rounded-full bg-neon-500" />}
    <span className={cn("block h-[2px] w-full rounded-full bg-neon-500", isOpen && "-translate-y-1.5 -rotate-45")} />
  </div>
);

// ── NavLink ───────────────────────────────────────────────────────────────────
const NavLink = ({ href, label, isActive, widthClass, mm = "" }: {
  href: string; label: string; isActive: boolean; widthClass: string; mm?: string;
}) => {
  return (
    <div className="relative" data-nav-link>
      <MseLink href={href} className={cn(
        "relative inline-flex min-h-[44px] items-center justify-center whitespace-nowrap -navbar px-2 py-3 text-[13px] font-extrabold uppercase tracking-[0.1em]",
        isActive
          ? "bg-gradient-to-r from-neon-400 via-neon-500 to-accent-cyan bg-clip-text text-transparent"
          : "text-zinc-100",
        widthClass, mm
      )}>
        <span className="relative z-10">{navLabel(label)}</span>
      </MseLink>
      {isActive && <ActiveIndicator />}
    </div>
  );
};

// ── Mega Menu ─────────────────────────────────────────────────────────────────
// Koyu iki sütunlu hizmet menüsü:
//   Sol: hizmet listesi (hover/focus ile seçilir)
//   Sağ: seçili hizmetin önizleme kartı (ikon + detay açıklama + CTA)
const MegaMenu = ({ isOpen, onClose, t }: { isOpen: boolean; onClose: () => void; t: (k: string) => string }) => {
  const [active, setActive] = useState(0);
  const activeItem = megaMenuItems[active] ?? megaMenuItems[0];
  const ActiveIcon = activeItem.icon;

  return (
    isOpen ? (
      <div className="absolute left-1/2 top-full z-50 mt-3 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
            <div className="relative grid grid-cols-1 sm:grid-cols-[300px_minmax(0,1fr)]">
              {/* ── SOL: Navigasyon listesi ── */}
              <div className="flex flex-col gap-1 border-b border-white/[0.06] p-3 sm:border-b-0 sm:border-r">
                <span className="-mono px-2 pb-1.5 text-[10px] uppercase tracking-[0.28em] text-zinc-500">
                  {t("title")}
                </span>
                {megaMenuItems.map((item, i) => {
                  const Icon = item.icon;
                  const isActive = i === active;
                  return (
                    <Link
                      key={item.labelKey}
                      href={item.href}
                      prefetch={false}
                      onClick={onClose}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xl border px-3 py-2.5",
                        isActive
                          ? "border-white/10 bg-white/[0.06]"
                          : "border-transparent"
                      )}
                    >
                      <span className="h-6 w-[2px] rounded-full"
                        style={{ background: isActive ? item.color : "transparent" }} />
                      <div className={cn(
                        "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border",
                        isActive
                          ? "border-white/20 bg-white/10"
                          : "border-white/10 bg-white/[0.03]"
                      )} style={{ borderColor: isActive ? `${item.color}77` : undefined }}>
                        <Icon className="h-4 w-4" style={{ color: item.color }} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("-display text-sm font-bold", isActive ? "text-white" : "text-zinc-200")}>
                          {t(item.labelKey)}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500">{t(item.descKey)}</p>
                      </div>
                      <ArrowRight className={cn("h-3.5 w-3.5 flex-shrink-0", isActive ? "text-zinc-400" : "text-zinc-700")} />
                    </Link>
                  );
                })}
              </div>

              {/* ── SAĞ: İçerik & Önizleme paneli ── */}
              <div
                className="relative flex min-h-[304px] flex-col p-5"
              >
                  <div key={activeItem.labelKey} className="relative flex flex-1 flex-col">
                    {/* Özel ikon rozeti */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border bg-white/[0.04]"
                        style={{ borderColor: `${activeItem.color}77` }}>
                        <ActiveIcon className="h-5 w-5" style={{ color: activeItem.color }} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">{t("title")}</p>
                        <p className="-display truncate text-base font-bold text-white">{t(activeItem.labelKey)}</p>
                      </div>
                    </div>

                    {/* Detay açıklaması */}
                    <p className="relative mt-4 flex-1 text-sm leading-relaxed text-zinc-400">
                      {t(activeItem.longKey)}
                    </p>
                  </div>
              </div>
            </div>

            {/* Alt çubuk — Tüm Hizmetler ayracısı */}
            <div className="relative border-t border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center justify-between gap-3">
              <span className="-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">15 yıllık tecrübe ile</span>
              <Link
                href="/hizmetler"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-400"
              >
                Tüm Hizmetler (11+)
                <span>→</span>
              </Link>
            </div>
          </div>
      </div>
    ) : null
  );
};

// ── Services dropdown trigger ─────────────────────────────────────────────────
const ServicesNavItem = ({ mm = "", t, tServices }: { mm?: string; t: (k: string) => string; tServices: (k: string) => string }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="relative inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-white/[0.20] bg-white/[0.12] px-3 py-2 -navbar text-[13px] font-extrabold uppercase tracking-[0.1em] text-white"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
      >
        <span className={mm}>{navLabel(t("services"))}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <div onMouseLeave={() => setOpen(false)}>
        <MegaMenu isOpen={open} onClose={() => setOpen(false)} t={tServices} />
      </div>
    </div>
  );
};

// ── User Nav Menu (desktop) ───────────────────────────────────────────────────
const UserNavMenu = ({ mm = "", t }: { mm?: string; t: (k: string) => string }) => {
  const { user, signOut } = useContext(AuthContext) ?? { user: null, signOut: async () => {} };
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.display_name
    ? user.display_name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Kullanıcı menüsü"
        className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1.5"
      >
        {user?.photo_url ? (
          <img src={user.photo_url} alt={user.display_name ?? "avatar"} className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-prism-cyan"
            style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.2), rgba(34,211,238,0.2))" }}>
            {initials}
          </span>
        )}
        <span className={cn("text-xs text-zinc-300 max-w-[80px] truncate", mm)}>
          {user?.display_name ?? user?.email}
        </span>
        <ChevronDown className="w-3 h-3 text-zinc-500" />
      </button>

      {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950">
            <div className="border-t border-white/[0.05] p-1">
              <button type="button" onClick={() => { setOpen(false); signOut(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-zinc-500">
                <span>→</span> <span className={mm}>{navLabel(t("loGout"))}</span>
              </button>
            </div>
          </div>
      )}
    </div>
  );
};

// ── DesktopNav ────────────────────────────────────────────────────────────────
const DesktopNav = ({ path, t, tServices, mm, isAuthenticated }: {
  path: string; t: (k: string) => string; tServices: (k: string) => string; mm: string; isAuthenticated: boolean;
}) => {
  const renderNavItem = (item: { index: number } & ({ type: "link"; href: string; labelKey: string; isActive: boolean; widthClass: string } | { type: "services" })) => {
    if (item.type === "link") {
      return (
        <div key={item.index}>
          <NavLink
            href={item.href}
            label={t(item.labelKey)}
            isActive={item.isActive}
            widthClass={item.widthClass}
            mm={mm}
          />
        </div>
      );
    }
    return (
      <div key={item.index}>
        <ServicesNavItem mm={mm} t={t} tServices={tServices} />
      </div>
    );
  };

  const leftItems = [
    { type: "link" as const, href: "/", labelKey: "home", isActive: path === "/", widthClass: "w-[5.5rem]", index: 0 },
    { type: "services" as const, index: 1 },
    { type: "link" as const, href: "/hakkimizda", labelKey: "about", isActive: path === "/hakkimizda", widthClass: "w-[6.5rem]", index: 2 },
    { type: "link" as const, href: "/blog", labelKey: "Blog", isActive: path === "/blog" || path.startsWith("/blog/"), widthClass: "w-[5rem]", index: 3 },
  ];

  const rightItems = [
    { type: "link" as const, href: "/contact-us", labelKey: "contact", isActive: path === "/contact-us", widthClass: "w-[5.5rem]", index: 5 },
  ];

  return (
    <div className="hidden lg:flex flex-row items-center w-full">
      <div className="flex items-center gap-2 xl:gap-3 flex-1 justify-end">
        {leftItems.map(renderNavItem)}
      </div>

      <div className="flex items-center gap-2 xl:gap-3 flex-1">
        {rightItems.map(renderNavItem)}

        <div className="mx-2 h-4 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />

        {isAuthenticated ? (
          <UserNavMenu mm={mm} t={t} />
        ) : (
          <div className="flex items-center gap-2">
            <MseLink
              href="/login"
              className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400"
            >
              {navLabel(t("loGin"))}
            </MseLink>
            <button
              type="button"
              onClick={() => teklifModal.open()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neon-500/40 bg-gradient-to-br from-neon-500/25 via-neon-600/12 to-neon-500/20 px-5 py-2.5 text-sm font-bold tracking-wide text-neon-300"
            >
              <Zap className="h-3.5 w-3.5 shrink-0" />
              {navLabel(t("GetQuote"))}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Mobile nav link ───────────────────────────────────────────────────────────
const MobileNavLink = ({ href, label, isActive, index, onClick, mm = "" }: {
  href: string; label: string; isActive: boolean; index: number; onClick: () => void; mm?: string;
}) => (
  <div>
    {/* onClick hem link'e hem span'a eklendi — navigate + menü kapat */}
    <MseLink href={href} onClick={onClick} className="relative flex min-h-[44px] items-center gap-4 py-3">
      <span className="-mono text-xs text-zinc-600 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
      <span className={cn(
        "-navbar text-[14px] xs:text-xl sm:text-3xl font-bold tracking-tight",
        isActive ? "bg-gradient-to-r from-neon-400 via-neon-500 to-accent-cyan bg-clip-text text-transparent" : "text-zinc-400",
        mm
      )}>{navLabel(label)}</span>
      {isActive && (
        <span className="h-2 w-2 rounded-full bg-neon-500" />
      )}
      <div className="absolute bottom-0 left-8 right-0 h-[1px] bg-white/5" />
    </MseLink>
  </div>
);

// ── Mobile service items ─────────────────────────────────────────────────────
const MobileServiceItems = ({ onClose, t }: { onClose: () => void; t: (k: string) => string }) => {
  return (
    <>
      {megaMenuItems.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.labelKey} onClick={onClose}>
            <Link href={item.href}
              className="flex items-center gap-3 py-2 text-left">
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: item.color }} strokeWidth={1.5} />
              <span className="text-zinc-400 text-sm">{t(item.labelKey)}</span>
            </Link>
          </div>
        );
      })}
      <div onClick={onClose} className="pt-2 mt-1 border-t border-white/[0.08]">
        <Link
          href="/hizmetler"
          className="flex items-center justify-between py-2 text-xs font-semibold text-violet-400"
        >
          <span>Tüm Hizmetleri Gör (11+)</span>
          <span>→</span>
        </Link>
      </div>
    </>
  );
};

// ── Main Navbar ─────────────────────────────────────────────────────────────
const Navbar = () => {
  const path = usePathname();
  const { isAuthenticated, signOut } = useContext(AuthContext) ?? { isAuthenticated: false, signOut: async () => {} };
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const t = useTranslations("nav");
  const tServices = useTranslations("nav.servicesMenu");
  const mm = "";

  useEffect(() => {
    const saved = localStorage.getItem('site-') || 'space-grotesk';
    if (saved) {
      document.documentElement.dataset.siteTheme = saved;
    }
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <nav
        className="fixed left-0 right-0 z-40 w-full bg-obsidian"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/[0.07]" />
        <Container className="flex flex-row items-center justify-between h-24 px-2 lg:px-4 xl:px-6">
          <div className="flex items-center h-full">
            <NavbarLogo />
          </div>
          <div className="flex items-center h-full">
            <DesktopNav path={path} t={t} tServices={tServices} mm={mm} isAuthenticated={isAuthenticated} />
          </div>
          <button className="relative z-50 flex min-h-[44px] min-w-[44px] items-center justify-center p-3 lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            <MenuIcon isOpen={mobileOpen} />
          </button>
        </Container>
      </nav>

      {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-obsidian lg:hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-6 sm:left-8 w-[1px] h-full bg-white/[0.03]" />
              <div className="absolute top-0 right-6 sm:right-8 w-[1px] h-full bg-white/[0.03]" />
            </div>

            <div className="relative h-full flex flex-col px-6 sm:px-12 pt-20 pb-8 overflow-y-auto" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
              <div className="mb-4 sm:mb-8">
                <span className={cn("-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600", mm)}>
                  {t("navigation")}
                </span>
              </div>

              <nav className="flex flex-col gap-1">
                {linkKeys.map((link, i) => (
                  <MobileNavLink key={link.key} href={link.href} label={t(link.key)}
                    isActive={path === link.href} index={i} onClick={closeMobile} mm={mm} />
                ))}

                <div>
                  <button className="relative flex w-full items-center gap-4 py-1.5 sm:py-3"
                    onClick={() => setMobileServicesOpen((v) => !v)}>
                    <span className="-mono text-xs text-zinc-600 tabular-nums">{String(linkKeys.length + 1).padStart(2, "0")}</span>
                    <span className={cn("-navbar text-[14px] xs:text-xl sm:text-3xl font-bold tracking-tight text-zinc-400", mm)}>
                      {navLabel(t("services"))}
                    </span>
                    <ChevronDown className="w-4 h-4 text-zinc-600" />
                  </button>
                  {mobileServicesOpen && (
                    <div className="flex flex-col gap-2 overflow-hidden pb-2 pl-10">
                      <MobileServiceItems onClose={closeMobile} t={tServices} />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-8 right-0 h-[1px] bg-white/5" />
                </div>
              </nav>

              <div className="mt-auto pt-6">
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    teklifModal.open();
                  }}
                  className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neon-500/40 bg-gradient-to-br from-neon-500/25 via-neon-600/12 to-neon-500/20 px-7 py-3.5 text-sm font-bold tracking-wide text-neon-300"
                >
                  <Zap className="h-3.5 w-3.5 shrink-0" />
                  {navLabel(t("GetQuote"))}
                </button>
                <div className="h-[1px] w-full bg-white/5 mb-3" />
                <div className="flex items-center justify-between">
                  {isAuthenticated ? (
                    <div className="flex items-center justify-between w-full">
                      <p className={cn("-mono text-[10px] text-zinc-600 tracking-widest uppercase truncate mr-2", mm)}>
                        {t("brandName")}
                      </p>
                      <button
                        type="button"
                        onClick={() => { closeMobile(); signOut(); }}
                        className={cn("text-xs text-zinc-500 -mono uppercase tracking-wider", mm)}
                      >
                        {navLabel(t("loGout"))}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <p className={cn("-mono text-[10px] text-zinc-600 tracking-widest uppercase truncate mr-2", mm)}>
                        {t("brandName")}
                      </p>
                      <MseLink
                        href="/login"
                        onClick={closeMobile}
                        className={cn("text-xs text-prism-violet -mono uppercase tracking-wider", mm)}
                      >
                        {navLabel(t("loGin"))}
                      </MseLink>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}
    </>
  );
};
export default Navbar;
