"use client";
/**
 * Navbar — XipSoft üst gezinme çubuğu.
 *
 * TASARIM DİLİ (2026 yenilemesi)
 * ─────────────────────────────
 * • Zemin: obsidian + ince cam (backdrop-blur) + alt LED çizgisi.
 * • İkonlar: XipSoft ÖZEL ikon seti (`@/components/Ui/Icon`), dikey LED çubuğu
 *   ve arkasına beyaz ışık vurmuş ikon yuvaları (`icon-backlight`).
 * • Aktif sayfa: mor→cyan gradient metin + ışıklı LED alt çizgisi.
 * • Hizmet menüsü: navbar altından VIEWPORT genişliğinde açılan mega panel;
 *   hizmetler kart ızgarası olarak listelenir, açılışta kartlar sıralı belirir
 *   (saf CSS geçişler — bkz. globals.scss → `.services-mega`).
 * • Mobil: tam ekran panel, numaralı bağlantılar, açılır hizmet listesi.
 *
 * KORUNAN DAVRANIŞLAR
 * ───────────────────
 * • Logo (döner + hover 3B), sayfa bağlantıları, hizmet menüsü, kullanıcı
 *   menüsü ve teklif akışı (`teklifModal`) aynen çalışır.
 * • Aşağı kaydırınca gizlenme, yukarıda geri gelme.
 * • Mobil menü açıkken gövde kaydırması kilitlenir.
 * • Site dili seçimi AltBilgi (Homebar) "Sistem Dili" alanındadır; burada
 *   yinelenen ikinci bir seçici bilinçli olarak EKLENMEZ.
 *
 * ERİŞİLEBİLİRLİK
 * ───────────────
 * • Açılır menülerde `aria-haspopup` / `aria-expanded`; Escape ve dış tıklama
 *   ile kapanır.
 * • Tüm etkileşim hedefleri ≥44×44px; klavye odağı `focus-visible` halkasıyla
 *   görünür.
 * • Dekoratif ikonlar ekran okuyuculardan gizlenir (XipIcon varsayılanı).
 */
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useCallback, useEffect, useRef, useContext, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/utils";
import Container from "@/components/Common/Container/Container";
import XipIcon from "@/components/Ui/Icon";
import MseLink from "@/components/Ui/MseLink/MseLink";
import { navLabel } from "@/utils/latinize";
import { AuthContext } from "@/context/AuthContext";
import { teklifModal } from "@/components/Common/TeklifModal/teklif-modal-store";
import { PALETTE } from "@/config/palette";

// ── Constants ──────────────────────────────────────────────────────────────
const linkKeys = [
  { key: "home",       href: "/" },
  { key: "about",      href: "/hakkimizda" },
  { key: "Blog",       href: "/blog" },
  { key: "services",   href: "/#services" },
  { key: "contact",    href: "/contact-us" },
] as const;

// Mega menü öğeleri — `icon` doğrudan XipIcon adıdır (özel ikon seti).
const megaMenuItems = [
  { icon: "code2",      color: PALETTE.neon[500], labelKey: "web"      as const, descKey: "webDesc"      as const, longKey: "webLong"      as const, service: "Web Yazılım & Tasarım",  href: "/hizmetler/web-yazilim-tasarim1.html" },
  { icon: "smartphone", color: PALETTE.accent.cyan, labelKey: "mobile"   as const, descKey: "mobileDesc"   as const, longKey: "mobileLong"   as const, service: "Mobil Uygulama",          href: "/hizmetler/mobil-uygulama.html" },
  { icon: "monitor",    color: PALETTE.neon[500], labelKey: "desktop"  as const, descKey: "desktopDesc"  as const, longKey: "desktopLong"  as const, service: "Masaüstü Yazılım",        href: "/hizmetler/masaustu-yazilim.html" },
  { icon: "shield-check", color: PALETTE.accent.cyan, labelKey: "security" as const, descKey: "securityDesc" as const, longKey: "securityLong" as const, service: "Siber Güvenlik",          href: "/hizmetler/siber-guvenlik.html" },
  { icon: "bar-chart2", color: PALETTE.neon[500], labelKey: "seo"      as const, descKey: "seoDesc"      as const, longKey: "seoLong"      as const, service: "SEO & Dijital Pazarlama", href: "/hizmetler/seo-dijital-pazarlama.html" },
] as const;

