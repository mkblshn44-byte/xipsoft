"use server";

import pool from "@/lib/database";
import { requireAdminAction } from "@/lib/api-guard";
import {
  ServiceUpdateError,
  updateServiceRecord,
  type ServiceUpdateInput,
} from "@/lib/service-manager";

export type { ServiceUpdateInput } from "@/lib/service-manager";

/**
 * Hizmet kaydını id ile getir (tam satır)
 */
export async function getService(id: number) {
  try {
    await requireAdminAction();
    const { rows } = await pool.query(
      `SELECT * FROM services WHERE id = $1::int LIMIT 1`,
      [id],
    );
    return { success: true, service: rows[0] ?? null };
  } catch (error: any) {
    console.error("[getService] error:", error);
    return { success: false, service: null, error: error.message };
  }
}

/**
 * Hizmet kaydını güncelle — slug değişirse otomatik 301 yönlendirmesi oluşturur.
 */
export async function updateService(id: number, data: ServiceUpdateInput) {
  try {
    await requireAdminAction();
    const result = await updateServiceRecord(id, data);
    return { success: true, slug: result.slug };
  } catch (error: any) {
    console.error("[updateService] error:", error);
    return { success: false, error: error.message };
  }
}
