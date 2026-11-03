"use server";

/**
 * admin-teklif-actions — Admin panelinden teklif görüntüleme ve yönetimi.
 *
 * Yetki tek merkezden (`requireAdminAction`) doğrulanır. Tüm yazma işlemleri
 * `@/lib/db/teklif` üzerinden gider ve durum değişiklikleri olay kaydı üretir.
 */

import { z } from "zod";
import { requireAdminAction } from "@/lib/api-guard";
import {
  getTeklifById,
  getTeklifEvents,
  listTeklifler,
  updateTeklif,
} from "@/lib/db/teklif";
import type { Teklif, TeklifEvent, TeklifStatus } from "@/lib/teklif-shared";

const STATUS_VALUES = [
  "pending",
  "quoted",
  "rejected",
  "payment_reported",
  "paid",
  "in_progress",
  "completed",
] as const;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Bilinmeyen hata";
}

export async function getTekliflerAction(): Promise<{
  success: boolean;
  data: Teklif[];
  error?: string;
}> {
  try {
    await requireAdminAction();
    return { success: true, data: await listTeklifler() };
  } catch (err) {
    return { success: false, data: [], error: errorMessage(err) };
  }
}

export interface TeklifDetail {
  teklif: Teklif;
  events: TeklifEvent[];
}

export async function getTeklifDetailAction(
  id: number,
): Promise<{ success: boolean; data?: TeklifDetail; error?: string }> {
  try {
    await requireAdminAction();
    const teklif = await getTeklifById(id);
    if (!teklif) return { success: false, error: "Teklif bulunamadı" };
    const events = await getTeklifEvents(teklif.id);
    return { success: true, data: { teklif, events } };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

const ItemSchema = z.object({
  title: z.string().min(1, "Kalem başlığı zorunlu").max(200),
  description: z.string().max(500).optional().or(z.literal("")),
  quantity: z.number().positive().max(10000),
  unitPrice: z.number().min(0).max(100000000),
});

const SaveSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(STATUS_VALUES),
  price: z.number().min(0).max(100000000).nullable().optional(),
  payment_method: z.string().max(50).nullable().optional(),
  payment_url: z.string().max(500).nullable().optional().or(z.literal("")),
  items: z.array(ItemSchema).max(50),
  note: z.string().max(500).optional().or(z.literal("")),
});

export type SaveTeklifInput = z.infer<typeof SaveSchema>;

export async function saveTeklifAction(
  raw: unknown,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAction();

    const parsed = SaveSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
    }
    const input = parsed.data;

    const current = await getTeklifById(input.id);
    if (!current) return { success: false, error: "Teklif bulunamadı" };

    // Durum değişmediyse gereksiz olay kaydı üretme.
    const statusChanged = current.status !== input.status;

    const updated = await updateTeklif(
      input.id,
      {
        ...(statusChanged ? { status: input.status as TeklifStatus } : {}),
        price: input.price ?? null,
        payment_method: input.payment_method ?? null,
        payment_url: input.payment_url || null,
        items: input.items.map((item) => ({
          title: item.title,
          description: item.description || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
      input.note || null,
    );

    if (!updated) return { success: false, error: "Teklif güncellenemedi" };
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}