// ── Ortak odak halkası (klavye erişilebilirliği) ───────────────────────────
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian";

// ── Active indicator — ışıklı LED alt çizgisi ─────────────────────────────
// Altının NADİR kullanımından biri: yalnızca aktif menü çizgisi premium altın kalır,
// geri kalan tüm vurgular safir mavidir.
const ActiveIndicator = () => (
  <span aria-hidden="true" className="absolute inset-x-0 -bottom-[3px] flex justify-center">
    <span className="h-[2px] w-10 rounded-full bg-gradient-to-r from-accent-gold to-accent-goldLight shadow-[0_0_12px_rgba(167, 139, 250,0.22)]" />
  </span>
);

// ── Logo ─────────────────────────────────────────────────────────────────────
const NavbarLogo = () => (
  <MseLink href="/" className={cn("group flex flex-shrink-0 items-center rounded-xl", FOCUS_RING)}>
    {/* Döner katman → her 9 saniyede bir 180° döner, bekler ve eski hâline (0°) döner */}
    <span className="inline-flex animate-logo-flip will-change-transform">
      {/* Hover katmanı → 3B öne çıkma: perspektif + rotateX + translateZ + neon parlaklık */}
      <span
        className={cn(
          "inline-flex will-change-transform",
          "transition-[transform,filter] duration-500 ease-out",
          "group-hover:[transform:perspective(900px)_rotateX(-14deg)_translateZ(26px)_scale(1.07)]",
          "group-hover:drop-shadow-[0_12px_28px_rgba(167, 139, 250,0.10)]",
          "group-hover:brightness-110"
        )}
      >
        <Image
          src="/media/logo.webp"
          alt="XipSoft"
          width={240}
          height={77}
          className="h-16 w-auto object-contain sm:h-[4.5rem] lg:h-20"
          sizes="(max-width: 640px) 200px, (max-width: 1024px) 225px, 250px"
          priority
          fetchPriority="high"
        />
      </span>
    </span>
  </MseLink>
);

// ── Hamburger icon ────────────────────────────────────────────────────────────
const MenuIcon = ({ isOpen }: { isOpen: boolean }) => (
  <span aria-hidden="true" className="relative flex h-7 w-8 flex-col justify-center gap-1.5 p-1">
    <span
      className={cn(
        "block h-[2px] w-full rounded-full bg-gradient-to-r from-accent-cyan to-neon-500 transition-transform duration-300 ease-out",
        isOpen && "translate-y-2 rotate-45"
      )}
    />
    <span
      className={cn(
        "block h-[2px] w-[60%] rounded-full bg-neon-500 transition-opacity duration-200",
        isOpen ? "opacity-0" : "opacity-100"
      )}
    />
    <span
      className={cn(
        "block h-[2px] w-full rounded-full bg-neon-500 transition-transform duration-300 ease-out",
        isOpen && "-translate-y-1.5 -rotate-45"
      )}
    />
  </span>
);

// ── NavLink ───────────────────────────────────────────────────────────────────
const NavLink = ({ href, label, isActive, widthClass, mm = "" }: {
  href: string; label: string; isActive: boolean; widthClass: string; mm?: string;
}) => {
  return (
    <div className="relative" data-nav-link>
      <MseLink
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-lg px-2 py-3 -navbar text-[13px] font-extrabold uppercase tracking-[0.1em] transition-all duration-200",
          FOCUS_RING,
          isActive
            ? "bg-gradient-to-r from-neon-400 via-neon-500 to-accent-cyan bg-clip-text text-transparent"
            : "text-zinc-200 hover:text-white",
          widthClass, mm
        )}
      >
        <span className="relative z-10">{navLabel(label)}</span>
      </MseLink>
      {isActive && <ActiveIndicator />}
    </div>
  );
};

