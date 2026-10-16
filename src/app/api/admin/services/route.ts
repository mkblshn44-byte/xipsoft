/**
 * Admin Services API
 * GET   /api/admin/services          — hizmet listesi
 * PATCH /api/admin/services          — aktif/pasif toggle veya sıralama
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import pool from "@/lib/database";
import { extractAuthContext, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  try {
    const { rows } = await pool.query(
      `SELECT id, slug, title, subtitle, is_active, sort_order, created_at
       FROM services
       ORDER BY sort_order ASC, id ASC`
    );
    return NextResponse.json({ ok: true, services: rows });
  } catch (err) {
    console.error("[API:services] GET error:", err);
    return NextResponse.json({ ok: false, error: "Veriler alınamadı" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  let body: { id?: number; is_active?: boolean; reorder?: "up" | "down" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON" }, { status: 400 });
  }

  const { id, is_active, reorder } = body;
  if (!id) return NextResponse.json({ ok: false, error: "id gerekli" }, { status: 400 });

  try {
    if (reorder) {
      // Mevcut sırayı al
      const { rows } = await pool.query(
        `SELECT id, sort_order FROM services ORDER BY sort_order ASC, id ASC`
      );
      const idx = rows.findIndex((r: { id: number }) => r.id === id);
      if (idx === -1) return NextResponse.json({ ok: false, error: "Kayıt bulunamadı" }, { status: 404 });

      const swapIdx = reorder === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= rows.length) {
        return NextResponse.json({ ok: true });
      }

      const current = rows[idx];
      const swap = rows[swapIdx];

      await pool.query(
        `UPDATE services SET sort_order = $1 WHERE id = $2`,
        [swap.sort_order, current.id]
      );
      await pool.query(
        `UPDATE services SET sort_order = $1 WHERE id = $2`,
        [current.sort_order, swap.id]
      );

      revalidateTag("services");
      // Tek catch-all şablon: /hizmetler/[...slug] (detay + il/ilçe varyasyonları)
      revalidatePath("/hizmetler/[...slug]", "page");

      return NextResponse.json({ ok: true });
    }

    if (typeof is_active === "boolean") {
      const { rows } = await pool.query<{ slug: string }>(
        `UPDATE services SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING slug`,
        [is_active, id]
      );
      const updatedService = rows[0];
      if (!updatedService) return NextResponse.json({ ok: false, error: "Kayıt bulunamadı" }, { status: 404 });
      const serviceSlug = updatedService.slug;

      revalidateTag("services");
      revalidateTag(`service:${serviceSlug}`);
      revalidatePath(`/hizmetler/${serviceSlug}`);
      revalidatePath(`/hizmetler/${serviceSlug}`, "page");
      revalidatePath("/hizmetler/[...slug]", "page");

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "is_active veya reorder gerekli" }, { status: 400 });
  } catch (err) {
    console.error("[API:services] PATCH error:", err);
    return NextResponse.json({ ok: false, error: "Güncelleme başarısız" }, { status: 500 });
  }
}
