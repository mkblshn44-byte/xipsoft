/**
 * POST /api/telegram
 * Admin panelinden manuel Telegram paylasımı.
 * Sadece admin session cookie'si olan kullanıcılar erisebilir.
 *
 * Body:
 *   { type: "Blog",   id: string }
 *   { type: "thread", id: string }
 *   { type: "custom", text: string }
 *   { type: "test" }
 */

import { NextRequest, NextResponse } from "next/server";
import { extractAuthContext } from "@/lib/api-guard";
import {
  shareBlogToTelegram,
  sendCustomTelegramMessage,
} from "@/lib/telegram";
import pool from "@/lib/database";

// Izin verilen type degerleri — whitelist
const ALLOWED_TYPES = new Set(["Blog", "custom", "test"]);

import {
  checkRateLimit,
  createRateLimitResponse,
  getEndpointRateLimit,
  checkPayloadSize,
} from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Admin kontrolü — request'ten cookie oku
  const ctx = await extractAuthContext(req);
  if (!ctx.isAuthenticated || ctx.userRole !== "admin") {
    return NextResponse.json({ ok: false, error: "Yetkisiz erisim" }, { status: 403 });
  }

  // Rate Limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateConfig = getEndpointRateLimit("/api/telegram");
  const rateResult = await checkRateLimit(`telegram:${ip}`, rateConfig);
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult, rateConfig);
  }

  // Payload Check
  const payloadCheck = await checkPayloadSize(req, "/api/telegram");
  if (payloadCheck) return payloadCheck;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "geçersiz JSON" }, { status: 400 });
  }

  const { type } = body;

  // type whitelist kontrolü
  if (!type || typeof type !== "string" || !ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ ok: false, error: "geçersiz type" }, { status: 400 });
  }

  // ── Test ──────────────────────────────────────────────────────────────────
  if (type === "test") {
    const result = await sendCustomTelegramMessage(
      "✅ <b>XipSoft Telegram Botu</b> basarıyla baglandı!\n\nBlog paylasımları bu kanala otomatik gönderilecek."
    );
    return NextResponse.json(result);
  }

  // ── Blog ──────────────────────────────────────────────────────────────────
  if (type === "Blog") {
    const rawId = body.id;
    // id pozitif integer olmalı
    const id = typeof rawId === "string" ? parseInt(rawId, 10) : typeof rawId === "number" ? rawId : NaN;
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "geçerli bir Blog ID gerekli" }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT bp.title, bp.description, bp.slug, bp.tags,
              u.display_name AS author_name
       FROM Blog_posts bp
       LEFT JOIN users u ON u.id = bp.author_id
       WHERE bp.id = $1 AND bp.deleted_at IS NULL`,
      [id]
    );

    if (!rows[0]) {
      return NextResponse.json({ ok: false, error: "Blog bulunamadı" }, { status: 404 });
    }

    const result = await shareBlogToTelegram({
      title: rows[0].title,
      description: rows[0].description,
      slug: rows[0].slug,
      authorName: rows[0].author_name,
      tags: rows[0].tags,
    });

    return NextResponse.json(result);
  }


  // ── Custom ────────────────────────────────────────────────────────────────
  if (type === "custom") {
    const text = body.text;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "Mesaj metni gerekli" }, { status: 400 });
    }
    if (text.length > 4096) {
      return NextResponse.json({ ok: false, error: "Mesaj 4096 karakterden uzun olamaz" }, { status: 400 });
    }
    const result = await sendCustomTelegramMessage(text.trim());
    return NextResponse.json(result);
  }

  return NextResponse.json({ ok: false, error: "geçersiz type" }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405, headers: { Allow: "POST" } });
}