// ── Mega Menu ─────────────────────────────────────────────────────────────────
/**
 * HİZMETLER MEGA MENÜSÜ — tam genişlik panel + hizmet kartları ızgarası.
 *
 * NEDEN YENİLENDİ: eski sürüm navbar altında 760px'e sıkışan iki sütunlu bir
 * kutuydu (solda liste, sağda hover ile değişen önizleme) ve açılış/kapanış
 * hareketi yoktu. Yeni sürüm:
 *   • Navbar'ın hemen altından VIEWPORT genişliğinde açılır; içerik `Container`
 *     ile sayfa hizasında kalır → beş hizmet tek bakışta, kart olarak.
 *   • Açılış/kapanış SAF CSS (`globals.scss → .services-mega`): panel yukarıdan
 *     süzülür, kartlar `--i` sırasına göre 40ms arayla sıralı belirir. JS
 *     animasyon kütüphanesi yok (INP/TBT dostu).
 *   • Kapalıyken `visibility: hidden` + `aria-hidden` → panel bağlantıları
 *     sekme sırasından ve erişilebilirlik ağacından çıkar.
 *   • Fare tetikleyiciden panele geçerken menü hemen kapanmaz (hover-intent
 *     gecikmesi `Navbar` içinde yönetilir).
 */
const ServiceCard = ({ item, index, t, onClose }: {
  item: (typeof megaMenuItems)[number];
  index: number;
  t: (k: string) => string;
  onClose: () => void;
}) => (
  <Link
    href={item.href}
    prefetch={false}
    onClick={onClose}
    className={cn(
      "services-mega__card group relative flex flex-col gap-3.5 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 hover:border-white/20 hover:bg-white/[0.05]",
      FOCUS_RING
    )}
    style={{ "--i": index } as CSSProperties}
  >
    {/* Hover: kartın renginde üst LED + dipten renkli ışık */}
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
      style={{ background: `linear-gradient(90deg, transparent, ${item.color}, transparent)` }}
    />
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
      style={{ background: `radial-gradient(130% 100% at 50% 130%, ${item.color}1f, transparent 72%)` }}
    />

    <span className="relative flex items-center justify-between gap-2">
      <span
        className="icon-backlight flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110"
        style={{ borderColor: `${item.color}55`, background: `${item.color}12` }}
      >
        <XipIcon name={item.icon} glow="strong" className="h-5 w-5" style={{ color: item.color }} />
      </span>
      <XipIcon
        name="arrow-right"
        glow="none"
        className="h-4 w-4 shrink-0 text-zinc-700 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-zinc-300"
      />
    </span>

    <span className="relative">
      <span className="-display block text-sm font-bold leading-snug text-white">
        {t(item.labelKey)}
      </span>
      <span className="mt-1 block text-[11px] leading-relaxed text-zinc-500">
        {t(item.descKey)}
      </span>
    </span>
  </Link>
);

/**
 * Panel içi klavye gezinmesi: ok tuşları kartlar/eylemler arasında dolaşır
 * (ARIA menü deseni). Escape ve dış tıklama `Navbar` tarafında yönetilir.
 */
const onMegaMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
  const { key } = e;
  if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "ArrowLeft" && key !== "ArrowRight") return;

  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("a, button"));
  if (!items.length) return;

  const index = items.indexOf(document.activeElement as HTMLElement);
  const forward = key === "ArrowDown" || key === "ArrowRight";
  const next = index === -1
    ? (forward ? 0 : items.length - 1)
    : (index + (forward ? 1 : -1) + items.length) % items.length;

  e.preventDefault();
  items[next]?.focus();
};

