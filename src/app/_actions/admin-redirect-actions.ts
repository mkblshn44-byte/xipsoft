'use server';

import pool from '@/lib/db/pool';
import { requireAdminAction } from '@/lib/api-guard';
import { invalidateRedirectCache, upsertRedirect } from '@/lib/redirect-handler';
import { pausePublishedNodeForRedirectSource } from '@/lib/seo-conflict-guard';
import {
  normalizeRedirectSource,
  normalizeRedirectTarget,
  isRedirectStatus,
  requiresRedirectTarget,
  type RedirectStatus,
} from '@/lib/redirect-utils';

export async function createRedirect(input: {
  sourcePath: string;
  /** 410 için boş bırakılabilir. */
  targetPath?: string;
  statusCode?: RedirectStatus;
}) {
  try {
    const ctx = await requireAdminAction();
    const { sourcePath, statusCode = 301 } = input;

    if (!sourcePath.trim()) {
      return { success: false, error: "Kaynak yol zorunludur" };
    }
    if (!isRedirectStatus(statusCode)) {
      return { success: false, error: "Desteklenmeyen HTTP durum kodu" };
    }

    const normalizedSource = normalizeRedirectSource(sourcePath);
    const trimmedTarget = input.targetPath?.trim() ?? "";
    const normalizedTarget = trimmedTarget ? normalizeRedirectTarget(trimmedTarget) : null;

    if (requiresRedirectTarget(statusCode) && !normalizedTarget) {
      return { success: false, error: "Hedef yol zorunludur" };
    }
    if (!normalizedSource || (normalizedTarget && normalizedSource === normalizedTarget)) {
      return { success: false, error: "Geçerli ve farklı kaynak/hedef adresleri girin" };
    }

    // seo_redirects.created_by kolonu UUID, users.id ise integer.
    // Geçerli bir UUID yoksa NULL yaz (aksi halde "invalid input syntax for uuid" hatası oluşur).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const createdBy = ctx.userId && UUID_RE.test(ctx.userId) ? ctx.userId : null;

    const result = await upsertRedirect(pool, {
      sourcePath: normalizedSource,
      targetPath: normalizedTarget,
      statusCode,
      isActive: true,
      createdBy,
    });

    // Çakışma koruması: bu yolu redirect kaynağı yaptıysak ve altında yayınlı
    // bir ağaç sayfası varsa sayfa duraklar — aksi halde route redirect'i
    // gölgede bırakır ve taşıma kararı çalışmaz.
    await pausePublishedNodeForRedirectSource(normalizedSource);

    return { success: true, redirect: result };
  } catch (error) {
    console.error("createRedirect error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Redirect oluşturulamadı" };
  }
}

export async function listRedirects() {
  try {
    await requireAdminAction();
    const { rows } = await pool.query(
      `SELECT id::text, source_path, target_path, status_code, is_active, created_at
       FROM seo_redirects
       ORDER BY created_at DESC
       LIMIT 100`,
    );
    return { success: true, redirects: rows };
  } catch (error) {
    console.error("listRedirects error:", error);
    return { success: false, redirects: [], error: error instanceof Error ? error.message : "Redirectler alınamadı" };
  }
}

export async function updateRedirect(id: string, input: {
  sourcePath?: string;
  targetPath?: string;
  statusCode?: RedirectStatus;
  isActive?: boolean;
}) {
  try {
    await requireAdminAction();
    const currentResult = await pool.query<{ source_path: string; target_path: string | null; status_code: number }>(
      `SELECT source_path, target_path, status_code FROM seo_redirects WHERE id = $1::uuid LIMIT 1`,
      [id],
    );
    const current = currentResult.rows[0];
    if (!current) return { success: false, error: "Redirect bulunamadı" };
    const nextSource = input.sourcePath === undefined
      ? current.source_path
      : normalizeRedirectSource(input.sourcePath);
    const nextStatus = input.statusCode ?? (current.status_code as RedirectStatus);
    if (!isRedirectStatus(nextStatus)) {
      return { success: false, error: "Desteklenmeyen HTTP durum kodu" };
    }
    // 410'da hedef anlamsızdır: alan her zaman NULL yazılır.
    const nextTarget = nextStatus === 410
      ? null
      : input.targetPath === undefined
        ? current.target_path
        : normalizeRedirectTarget(input.targetPath);
    if (!nextSource || (requiresRedirectTarget(nextStatus) && !nextTarget)) {
      return { success: false, error: requiresRedirectTarget(nextStatus) ? "Hedef yol zorunludur" : "Geçerli bir kaynak adresi girin" };
    }
    if (nextTarget && nextSource === nextTarget) {
      return { success: false, error: "Geçerli ve farklı kaynak/hedef adresleri girin" };
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.sourcePath !== undefined) {
      const normalized = normalizeRedirectSource(input.sourcePath);
      if (!normalized) return { success: false, error: "Geçerli bir kaynak adresi girin" };
      updates.push(`source_path = $${paramIndex++}`);
      values.push(normalized);
    }
    if (input.targetPath !== undefined || nextStatus === 410) {
      updates.push(`target_path = $${paramIndex++}`);
      values.push(nextTarget);
    }
    if (input.statusCode !== undefined) {
      updates.push(`status_code = $${paramIndex++}`);
      values.push(input.statusCode);
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }

    if (updates.length === 0) {
      return { success: false, error: "Güncellenecek alan yok" };
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE seo_redirects
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex}::uuid
       RETURNING id::text, source_path, target_path, status_code, is_active`,
      values,
    );

    if (!result.rows[0]) {
      return { success: false, error: "Redirect bulunamadı" };
    }

    invalidateRedirectCache();
    // Yönlendirme yeniden ACTIVE olduysa aynı yoldaki yayınlı sayfa gölgede
    // kalmasın (çakışma koruması, bkz. createRedirect).
    if (result.rows[0].is_active) {
      await pausePublishedNodeForRedirectSource(result.rows[0].source_path);
    }
    return { success: true, redirect: result.rows[0] };
  } catch (error) {
    console.error("updateRedirect error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Redirect güncellenemedi" };
  }
}

export async function deleteRedirect(id: string) {
  try {
    await requireAdminAction();
    const result = await pool.query<{ source_path: string }>(
      `DELETE FROM seo_redirects WHERE id = $1::uuid RETURNING source_path`,
      [id],
    );
    if (result.rows[0]) invalidateRedirectCache(result.rows[0].source_path);
    return { success: true };
  } catch (error) {
    console.error("deleteRedirect error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Redirect silinemedi" };
  }
}
