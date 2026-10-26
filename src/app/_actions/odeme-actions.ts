"use server";

/**
 * odeme-actions — Havale/EFT ödeme bildirimi.
 *
 * İki kullanım:
 *   1. Tokenlı teklif akışı  → `teklif_requests.status = 'payment_reported'`
 *      yapılır, olay kaydı düşülür ve admin'e Telegram gider.
 *   2. Token'sız ürün akışı  → yalnız admin'e Telegram bildirimi (mevcut
 *      `/odeme?product=...` davranışı korunur).
 */

import { z } from "zod";
import { getTeklifByToken, reportTeklifPayment } from "@/lib/db/teklif";
import { sendCustomTelegramMessage, escapeHtml } from "@/lib/telegram";
import { SITE_URL } from "@/lib/site-url";
import { formatTry, isValidToken, teklifReferenceCode } from "@/lib/teklif-shared";

const PaymentReportSchema = z.object({
  token: z.string().max(128).optional().or(z.literal("")),
  name: z.string().min(2, "Ad soyad zorunlu").max(100),
  email: z.string().email("Geçerli bir e-posta girin").max(254).toLowerCase(),
  phone: z.string().max(30).optional().or(z.literal("")),
  note: z.string().max(1000).optional().or(z.literal("")),
  productName: z.string().max(200).optional().or(z.literal("")),
  productPrice: z.string().max(40).optional().or(z.literal("")),
});

export interface PaymentReportResult {
  success: boolean;
  /** Başarılıysa istemcinin yönleneceği yol (tokenlı akışta takip sayfası). */
  redirect?: string;
  error?: string;
}

export async function reportPaymentAction(raw: unknown): Promise<PaymentReportResult> {
  const parsed = PaymentReportSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi." };
  }

  const data = parsed.data;
  const token = isValidToken(data.token) ? data.token : null;

  try {
    if (token) {
      const teklif = await getTeklifByToken(token);
      if (!teklif) {
        return { success: false, error: "Teklif bulunamadı." };
      }

      await reportTeklifPayment(token, data.note?.trim() || null);

      await notifyAdmin([
        `<b>💰 Ödeme Bildirimi (Havale/EFT)</b>`,
        ``,
        `<b>Referans:</b> <code>${escapeHtml(teklifReferenceCode(teklif))}</code>`,
        `<b>Bildiren:</b> ${escapeHtml(data.name)}`,
        `<b>E-posta:</b> ${escapeHtml(data.email)}`,
        data.phone ? `<b>Telefon:</b> ${escapeHtml(data.phone)}` : null,
        `<b>Hizmet:</b> ${escapeHtml(teklif.service)}`,
        `<b>Tutar:</b> ${escapeHtml(formatTry(teklif.price))}`,
        data.note ? `<b>Not:</b> ${escapeHtml(data.note)}` : null,
        ``,
        `Takip: ${SITE_URL}/takip/${token}`,
      ]);

      return { success: true, redirect: `/takip/${token}` };
    }

    // Token'sız ürün ödeme bildirimi
    await notifyAdmin([
      `<b>💰 Ödeme Bildirimi (Ürün)</b>`,
      ``,
      `<b>Ürün:</b> ${escapeHtml(data.productName || "—")}`,
      data.productPrice ? `<b>Tutar:</b> ${escapeHtml(formatTry(data.productPrice))}` : null,
      `<b>Bildiren:</b> ${escapeHtml(data.name)}`,
      `<b>E-posta:</b> ${escapeHtml(data.email)}`,
      data.phone ? `<b>Telefon:</b> ${escapeHtml(data.phone)}` : null,
      data.note ? `<b>Not:</b> ${escapeHtml(data.note)}` : null,
    ]);

    return { success: true };
  } catch (err) {
    console.error("[odeme] ödeme bildirimi hatası:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bildirim gönderilemedi.",
    };
  }
}

/** Telegram bildirimi — boş satırlar temizlenir, hata akışı bozmaz. */
async function notifyAdmin(lines: Array<string | null>): Promise<void> {
  const text = lines.filter((line): line is string => Boolean(line)).join("\n");
  const result = await sendCustomTelegramMessage(text);
  if (!result.ok) {
    console.error("[odeme] Telegram bildirimi gönderilemedi:", result.error);
  }
}