const MegaMenu = ({ open, t, onClose, onMouseEnter, onMouseLeave }: {
  open: boolean;
  t: (k: string) => string;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => (
  <div
    id="services-mega-panel"
    data-services-menu
    data-open={open ? "true" : "false"}
    aria-hidden={!open}
    onKeyDown={onMegaMenuKeyDown}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className="services-mega fixed inset-x-0 z-40 hidden lg:block"
    style={{ top: "calc(env(safe-area-inset-top) + 6rem)" }}
  >
    <div className="relative border-b border-white/[0.10] bg-[rgba(5, 8, 17,0.94)] shadow-[0_32px_90px_-36px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
      {/* Üst LED çizgisi — navbar alt çizgisiyle aynı dil; açılışta soldan sağa süpürür */}
      <span
        aria-hidden="true"
        className="services-mega__led pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-500/60 to-transparent"
      />
      <Container className="px-4 lg:px-6 xl:px-8">
        <div className="flex flex-col gap-5 py-6">
          {/* Başlık şeridi */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-neon-500/30 bg-neon-500/10">
                <XipIcon name="layers" glow="strong" className="h-4 w-4 text-neon-300" />
              </span>
              <span className="-mono block text-[10px] uppercase tracking-[0.28em] text-zinc-500">
                {t("title")}
              </span>
            </div>
            <span className="-mono hidden text-[10px] uppercase tracking-[0.2em] text-zinc-600 xl:block">
              15 yıllık tecrübe ile
            </span>
          </div>
          {/* Hizmet kartları — tek bakışta beşi de görünür */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            {megaMenuItems.map((item, i) => (
              <ServiceCard key={item.labelKey} item={item} index={i} t={t} onClose={onClose} />
            ))}
          </div>
          {/* Alt eylem çubuğu */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
            <span className="-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              11 uzmanlık · tek ekip
            </span>
            <Link
              href="/hizmetler"
              onClick={onClose}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-400/10 px-4 py-2 text-xs font-semibold text-violet-300 transition-colors hover:border-violet-400/50 hover:text-white",
                FOCUS_RING
              )}
            >
              Tüm Hizmetler (11+)
              <XipIcon name="arrow-right" glow="none" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </Container>
    </div>
  </div>
);

// ── Services dropdown trigger ─────────────────────────────────────────────────
// Menü artık bu bileşenin İÇİNDE değil: navbar'ın KARDEŞİ olarak `fixed`
// açılıyor (viewport genişliği + navbar'ın transform'undan etkilenmez).
// Bu bileşen yalnızca tetikleyiciyi çizer; açık/kapalı durumu ve kapanma
// kuralları (dış tıklama, Escape, odak dışı, hover-intent) `Navbar`'da.
const ServicesNavItem = ({ mm = "", t, open, onEnter, onLeave, onToggle }: {
  mm?: string;
  t: (k: string) => string;
  open: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onToggle: (viaKeyboard: boolean) => void;
}) => (
  <div
    className="relative"
    data-services-menu
    // Yalnızca gerçek fare ile hover açar: dokunmatik cihazlarda `pointerenter`
    // de tetiklenip ardından gelen `click` menüyü hemen kapatıyordu (aç-kapa
    // yarışı). Dokunmatikte davranış tamamen `click` üzerinden yürür.
    onPointerEnter={(e) => {
      if (e.pointerType === "mouse") onEnter();
    }}
    onPointerLeave={(e) => {
      if (e.pointerType === "mouse") onLeave();
    }}
  >
    <button
      type="button"
      data-services-trigger
      aria-haspopup="true"
      aria-expanded={open}
      aria-controls="services-mega-panel"
      className={cn(
        "relative inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 -navbar text-[13px] font-extrabold uppercase tracking-[0.1em] text-white transition-colors duration-200",
        FOCUS_RING,
        open
          ? "border-neon-500/50 bg-neon-500/15"
          : "border-white/[0.20] bg-white/[0.10] hover:border-neon-500/40 hover:bg-neon-500/10"
      )}
      // `detail === 0` → Enter/Space ile açıldı (fare tıklamasında 1'dir).
      onClick={(e) => onToggle(e.detail === 0)}
    >
      <span className={mm}>{navLabel(t("services"))}</span>
      <XipIcon
        name="chevron-down"
        glow="none"
        className={cn("h-3.5 w-3.5 transition-transform duration-300", open && "rotate-180")}
      />
    </button>
  </div>
);

// ── User Nav Menu (desktop) ───────────────────────────────────────────────────
const UserNavMenu = ({ mm = "", t }: { mm?: string; t: (k: string) => string }) => {
  const { user, signOut } = useContext(AuthContext) ?? { user: null, signOut: async () => {} };
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const initials = user?.display_name
    ? user.display_name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Kullanıcı menüsü"
        className={cn(
          "flex min-h-[44px] items-center gap-2 rounded-full border px-2.5 py-1.5 transition-colors duration-200",
          FOCUS_RING,
          open ? "border-neon-500/40 bg-neon-500/10" : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
        )}
      >
        {user?.photo_url ? (
          <img src={user.photo_url} alt={user.display_name ?? "avatar"} className="h-6 w-6 rounded-full object-cover" />
        ) : (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-prism-cyan"
            style={{ background: "linear-gradient(135deg, rgba(167, 139, 250,0.08), rgba(18, 20, 28,0.08))" }}
          >
            {initials}
          </span>
        )}
        <span className={cn("max-w-[80px] truncate text-xs text-zinc-300", mm)}>
          {user?.display_name ?? user?.email}
        </span>
        <XipIcon
          name="chevron-down"
          glow="none"
          className={cn("h-3 w-3 text-zinc-500 transition-transform duration-300", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950/95 p-1 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white",
              FOCUS_RING
            )}
          >
            <XipIcon name="log-out" glow="soft" className="h-4 w-4" />
            <span className={mm}>{navLabel(t("loGout"))}</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ── DesktopNav ────────────────────────────────────────────────────────────────
const DesktopNav = ({ path, t, mm, isAuthenticated, servicesOpen, onServicesEnter, onServicesLeave, onServicesToggle }: {
  path: string; t: (k: string) => string; mm: string; isAuthenticated: boolean;
  servicesOpen: boolean;
  onServicesEnter: () => void;
  onServicesLeave: () => void;
  onServicesToggle: (viaKeyboard: boolean) => void;
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const renderNavItem = (item: { index: number } & ({ type: "link"; href: string; labelKey: string; isActive: boolean; widthClass: string } | { type: "services" })) => {
    const id = String(item.index);
    const isOthersHovered = hoveredId !== null && hoveredId !== id;

    return (
      <div
        key={item.index}
        onMouseEnter={() => setHoveredId(id)}
        onMouseLeave={() => setHoveredId(null)}
        className={cn(
          "transition-all duration-200",
          isOthersHovered ? "opacity-40 blur-sm grayscale" : ""
        )}
      >
        {item.type === "link" ? (
          <NavLink
            href={item.href}
            label={t(item.labelKey)}
            isActive={item.isActive}
            widthClass={item.widthClass}
            mm={mm}
          />
        ) : (
          <ServicesNavItem
            mm={mm}
            t={t}
            open={servicesOpen}
            onEnter={onServicesEnter}
            onLeave={onServicesLeave}
            onToggle={onServicesToggle}
          />
        )}
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
    <div className="hidden w-full flex-row items-center lg:flex">
      <div className="flex flex-1 items-center justify-end gap-2 xl:gap-3">
        {leftItems.map(renderNavItem)}
      </div>

      <div className="flex flex-1 items-center gap-2 xl:gap-3">
        {rightItems.map(renderNavItem)}

        <div aria-hidden="true" className="mx-2 h-4 w-px bg-gradient-to-b from-transparent via-white/[0.10] to-transparent" />

        {isAuthenticated ? (
          <UserNavMenu mm={mm} t={t} />
        ) : (
          <div className="flex items-center gap-2">
            <MseLink
              href="/login"
              className={cn(
                "font-navbar inline-flex min-h-[44px] items-center rounded-full border border-white/[0.08] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-colors duration-200 hover:border-white/20 hover:text-white",
                FOCUS_RING
              )}
            >
              {navLabel(t("loGin"))}
            </MseLink>
            <button
              type="button"
              onClick={() => teklifModal.open()}
              className={cn(
                "btn-glint btn-squash font-navbar inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-neon-500/40 bg-gradient-to-br from-neon-500/25 via-neon-600/12 to-neon-500/20 px-5 py-2.5 text-sm font-bold tracking-wide text-neon-300 transition-colors duration-200 hover:border-neon-500/70 hover:text-white",
                FOCUS_RING
              )}
            >
              <XipIcon name="zap" glow="strong" halo="red" className="h-3.5 w-3.5 shrink-0" />
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
  <div className="relative">
    <MseLink
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn("relative flex min-h-[52px] items-center gap-4 py-3", FOCUS_RING)}
    >
      <span aria-hidden="true" className="-mono text-xs tabular-nums text-zinc-600">{String(index + 1).padStart(2, "0")}</span>
      <span className={cn(
        "-navbar text-[14px] xs:text-xl sm:text-3xl font-bold tracking-tight",
        isActive ? "bg-gradient-to-r from-neon-400 via-neon-500 to-accent-cyan bg-clip-text text-transparent" : "text-zinc-400",
        mm
      )}>{navLabel(label)}</span>
      {isActive && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-neon-500 shadow-[0_0_10px_rgba(167, 139, 250,0.14)]" />}
    </MseLink>
    <span aria-hidden="true" className="absolute bottom-0 left-8 right-0 h-px bg-white/5" />
  </div>
);

// ── Mobile service items ─────────────────────────────────────────────────────
const MobileServiceItems = ({ onClose, t }: { onClose: () => void; t: (k: string) => string }) => {
  return (
    <>
      {megaMenuItems.map((item) => (
        <div key={item.labelKey} onClick={onClose}>
          <Link href={item.href} className={cn("flex min-h-[44px] items-center gap-3 py-2 text-left", FOCUS_RING)}>
            <XipIcon name={item.icon} glow="strong" halo="red" className="h-4 w-4 flex-shrink-0" style={{ color: item.color }} />
            <span className="text-sm text-zinc-400">{t(item.labelKey)}</span>
          </Link>
        </div>
      ))}
      <div onClick={onClose} className="mt-1 border-t border-white/[0.08] pt-2">
        <Link
          href="/hizmetler"
          className={cn("flex min-h-[44px] items-center justify-between py-2 text-xs font-semibold text-violet-300", FOCUS_RING)}
        >
          <span>Tüm Hizmetleri Gör (11+)</span>
          <XipIcon name="arrow-right" glow="none" className="h-3.5 w-3.5" />
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
  const [navbarVisible, setNavbarVisible] = useState(true);
  const lastScrollY = useRef(0);
  const t = useTranslations("nav");
  const tServices = useTranslations("nav.servicesMenu");
  const mm = "font-navbar";

  // ── Hizmetler mega menüsü — açık/kapalı durumu ve kapanma kuralları ───────
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openServices = useCallback(() => {
    if (servicesCloseTimer.current) {
      clearTimeout(servicesCloseTimer.current);
      servicesCloseTimer.current = null;
    }
    setServicesOpen(true);
  }, []);

  const closeServices = useCallback(() => {
    if (servicesCloseTimer.current) {
      clearTimeout(servicesCloseTimer.current);
      servicesCloseTimer.current = null;
    }
    setServicesOpen(false);
  }, []);

  // Hover-intent: imleç tetikleyiciden panele inerken menü hemen kapanmasın.
  const closeServicesSoon = useCallback(() => {
    if (servicesCloseTimer.current) clearTimeout(servicesCloseTimer.current);
    servicesCloseTimer.current = setTimeout(() => {
      servicesCloseTimer.current = null;
      setServicesOpen(false);
    }, 160);
  }, []);

  // Panel DOM'da navbar'ın KARDEŞİ olduğu için sekme sırası menüye uğramaz:
  // klavye ile açılışta odağı panelin ilk bağlantısına taşırız (ARIA menü
  // düğmesi deseni). Fare ile açılışta odak ÇALINMAZ.
  const focusFirstPanelItem = useCallback(() => {
    const panel = document.getElementById("services-mega-panel");
    const focusFirst = () => panel?.querySelector<HTMLElement>("a")?.focus();
    requestAnimationFrame(() => {
      focusFirst();
      // Panel `visibility` geçişiyle geldiği için ilk deneme boşta kalırsa bir kez daha dene.
      if (panel && !panel.contains(document.activeElement)) requestAnimationFrame(focusFirst);
    });
  }, []);

  const toggleServices = useCallback(
    (viaKeyboard: boolean) => {
      if (servicesOpen) {
        closeServices();
        return;
      }
      openServices();
      if (viaKeyboard) focusFirstPanelItem();
    },
    [servicesOpen, closeServices, openServices, focusFirstPanelItem]
  );

  useEffect(() => {
    const saved = localStorage.getItem('site-') || 'space-grotesk';
    if (saved) {
      document.documentElement.dataset.siteTheme = saved;
    }
  }, []);

  // Aşağı inildiğinde navbarı gizle, yukarı çıkınca geri getir (masaüstü + mobil)
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const isScrollingDown = currentScrollY > lastScrollY.current;
          const pastThreshold = currentScrollY > 80;

          setNavbarVisible(!(pastThreshold && isScrollingDown));
          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setMobileServicesOpen(false);
  }, []);

  // Gövde kaydırma kilidi + Escape ile mobil menüyü kapat
  // NOT: `document.body.style.overflow` doğrudan yazma → stil geçersizleştirme
  // + okuma → forced reflow üretiyordu (Lighthouse). CSS sınıfı toggle'ı
  // tarayıcı stil motoru tarafından toplu işlenir, reflow tetiklemez.
  useEffect(() => {
    document.documentElement.classList.toggle("overflow-hidden-mobile", mobileOpen);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    if (mobileOpen) document.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.classList.remove("overflow-hidden-mobile");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  // Mega menü: dışa tıklama, Escape ve odak dışarı çıkınca kapanır.
  useEffect(() => {
    if (!servicesOpen) return;

    const isInsideMenu = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest("[data-services-menu]");

    const onPointerDown = (e: MouseEvent) => {
      if (!isInsideMenu(e.target)) closeServices();
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!isInsideMenu(e.target)) closeServices();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closeServices();
      // Escape sonrası odak tetikleyiciye döner (ARIA menü düğmesi davranışı).
      document.querySelector<HTMLButtonElement>("[data-services-trigger]")?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [servicesOpen, closeServices]);

  // Navbar kaydırmada gizlenirse menü de kapansın (tetikleyici görünmezken açık kalmasın).
  useEffect(() => {
    if (!navbarVisible) closeServices();
  }, [navbarVisible, closeServices]);

  // Bileşen kalkarken bekleyen kapanma zamanlayıcısı boşta kalmasın.
  useEffect(
    () => () => {
      if (servicesCloseTimer.current) clearTimeout(servicesCloseTimer.current);
    },
    []
  );

  return (
    <>
      <nav
        aria-label="Ana gezinme"
        className={cn(
          "fixed left-0 right-0 z-40 w-full border-b border-white/[0.10] bg-[rgba(5, 8, 17,0.72)] shadow-[0_8px_32px_rgba(0,0,0,0.24)] backdrop-blur-2xl transition-transform duration-300 ease-in-out font-navbar",
          navbarVisible ? "translate-y-0" : "-translate-y-full"
        )}
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        {/* Alt LED çizgisi */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neon-500/35 to-transparent"
        />
        <Container className="flex h-24 flex-row items-center justify-between px-2 lg:px-4 xl:px-6">
          <div className="flex h-full items-center">
            <NavbarLogo />
          </div>
          <div className="flex h-full items-center">
            <DesktopNav
              path={path}
              t={t}
              mm={mm}
              isAuthenticated={isAuthenticated}
              servicesOpen={servicesOpen}
              onServicesEnter={openServices}
              onServicesLeave={closeServicesSoon}
              onServicesToggle={toggleServices}
            />
          </div>
          <button
            type="button"
            className={cn(
              "relative z-50 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-3 lg:hidden",
              FOCUS_RING
            )}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
          >
            <MenuIcon isOpen={mobileOpen} />
          </button>
        </Container>
      </nav>

      {/* Hizmetler mega menüsü — navbar'ın KARDEŞİ olarak viewport genişliğinde açılır.
          (Navbar içinde kalsaydı `translate-y-0` transform'u onu sabit konumlamadan
          koparırdı; ayrıca tam genişlik hizası için ayrı durması gerekir.) */}
      <MegaMenu
        open={servicesOpen}
        t={tServices}
        onClose={closeServices}
        onMouseEnter={openServices}
        onMouseLeave={closeServicesSoon}
      />

      {mobileOpen && (
        <div
          id="mobile-nav-panel"
          className="fixed inset-0 z-40 overflow-hidden bg-obsidian/[0.98] backdrop-blur-xl lg:hidden"
        >
          {/* Dekoratif dikey LED kılavuzları */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-6 top-0 h-full w-px bg-white/[0.03] sm:left-8" />
            <div className="absolute right-6 top-0 h-full w-px bg-white/[0.03] sm:right-8" />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-neon-500/[0.07] to-transparent" />
          </div>

          <div
            className="relative flex h-full flex-col overflow-y-auto px-6 pb-8 pt-24 sm:px-12"
            style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
          >
            <div className="mb-4 sm:mb-8">
              <span className={cn("-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600", mm)}>
                {t("navigation")}
              </span>
            </div>

            <nav aria-label="Mobil gezinme" className="flex flex-col gap-1">
              {linkKeys.map((link, i) => (
                <MobileNavLink key={link.key} href={link.href} label={t(link.key)}
                  isActive={path === link.href} index={i} onClick={closeMobile} mm={mm} />
              ))}

              <div className="relative">
                <button
                  type="button"
                  aria-expanded={mobileServicesOpen}
                  aria-controls="mobile-services-panel"
                  className={cn("relative flex min-h-[52px] w-full items-center gap-4 py-1.5 sm:py-3", FOCUS_RING)}
                  onClick={() => setMobileServicesOpen((v) => !v)}
                >
                  <span aria-hidden="true" className="-mono text-xs tabular-nums text-zinc-600">{String(linkKeys.length + 1).padStart(2, "0")}</span>
                  <span className={cn("-navbar text-[14px] xs:text-xl sm:text-3xl font-bold tracking-tight text-zinc-400", mm)}>
                    {navLabel(t("services"))}
                  </span>
                  <XipIcon
                    name="chevron-down"
                    glow="none"
                    className={cn("h-4 w-4 text-zinc-600 transition-transform duration-300", mobileServicesOpen && "rotate-180")}
                  />
                </button>
                {mobileServicesOpen && (
                  <div id="mobile-services-panel" className="flex flex-col gap-2 overflow-hidden pb-2 pl-10">
                    <MobileServiceItems onClose={closeMobile} t={tServices} />
                  </div>
                )}
                <span aria-hidden="true" className="absolute bottom-0 left-8 right-0 h-px bg-white/5" />
              </div>
            </nav>

            <div className="mt-auto pt-6">
              <button
                type="button"
                onClick={() => {
                  closeMobile();
                  teklifModal.open();
                }}
                className={cn(
                  "btn-glint btn-squash mb-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-neon-500/40 bg-gradient-to-br from-neon-500/25 via-neon-600/12 to-neon-500/20 px-7 py-3.5 text-sm font-bold tracking-wide text-neon-300",
                  FOCUS_RING
                )}
              >
                <XipIcon name="zap" glow="strong" halo="red" className="h-3.5 w-3.5 shrink-0" />
                {navLabel(t("GetQuote"))}
              </button>
              <div className="mb-3 h-px w-full bg-white/5" />
              <div className="flex items-center justify-between">
                <p className={cn("-mono mr-2 truncate text-[10px] uppercase tracking-widest text-zinc-600", mm)}>
                  {t("brandName")}
                </p>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeMobile();
                      signOut();
                    }}
                    className={cn("inline-flex min-h-[44px] items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 -mono", mm, FOCUS_RING)}
                  >
                    <XipIcon name="log-out" glow="soft" className="h-4 w-4" />
                    {navLabel(t("loGout"))}
                  </button>
                ) : (
                  <MseLink
                    href="/login"
                    onClick={closeMobile}
                    className={cn("inline-flex min-h-[44px] items-center gap-2 text-xs uppercase tracking-wider text-prism-violet -mono", mm, FOCUS_RING)}
                  >
                    <XipIcon name="log-in" glow="strong" className="h-4 w-4" />
                    {navLabel(t("loGin"))}
                  </MseLink>
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
