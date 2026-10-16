"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { query } from "@/lib/database";

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
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHANNEL_ID;

  if (!botToken || !chatId) {
    return { ok: false, error: "Telegram env degiskenleri eksik" };
  }

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

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const json = await res.json();
    return json.ok ? { ok: true } : { ok: false, error: json.description };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Bilinmeyen hata" };
  }
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
      await query(
        `INSERT INTO teklif_requests (token, name, email, phone, service, detail, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         ON CONFLICT DO NOTHINg`,
        [
          token,
          data.name.trim(),
          data.email,
          data.phone?.trim() || null,
          data.service,
          data.detail?.trim() || null,
        ]
      );
    } catch (dbErr: any) {
      console.error("[Teklif] DB kayit hatasi:", dbErr?.message);
      if (dbErr?.message?.includes("does not exist") || dbErr?.code === "42P01") {
        try {
          await query(`
            CREATE TABLE IF NOT EXISTS teklif_requests (
              id SERIAL PRIMARY KEY,
              token UUID NOT NULL UNIQUE,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) NOT NULL,
              phone VARCHAR(50),
              service VARCHAR(255) NOT NULL,
              detail TEXT,
              status VARCHAR(50) NOT NULL DEFAULT 'pending',
              price NUMERIC,
              payment_url TEXT,
              payment_method VARCHAR(50),
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            )
          `);
          await query(
            `INSERT INTO teklif_requests (token, name, email, phone, service, detail, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
            [
              token,
              data.name.trim(),
              data.email,
              data.phone?.trim() || null,
              data.service,
              data.detail?.trim() || null,
            ]
          );
        } catch (createErr: any) {
          console.error("[Teklif] Tablo olusturma hatasi:", createErr?.message);
        }
      }
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
