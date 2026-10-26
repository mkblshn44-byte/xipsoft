/**
 * Admin Country Blocklist API
 * GET    /api/admin/country-blocklist          — engellenen ülkeleri listele
 * POST   /api/admin/country-blocklist          — ülke ekle
 * DELETE /api/admin/country-blocklist?code=TR  — ülke kaldır
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/pool";
import { invalidateCountryBlockCache } from "@/middleware-utils/country-blocklist";
import { extractAuthContext, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  try {
    const { rows } = await pool.query(
      `SELECT id, country_code, country_name, reason, created_at
       FROM country_blocklist
       ORDER BY created_at DESC`
    );
    return NextResponse.json({ blocklist: rows });
  } catch (err) {
    console.error("[API:country-blocklist] GET error:", err);
    return NextResponse.json({ error: "Veritabanı hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  let body: { country_code?: string; country_name?: string; reason?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }

  const { country_code, country_name = "", reason = "" } = body;
  if (!country_code || typeof country_code !== "string")
    return NextResponse.json({ error: "country_code gerekli" }, { status: 400 });

  const code = country_code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code))
    return NextResponse.json({ error: "ISO 3166-1 alpha-2 formatı gerekli (ör. TR, US)" }, { status: 400 });

  try {
    const { rows } = await pool.query(
      `INSERT INTO country_blocklist (country_code, country_name, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (country_code) DO UPDATE
         SET country_name = EXCLUDED.country_name,
             reason       = EXCLUDED.reason,
             created_at   = CURRENT_TIMESTAMP
       RETURNING id, country_code, country_name, reason, created_at`,
      [code, country_name, reason]
    );
    await invalidateCountryBlockCache(code);
    return NextResponse.json({ entry: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[API:country-blocklist] POST error:", err);
    return NextResponse.json({ error: "Ülke eklenemedi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") || searchParams.get("country_code");
  const id   = searchParams.get("id");

  if (!code && !id)
    return NextResponse.json({ error: "code veya id gerekli" }, { status: 400 });

  try {
    let result;
    if (code) {
      result = await pool.query(
        `DELETE FROM country_blocklist WHERE country_code = $1 RETURNING id, country_code`,
        [code.toUpperCase()]
      );
      await invalidateCountryBlockCache(code);
    } else {
      result = await pool.query(
        `DELETE FROM country_blocklist WHERE id = $1 RETURNING id, country_code`,
        [Number(id)]
      );
      if (result.rows[0]?.country_code) await invalidateCountryBlockCache(result.rows[0].country_code);
    }

    if (result.rows.length === 0)
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });

    return NextResponse.json({ message: "Ülke engeli kaldırıldı", removed: result.rows[0] });
  } catch (err) {
    console.error("[API:country-blocklist] DELETE error:", err);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}

