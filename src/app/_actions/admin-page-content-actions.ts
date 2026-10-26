"use server";

import pool from "@/lib/db/pool";
import { requireAdminAction } from "@/lib/api-guard";
import { revalidatePath, revalidateTag } from "next/cache";
import { invalidatePageCaches } from "@/lib/redis/page-cache";
import type { HomeHeroCopy } from "@/types/common";

/** Admin guard — tek kaynak: api-guard.requireAdminAction() */
async function requireAdmin() {
  await requireAdminAction();
}

export async function listManagedPageMetadata() {
  try {
    await requireAdmin();
    const { rows } = await pool.query(
      `SELECT id::text, title, category, metadata
       FROM xip_dynamic_content
       WHERE content_type = 'page_meta' AND is_active = TRUE AND deleted_at IS NULL
       ORDER BY order_index, category`,
    );
    return { success: true, pages: rows };
  } catch (error) {
    return { success: false, pages: [], error: error instanceof Error ? error.message : "Sayfa içerikleri alınamadı" };
  }
}

export async function updateManagedPageMetadata(input: {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  jsonLd: Record<string, string>;
  hero?: Partial<HomeHeroCopy>;
}) {
  try {
    await requireAdmin();
    if (!input.id || !input.title.trim() || input.title.length > 200 || input.description.length > 500) {
      return { success: false, error: "Başlık ve meta alanlarını kontrol edin" };
    }
    const existing = await pool.query<{ category: string; metadata: Record<string, unknown> }>(
      `SELECT category, metadata FROM xip_dynamic_content
       WHERE id::text = $1 AND content_type = 'page_meta' AND deleted_at IS NULL LIMIT 1`,
      [input.id],
    );
    const record = existing.rows[0];
    if (!record) return { success: false, error: "Sayfa içeriği bulunamadı" };

    const metadata: Record<string, unknown> = {
      ...(record.metadata ?? {}),
      description: input.description,
      keywords: input.keywords.map((keyword) => keyword.trim()).filter(Boolean),
      ogTitle: input.ogTitle,
      ogDescription: input.ogDescription,
      jsonLd: input.jsonLd,
    };
    if (record.category === "home" && input.hero) metadata.hero = input.hero;

    await pool.query(
      `UPDATE xip_dynamic_content
       SET title = $2, metadata = $3::jsonb, updated_at = NOW()
       WHERE id::text = $1 AND content_type = 'page_meta' AND deleted_at IS NULL`,
      [input.id, input.title.trim(), JSON.stringify(metadata)],
    );
    revalidateTag(`page-meta:${record.category}`);
    revalidateTag("page-content");
    revalidatePath(record.category === "home" ? "/" : `/${record.category}`);
    await invalidatePageCaches({ categories: [record.category] });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Sayfa içeriği kaydedilemedi" };
  }
}

export async function listManagedPageFaqs(category: string) {
  try {
    await requireAdmin();
    const { rows } = await pool.query(
      `SELECT id::text, title AS question, metadata->>'answer' AS answer, is_active
       FROM xip_dynamic_content
       WHERE content_type = 'page_faq' AND category = $1 AND deleted_at IS NULL
       ORDER BY order_index, id`,
      [category],
    );
    return { success: true, faqs: rows };
  } catch (error) {
    return { success: false, faqs: [], error: error instanceof Error ? error.message : "SSS kayıtları alınamadı" };
  }
}

export async function saveManagedPageFaq(input: {
  id?: string;
  category: string;
  question: string;
  answer: string;
}) {
  try {
    await requireAdmin();
    const question = input.question.trim();
    const answer = input.answer.trim();
    if (!input.category || !question || !answer || question.length > 300 || answer.length > 5000) {
      return { success: false, error: "Soru ve yanıt alanlarını kontrol edin" };
    }

    if (input.id) {
      const result = await pool.query(
        `UPDATE xip_dynamic_content
         SET title = $2, metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{answer}', to_jsonb($3::text), TRUE), updated_at = NOW()
         WHERE id::text = $1 AND content_type = 'page_faq' AND category = $4 AND deleted_at IS NULL`,
        [input.id, question, answer, input.category],
      );
      if (!result.rowCount) return { success: false, error: "SSS kaydı bulunamadı" };
    } else {
      const { rows } = await pool.query<{ next_order: number }>(
        `SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order
         FROM xip_dynamic_content WHERE content_type = 'page_faq' AND category = $1`,
        [input.category],
      );
      const slug = `page-faq-${crypto.randomUUID()}`;
      await pool.query(
        `INSERT INTO xip_dynamic_content (content_type, title, slug, category, metadata, order_index, is_active)
         VALUES ('page_faq', $1, $2, $3, jsonb_build_object('answer', $4::text), $5, TRUE)`,
        [question, slug, input.category, answer, rows[0]?.next_order ?? 1],
      );
    }

    revalidateTag(`page-faq:${input.category}`);
    revalidateTag("page-content");
    revalidatePath(input.category === "home" ? "/" : `/${input.category}`);
    await invalidatePageCaches({ categories: [input.category] });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "SSS kaydedilemedi" };
  }
}

export async function deleteManagedPageFaq(id: string, category: string) {
  try {
    await requireAdmin();
    const result = await pool.query(
      `UPDATE xip_dynamic_content
       SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
       WHERE id::text = $1 AND content_type = 'page_faq' AND category = $2 AND deleted_at IS NULL`,
      [id, category],
    );
    if (!result.rowCount) return { success: false, error: "SSS kaydı bulunamadı" };
    revalidateTag(`page-faq:${category}`);
    revalidateTag("page-content");
    revalidatePath(category === "home" ? "/" : `/${category}`);
    await invalidatePageCaches({ categories: [category] });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "SSS silinemedi" };
  }
}