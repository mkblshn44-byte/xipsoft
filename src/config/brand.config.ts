/**
 * XipSoft — Tekil Konfigürasyon Dosyasi
 *
 * Tum marka, uygulama, font ve sunucu ayarlari burada.
 * Bu dosyayi degistirince tum sistemde otomatik guncellenir.
 */

import { SITE_URL } from "@/lib/site-url";
import { PALETTE } from "@/config/palette";

// ─── SITE URL ──────────────────────────────────────────────────────────────
export { SITE_URL };

export const APP_CONFIG = {
  // Meta title — ana anahtar kelimeler öne alındı (60 karakter sınırı içinde)
  title: process.env.NEXT_PUBLIC_APP_TITLE || "XipSoft | Kurumsal Web Tasarım, Özel Yazılım & Siber Güvenlik",
  // Meta description — arama niyetine uygun, somut değer önerileri içeriyor (155 karakter)
  description:
    "Next.js 15 ile yüksek hızlı kurumsal web siteleri, özel yazılım ve mobil uygulamalar. 15 yıl deneyim, 200+ proje. İstanbul merkezli — ücretsiz analiz alın.",
} as const;

export default APP_CONFIG;

// ─── FONT ──────────────────────────────────────────────────────────────────
export const defaultFont = "font-body";

// ─── SUNUCU: gORS Yukleme (server-only) ────────────────────────────────────
export const IMgBB_API_KEY = process.env.IMgBB_API_KEY || "";

// ─── KIMLIK ────────────────────────────────────────────────────────────────

export const BRAND = {
  name: "XipSoft Yazılım ve Teknoloji Sistemleri",
  shortName: "XipSoft",
  tagline: "Yazilim & Teknoloji Sistemleri",
  description:
    "Yazilimda guven, tasarimda fark, sonucta mukeysellik. Web, mobil, masaustu ve siber guvenlik cozumleri.",
  url: SITE_URL,
  email: "info@xipsoft.net",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "905444548444",
} as const;

// ─── RENKLER ───────────────────────────────────────────────────────────────

export const BRAND_COLORS = {
  primary: PALETTE.neon[500],      // safir mavi — ana vurgu (merkezi palet)
  secondary: PALETTE.accent.cyan,  // açık mavi — ikincil aksan (eski cyan token adı)
  accent: PALETTE.neon[500],       // (eski ad: üçüncül vurgu)
  accentDeep: PALETTE.neon[600],   // derin mavi — ikon renkleri için çeşitlilik tonu
  gold: PALETTE.accent.gold,       // NADİR premium altın (yalnızca CTA / aktif menü çizgisi)
  background: PALETTE.space[950],  // uzay zemini
  themeColor: PALETTE.space[950],  // PWA theme color
  manifestBg: PALETTE.space[950],  // manifest background_color
} as const;

// ─── IKONLAR & LOgO ───────────────────────────────────────────────────────

export const BRAND_ICONS = {
  favicon: "/media/favicon.ico",
  appleTouchIcon: "/media/favicon-180.png",
  safariPinnedTab: "/media/favicon.ico",
  /** Krom X/S wordmark — navbar/footer/OG (eski bronza versiyon: /media/logo-bronze.webp) */
  logo: "/media/logo.webp",
  /** Rozet logosu (kare, asfalt zeminli) — filigran ve PWA ikonları */
  mark: "/media/logo-steel.webp",
  homebar: "/media/homebar.webp",
  ogImage: "/media/xipsoft-seo.webp",
  // PWA ikonlari (kare rozet — `maskable` için güvenli)
  icon192: "/media/favicon-192.png",
  icon384: "/media/favicon-512.png",
  icon512: "/media/favicon-512.png",
} as const;

export const DEFAULT_OG_IMAGE_URL = `${SITE_URL}${BRAND_ICONS.ogImage}`;

// ─── SAYFA RENKLERI ────────────────────────────────────────────────────────

export const PAgE_ACCENTS: Record<string, string> = {
  home:        BRAND_COLORS.primary,
  about:       BRAND_COLORS.primary,
  references:  BRAND_COLORS.secondary,
  services:    BRAND_COLORS.primary,
  aboutWhy:    BRAND_COLORS.primary,
  refSectors:  BRAND_COLORS.secondary,
} as const;

// ─── KURUMSAL / YASAL BILgILER ─────────────────────────────────────────────

export const BRAND_COMPANY = {
  legalName:    "XipSoft Yazilim ve Teknoloji Sistemleri",
  address:      "Nurol Tower, Izzet Pasa, Yeni Yol Cd. No:3 Kat:22, 34381 sisli / Istanbul",
  addressShort: "Nurol Tower, Kat:22, sisli / Istanbul",
  district:     "sisli",
  city:         "Istanbul",
  postalCode:   "34381",
  country:      "Turkiye",
  countryCode:  "TR",
  phone:        "+90 544 454 84 44",
  email:        "info@xipsoft.net",
  taxOffice:    "",
  taxNumber:    "",
  mersisNo:     "",
  foundingYear: 2010,
  geo: {
    lat: 41.0682,
    lng: 28.9862,
  },
  mapsUrl:      "https://maps.google.com/?q=Nurol+Tower+Mecidiyekoy+Sisli+Istanbul&ll=41.0682,28.9862",
  workingHours: "Pazartesi – Cuma, 09:00 – 18:00",
} as const;
