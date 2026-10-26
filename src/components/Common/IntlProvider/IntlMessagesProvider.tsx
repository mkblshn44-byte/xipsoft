"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { useLanguage } from "@/hooks/useLanguage";

/**
 * IntlMessagesProvider — dil seçimini istemci tarafında uygular.
 *
 * Sunucu, kendisine verilen `[locale]` segmentinin messages paketini render eder
 * (bkz. src/app/[locale]/layout.tsx — setRequestLocale + getMessages). Kök
 * layout'ta getLocale()/getMessages() KULLANILMAZ, çünkü o çağrılar middleware
 * header'ını okuyup tüm siteyi dinamikleştirir ve ISR'i (revalidate) kapatır.
 * Kullanıcı Homebar'dan dil değiştirdiğinde:
 *   1. LanguageContext locale'i günceller (reload GEREKMEZ)
 *   2. Bu provider ilgili messages/*.json'u dinamik import eder
 *   3. Yalnızca paket hazır olduğunda locale değiştirilir → boş/yanlış çeviri
 *      gösterilmez (TR metin görünür kalır, ardından EN'e geçilir)
 */
export default function IntlMessagesProvider({
  serverLocale,
  serverMessages,
  children,
}: {
  serverLocale: string;
  serverMessages: Record<string, unknown>;
  children: ReactNode;
}) {
  const { locale } = useLanguage();
  const [loaded, setLoaded] = useState<{ locale: string; messages: Record<string, unknown> } | null>(null);

  useEffect(() => {
    if (locale === serverLocale) return;

    let cancelled = false;
    // messages/ proje kökünde (src/ değil) → 4 seviye yukarı
    import(`../../../../messages/${locale}.json`)
      .then((mod) => {
        if (!cancelled) setLoaded({ locale, messages: mod.default });
      })
      .catch(() => {
        // messages yüklenemezse mevcut (TR) içerikte kal
      });

    return () => {
      cancelled = true;
    };
  }, [locale, serverLocale]);

  const activeLocale = loaded && loaded.locale === locale ? locale : serverLocale;
  const activeMessages = activeLocale === serverLocale ? serverMessages : loaded!.messages;

  // <html lang> kök layout'ta prerender parametresinden gelir; istemcide dil
  // değiştirilirse (Homebar, reload yok) o öznitelik eskimiş kalır → eşitle.
  useEffect(() => {
    document.documentElement.lang = activeLocale;
  }, [activeLocale]);

  return (
    <NextIntlClientProvider locale={activeLocale} messages={activeMessages} timeZone="Europe/Istanbul">
      {children}
    </NextIntlClientProvider>
  );
}
