"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { createTeklif } from "@/lib/db/teklif";
import { sendCustomTelegramMessage } from "@/lib/telegram";

// ── Runtime dogrulama semasi (Zod v4) ────────────────────────────────────────

const ALLOWED_SERVICES = [
  "Web Yazılım & Tasarım",
  "Mobil Uygulama",
  "Masaüstü Yazılım",
  "Siber Güvenlik",
  "SEO & Dijital Pazarlama",
  "Yapay Zeka & Otomasyon",
  "Diger",
] as const;

const SERVICE_ALIASES: Record<string, (typeof ALLOWED_SERVICES)[number]> = {
  "web yazılım & tasarım": "Web Yazılım & Tasarım",
  "özel web yazılım & tasarım": "Web Yazılım & Tasarım",
  "mobil uygulama": "Mobil Uygulama",
  "mobil uygulama geliştirme": "Mobil Uygulama",
  "masaüstü yazılım": "Masaüstü Yazılım",
  "masaüstü yazılım çözümleri": "Masaüstü Yazılım",
  "siber güvenlik": "Siber Güvenlik",
  "siber güvenlik & denetim": "Siber Güvenlik",
  "seo & dijital pazarlama": "SEO & Dijital Pazarlama",
  "teknik seo & büyüme": "SEO & Dijital Pazarlama",
  "seo & dijital": "SEO & Dijital Pazarlama",
  "yapay zeka & otomasyon": "Yapay Zeka & Otomasyon",
  "akıllı otomasyon & yapay zeka": "Yapay Zeka & Otomasyon",
  "diger": "Diger",
  "diğer": "Diger",
  "web & e-ticaret": "Web Yazılım & Tasarım",
  "e-ticaret": "Web Yazılım & Tasarım",
  "bulut bilişim": "Diger",
  "devops & ci/cd otomasyonu": "Diger",
  "veri analizi & iş zekası": "Diger",
  "blockchain & web3 sistemleri": "Diger",
  "hizmetler hub sayfası": "Diger",
};

function normalizeTeklifService(value: string): (typeof ALLOWED_SERVICES)[number] {
  const trimmed = value.trim();
  if (!trimmed) return "Diger";

  const direct = SERVICE_ALIASES[trimmed.toLowerCase()];
  if (direct) return direct;

  const exactMatch = ALLOWED_SERVICES.find(
    (service) => service.toLowerCase() === trimmed.toLowerCase()
  );

  return exactMatch ?? "Diger";
}

const TeklifFormSchema = z.object({
  name: z
    .string()
    .min(2, "Isim en az 2 karakter olmali.")
    .max(100, "Isim 100 karakterden uzun olamaz.")
    .refine((v) => !/<[^>]*>/.test(v), "Isim HTML iceremez.")
    .refine((v) => !/\0/.test(v), "gecersiz karakter."),

  email: z
    .string()
    .email("gecerli bir e-posta adresi giriniz.")
    .max(254, "E-posta adresi cok uzun.")
    .toLowerCase(),

  phone: z
    .string()
    .max(30, "Telefon numarasi 30 karakterden uzun olamaz.")
    .regex(/^[\d\s+\-().]*$/, "Telefon numarasi gecersiz karakter iceriyor.")
    .optional()
    .or(z.literal("")),

  service: z
    .string()
    .min(1, "gecersiz hizmet secimi.")
    .transform((v) => normalizeTeklifService(v)),

  detail: z
    .string()
    .max(2000, "Detay 2000 karakterden uzun olamaz.")
    .refine((v) => !/<script/i.test(v), "Detay alani gecersiz icerik barindiriyor.")
    .optional()
    .or(z.literal("")),

  contactMethod: z.enum(["whatsapp", "email", "telegram"], {
    error: "gecersiz iletisim yontemi.",
  }),
});

export type TeklifFormData = z.infer<typeof TeklifFormSchema>;

async function notifyTeklifToAdmin(data: {
  token: string;
  name: string;
  email: string;
  phone: string | null;
  service: string;
  detail: string | null;
  contactMethod: string;
}): Promise<{ ok: boolean; error?: string }> {
  const escape = (s: string | null | undefined) =>
    (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));

  const text = [
    `<b>Yeni Teklif Talebi</b>`,
    ``,
    `<b>Isim:</b> ${escape(data.name)}`,
    `<b>E-posta:</b> ${escape(data.email)}`,
    data.phone ? `<b>Telefon:</b> ${escape(data.phone)}` : null,
    `<b>Hizmet:</b> ${escape(data.service)}`,
    data.detail ? `<b>Detay:</b> ${escape(data.detail)}` : null,
    `<b>Iletisim:</b> ${escape(data.contactMethod)}`,
    `<b>Token:</b> <code>${escape(data.token)}</code>`,
  ]
    .filter(Boolean)
    .join("\n");

  // Tek merkezi Telegram gönderimi (@/lib/telegram) — ikinci bir fetch kopyası tutulmaz.
  return sendCustomTelegramMessage(text, process.env.TELEGRAM_ADMIN_CHAT_ID);
}

export async function submitTeklifAction(
  rawData: unknown
): Promise<{ success: boolean; token?: string; error?: string }> {
  const parsed = TeklifFormSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "gecersiz form verisi.";
    return { success: false, error: firstError };
  }

  const data = parsed.data;

  try {
    const token = randomUUID();

    try {
      await createTeklif({
        token,
        name: data.name.trim(),
        email: data.email,
        phone: data.phone?.trim() || null,
        service: data.service,
        detail: data.detail?.trim() || null,
      });
    } catch (dbErr: any) {
      // DB erişilemezse teklif kaydı düşer ama kullanıcı akışı devam eder
      // (Telegram bildirimi yine gönderilir, admin token ile takip edebilir).
      console.error("[Teklif] DB kayit hatasi:", dbErr?.message);
    }

    const telegramResult = await notifyTeklifToAdmin({
      token,
      name: data.name.trim(),
      email: data.email,
      phone: data.phone?.trim() || null,
      service: data.service,
      detail: data.detail?.trim() || null,
      contactMethod: data.contactMethod,
    });

    if (!telegramResult.ok) {
      console.error("[Teklif] Telegram bildirimi gonderilemedi:", telegramResult.error);
    }

    try {
      const { auctionEngine } = await import("@/lib/auction-engine");
      auctionEngine.registerBid({
        service: data.service,
        bidderName: data.name.trim(),
        token,
      });
    } catch { /* ignore auction sync errors */ }

    return { success: true, token };
  } catch (err: any) {
    console.error("[Teklif] genel hata:", err?.message);
    return {
      success: false,
      error: err.message || "Sunucu hatasi olustu"
    };
  }
}
