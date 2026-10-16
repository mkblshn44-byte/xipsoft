"use client";

/**
 * Navbar — Neon Landing üst menüsü (neonblack-main `site-header` uyarlaması).
 *
 * UYARLAMA NOTLARI:
 * - shadcn token sınıfları (`bg-background`, `text-foreground`, `text-primary`,
 *   `text-accent`, `bg-primary` …) → XipSoft `neon` paleti (`text-neon-fg`,
 *   `text-neon-primary`, `bg-neon-primary` …). Böylece Tailwind v3 kurulumunda
 *   da doğru renkler üretilir.
 * - `<a href="#...">` bağlantıları gerçek XipSoft rotalarına çevrildi.
 * - Dekoratif "Dil seçimi" butonu, mevcut `useLanguage` altyapısına bağlanarak
 *   çalışan bir dil menüsüne dönüştürüldü (ölü buton bırakılmadı).
 * - `h-svh`/`h-screen` yerine XipSoft `(site)` layout akışına bırakıldı:
 *   header `absolute` konumlanır ve `Hero` ile aynı `relative` kapsayıcıda
 *   render edilir (bkz. HomePageComponents).
 */

import { useState } from "react";
import Link from "next/link";
import { Globe, Menu, Phone, X } from "lucide-react";
import { BRAND_COMPANY } from "@/config/brand.config";
import { useLanguage, type Locale } from "@/hooks/useLanguage";
import { cn } from "@/utils";

const NAV_ITEMS = [
  { label: "Hizmetlerimiz", href: "/hizmetler" },
  { label: "Kurumsal", href: "/hakkimizda" },
  { label: "Referanslar", href: "/references" },
  { label: "Blog", href: "/blog" },
  { label: "İletişim", href: "/contact-us" },
] as const;

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "ru", label: "Русский" },
];

const PHONE_DISPLAY = BRAND_COMPANY.phone;
const PHONE_TEL = `tel:${BRAND_COMPANY.phone.replace(/[^+\d]/g, "")}`;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { locale, setLocale } = useLanguage();

  return (
    <header className="absolute inset-x-0 top-0 z-30 animate-hero-fade">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-6 lg:px-8">
        <Link
          href="/"
          className="text-2xl font-semibold tracking-tight text-neon-fg"
          aria-label="XipSoft ana sayfa"
        >
          XipSoft
          <span className="text-neon-accent [text-shadow:0_0_12px_#ddd6fe]">.</span>
        </Link>

        <nav aria-label="Ana menü" className="hidden items-center gap-8 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-neon-fg/75 transition-colors hover:text-neon-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href={PHONE_TEL}
            className="hidden items-center gap-2 text-sm text-neon-fg/85 transition-colors hover:text-neon-accent md:flex"
          >
            <Phone className="size-4" />
            {PHONE_DISPLAY}
          </a>

          {/* Dil seçimi — çalışan menü (useLanguage) */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              aria-expanded={langOpen}
              aria-haspopup="menu"
              className="flex size-10 items-center justify-center rounded-full text-neon-fg/85 transition-colors hover:text-neon-accent"
            >
              <Globe className="size-5" />
              <span className="sr-only">Dil seçimi</span>
            </button>
            {langOpen && (
              <div
                role="menu"
                aria-label="Dil seçimi"
                className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-2xl border border-neon-fg/10 bg-neon-bg/90 p-2 backdrop-blur-md"
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={locale === lang.code}
                    onClick={() => {
                      setLocale(lang.code);
                      setLangOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-neon-fg/5",
                      locale === lang.code
                        ? "text-neon-accent"
                        : "text-neon-fg/80"
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/teklif"
            className="hidden rounded-full bg-neon-primary px-6 py-2.5 text-sm font-medium text-neon-bg shadow-[0_0_24px_-4px_#a78bfa] transition-shadow hover:shadow-[0_0_36px_0_#a78bfa] sm:inline-flex"
          >
            Teklif Al
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            className="flex size-11 items-center justify-center rounded-full border border-neon-fg/10 bg-neon-fg/5 text-neon-fg backdrop-blur lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
            <span className="sr-only">{open ? "Menüyü kapat" : "Menüyü aç"}</span>
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="landing-mobile-menu"
          aria-label="Mobil menü"
          className="mx-6 flex flex-col gap-1 rounded-3xl border border-neon-primary/30 bg-neon-bg/90 p-4 backdrop-blur-md lg:hidden"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-neon-fg hover:bg-neon-fg/5"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/teklif"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-full bg-neon-primary px-6 py-3 text-center font-medium text-neon-bg shadow-[0_0_24px_-4px_#a78bfa]"
          >
            Teklif Al
          </Link>
        </nav>
      )}
    </header>
  );
}
