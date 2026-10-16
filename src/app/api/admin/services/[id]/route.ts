/**
 * Admin Services [id] API
 * GET  /api/admin/services/[id]  — hizmet detayı (tam satır)
 * PUT  /api/admin/services/[id]  — hizmet güncelleme
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";
import { extractAuthContext, requireAdmin } from "@/lib/api-guard";
import {
  ServiceUpdateError,
  updateServiceRecord,
} from "@/lib/service-manager";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ ok: false, error: "Geçersiz ID" }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT * FROM services WHERE id = $1::int LIMIT 1`,
      [numId]
    );
    if (!rows[0]) {
      return NextResponse.json({ ok: false, error: "Hizmet bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, service: rows[0] });
  } catch (err) {
    console.error("[API:services/[id]] GET error:", err);
    return NextResponse.json({ ok: false, error: "Veri alınamadı" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ ok: false, error: "Geçersiz ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz JSON" }, { status: 400 });
  }

  try {
    const result = await updateServiceRecord(numId, body);
    return NextResponse.json({ ok: true, slug: result.slug });
  } catch (error) {
    if (error instanceof ServiceUpdateError) {
      const status = error.code === "not_found" ? 404 : 400;
      return NextResponse.json({ ok: false, error: error.message }, { status });
    }
    console.error("[API:services/[id]] PUT error:", error);
    return NextResponse.json({ ok: false, error: "Güncelleme başarısız" }, { status: 500 });
  }
}
