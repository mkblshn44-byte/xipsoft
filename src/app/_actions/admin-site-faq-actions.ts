"use server";

import pool from "@/lib/db/pool";
import { requireAdminAction } from "@/lib/api-guard";
import { revalidatePath, revalidateTag } from "next/cache";
import { invalidateServiceCaches } from "@/lib/redis/page-cache";

/**
 * Genel site SSS yönetimi — `xip_dynamic_content` tablosunda
 * `content_type = 'faq'` olan kayıtlar. Bu SSS'ler hizmetler hub sayfasında
 * (/hizmetler) hizmet bazlı SSS yoksa fallback olarak gösterilir.
 */

export async function listSiteFaqs() {
  try {
    await requireAdminAction();
    const { rows } = await pool.query(
      `SELECT id::text, title AS question, metadata->>'answer' AS answer,
              is_active, order_index
       FROM xip_dynamic_content
       WHERE content_type = 'faq' AND deleted_at IS NULL
       ORDER BY order_index ASC, id ASC`,
    );
    return { success: true, faqs: rows };
  } catch (error) {
    console.error("listSiteFaqs error:", error);
    return {
      success: false,
      faqs: [],
      error: error instanceof Error ? error.message : "SSS kayıtları alınamadı",
    };
  }
}

export async function saveSiteFaq(input: {
  id?: string;
  question: string;
  answer: string;
  isActive?: boolean;
}) {
  try {
    await requireAdminAction();
    const question = input.question.trim();
    const answer = input.answer.trim();
    if (!question || !answer || question.length > 300 || answer.length > 5000) {
      return { success: false, error: "Soru ve yanıt alanlarını kontrol edin" };
    }

    if (input.id) {
      const result = await pool.query(
        `UPDATE xip_dynamic_content
         SET title = $2,
             metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{answer}', to_jsonb($3::text), TRUE),
             is_active = COALESCE($4, is_active),
             updated_at = NOW()
         WHERE id::text = $1 AND content_type = 'faq' AND deleted_at IS NULL`,
        [input.id, question, answer, input.isActive ?? null],
      );
      if (!result.rowCount) return { success: false, error: "SSS kaydı bulunamadı" };
    } else {
      const { rows } = await pool.query<{ next_order: number }>(
        `SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order
         FROM xip_dynamic_content WHERE content_type = 'faq'`,
      );
      const slug = `genel-sss-${crypto.randomUUID()}`;
      await pool.query(
        `INSERT INTO xip_dynamic_content (content_type, title, slug, category, metadata, order_index, is_active)
         VALUES ('faq', $1, $2, 'faq', jsonb_build_object('answer', $3::text), $4, $5)`,
        [question, slug, answer, rows[0]?.next_order ?? 1, input.isActive ?? true],
      );
    }

    revalidateTag("services");
    revalidateTag("sitemap");
    revalidatePath("/hizmetler");
    await invalidateServiceCaches();
    return { success: true };
  } catch (error) {
    console.error("saveSiteFaq error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SSS kaydedilemedi",
    };
  }
}

export async function setSiteFaqActive(id: string, isActive: boolean) {
  try {
    await requireAdminAction();
    const result = await pool.query(
      `UPDATE xip_dynamic_content
       SET is_active = $2, updated_at = NOW()
       WHERE id::text = $1 AND content_type = 'faq' AND deleted_at IS NULL`,
      [id, isActive],
    );
    if (!result.rowCount) return { success: false, error: "SSS kaydı bulunamadı" };
    revalidateTag("services");
    revalidatePath("/hizmetler");
    await invalidateServiceCaches();
    return { success: true };
  } catch (error) {
    console.error("setSiteFaqActive error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Durum güncellenemedi",
    };
  }
}

export async function deleteSiteFaq(id: string) {
  try {
    await requireAdminAction();
    const result = await pool.query(
      `UPDATE xip_dynamic_content
       SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
       WHERE id::text = $1 AND content_type = 'faq' AND deleted_at IS NULL`,
      [id],
    );
    if (!result.rowCount) return { success: false, error: "SSS kaydı bulunamadı" };
    revalidateTag("services");
    revalidateTag("sitemap");
    revalidatePath("/hizmetler");
    await invalidateServiceCaches();
    return { success: true };
  } catch (error) {
    console.error("deleteSiteFaq error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SSS silinemedi",
    };
  }
}
