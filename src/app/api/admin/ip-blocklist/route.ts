/**
 * Admin IP Blocklist API
 * GET    /api/admin/ip-blocklist         — tüm kayıtları listele
 * POST   /api/admin/ip-blocklist         — yeni IP ekle
 * DELETE /api/admin/ip-blocklist?id=N    — tek kayıt sil
 * DELETE /api/admin/ip-blocklist?clearAll=true — tüm geçici engelleri temizle
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/pool";
import { invalidateIpBlockCache, isLoopbackIp } from "@/middleware-utils/ip-blocklist";
import { extractAuthContext, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  try {
    const { rows } = await pool.query(
      `SELECT id, ip_address, reason, is_permanent, expires_at, created_at
       FROM ip_blocklist
       ORDER BY created_at DESC
       LIMIT 500`
    );
    return NextResponse.json({ blocklist: rows });
  } catch (err) {
    console.error("[API:ip-blocklist] GET error:", err);
    return NextResponse.json(
      { error: "Veritabanı hatası", message: "Kayıtlar alınamadı" },
      { status: 500 }
    );
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  let body: {
    ip_address?: string;
    reason?: string;
    is_permanent?: boolean;
    expires_hours?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const { ip_address, reason = "", is_permanent = true, expires_hours = 24 } = body;

  // Basit IP doğrulama (IPv4 veya IPv6)
  if (!ip_address || typeof ip_address !== "string") {
    return NextResponse.json(
      { error: "ip_address gerekli" },
      { status: 400 }
    );
  }

  const trimmedIp = ip_address.trim();
  if (trimmedIp.length === 0 || trimmedIp.length > 45) {
    return NextResponse.json(
      { error: "Geçersiz IP adresi" },
      { status: 400 }
    );
  }

  if (isLoopbackIp(trimmedIp)) {
    return NextResponse.json(
      { error: "Loopback/localhost IP'leri engellenemez" },
      { status: 400 }
    );
  }

  try {
    const expiresAt = is_permanent
      ? null
      : new Date(Date.now() + expires_hours * 60 * 60 * 1000);

    const { rows } = await pool.query(
      `INSERT INTO ip_blocklist (ip_address, reason, is_permanent, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ip_address) DO UPDATE
         SET reason = EXCLUDED.reason,
             is_permanent = EXCLUDED.is_permanent,
             expires_at = EXCLUDED.expires_at,
             created_at = CURRENT_TIMESTAMP
       RETURNING id, ip_address, reason, is_permanent, expires_at, created_at`,
      [trimmedIp, reason, is_permanent, expiresAt]
    );

    // Cache'i temizle ki yeni engel hemen geçerli olsun
    await invalidateIpBlockCache(trimmedIp);

    return NextResponse.json({ entry: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("[API:ip-blocklist] POST error:", err);
    return NextResponse.json(
      { error: "Veritabanı hatası", message: "IP eklenemedi" },
      { status: 500 }
    );
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const clearAll = searchParams.get("clearAll");

  try {
    if (clearAll === "true") {
      // Tüm geçici (süreli) engelleri kaldır
      const { rows } = await pool.query(
        `DELETE FROM ip_blocklist
         WHERE is_permanent = false
         RETURNING ip_address`
      );
      // Cache'i tamamen temizle
      await invalidateIpBlockCache();
      return NextResponse.json({
        message: `${rows.length} geçici engel kaldırıldı`,
        removed: rows.length,
      });
    }

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "Geçerli bir id veya clearAll=true gerekli" },
        { status: 400 }
      );
    }

    const { rows } = await pool.query(
      `DELETE FROM ip_blocklist WHERE id = $1 RETURNING ip_address`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
    }

    // Silinen IP'nin cache'ini temizle
    await invalidateIpBlockCache(rows[0].ip_address);

    return NextResponse.json({ message: "Engel kaldırıldı", id: Number(id) });
  } catch (err) {
    console.error("[API:ip-blocklist] DELETE error:", err);
    return NextResponse.json(
      { error: "Veritabanı hatası", message: "İşlem başarısız" },
      { status: 500 }
    );
  }
}

