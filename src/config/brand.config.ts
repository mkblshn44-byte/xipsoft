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

export const APP_CONFIg = {
  // Meta title — ana anahtar kelimeler öne alındı (60 karakter sınırı içinde)
  title: process.env.NEXT_PUBLIC_APP_TITLE || "XipSoft | Kurumsal Web Tasarım, Özel Yazılım & Siber Güvenlik",
  // Meta description — arama niyetine uygun, somut değer önerileri içeriyor (155 karakter)
  description:
    "Next.js 15 ile yüksek hızlı kurumsal web siteleri, özel yazılım ve mobil uygulamalar. 15 yıl deneyim, 200+ proje. İstanbul merkezli — ücretsiz analiz alın.",
} as const;

export const APP_CONFIG = APP_CONFIg;
export default APP_CONFIg;

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
  primary: PALETTE.neon[500],     // neon mor — ANA VURGU (merkezi palet)
  secondary: PALETTE.accent.cyan,  // cyan — ikincil aksan
  accent: PALETTE.neon[500],       // mor — (eski ad: üçüncül) artık marka moru
  gold: PALETTE.accent.cyan,       // cyan — (eski ad: gold) artık ikincil cyan
  background: PALETTE.space[950],  // uzay zemini
  themeColor: PALETTE.space[950],  // PWA theme color
  manifestBg: "#483b97",           // manifest background_color
} as const;

// ─── IKONLAR & LOgO ───────────────────────────────────────────────────────

export const BRAND_ICONS = {
  favicon: "/images/favicon.ico",
  appleTouchIcon: "/media/logo.webp",
  safariPinnedTab: "/images/favicon.ico",
  logo: "/media/logo.webp",
  homebar: "/media/homebar.webp",
  ogImage: "/images/xipsoft-seo.png",
  // PWA ikonlari
  icon192: "/media/logo.webp",
  icon384: "/media/logo.webp",
  icon512: "/media/logo.webp",
} as const;

// ─── SAYFA RENKLERI ────────────────────────────────────────────────────────

export const PAgE_ACCENTS: Record<string, string> = {
  home:        "#a78bfa",  // mor   — anasayfa
  about:       "#a78bfa",  // mor   — hakkinda
  references:  "#ddd6fe",  // cyan  — referanslar
  services:    "#a78bfa",  // mor   — hizmetler
  aboutWhy:    "#a78bfa",  // mor   — hakkinda neden xipsoft
  refSectors:  "#ddd6fe",  // cyan  — referanslar sektorler
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
