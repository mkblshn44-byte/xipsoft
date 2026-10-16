"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

export type { Locale };

export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isTurkish: boolean;
  isEnglish: boolean;
  isXipSoft: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getPathnameWithoutLocale(pathname: string) {
  const locales = routing.locales as readonly string[];
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0])) {
    return "/" + segments.slice(1).join("/");
  }
  return pathname;
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();

  // NOT: useLocale() burada KULLANILAMAZ — LanguageProvider, NextIntlClientProvider
  // ağacının DIŞINDA yer alır (root layout: LanguageProvider → IntlMessagesProvider).
  // Locale'i pathname'den türetiyoruz (A seçeneği):
  //   tr kökte (/hakkimizda), diğer diller önekli (/en/hakkimizda).
  const segments = pathname.split("/").filter(Boolean);
  const locale = (
    segments.length > 0 && routing.locales.includes(segments[0] as Locale)
      ? segments[0]
      : routing.defaultLocale
  ) as Locale;

  const setLocale = useCallback(
    (newLocale: Locale) => {
      if (newLocale === locale) return;
      const base = getPathnameWithoutLocale(pathname);
      const suffix = base === "/" ? "" : base;
      const target =
        newLocale === routing.defaultLocale
          ? suffix || "/"
          : `/${newLocale}${suffix}`;
      router.push(target);
    },
    [locale, pathname, router]
  );

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        isTurkish: locale === "tr",
        isEnglish: locale === "en",
        isXipSoft: true,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Provider dışında kullanılırsa — fail-open (default değerler)
    return {
      locale: "tr",
      setLocale: () => {},
      isTurkish: true,
      isEnglish: false,
      isXipSoft: true,
    };
  }
  return ctx;
}
