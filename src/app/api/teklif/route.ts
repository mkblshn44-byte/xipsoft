import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/database";

export const runtime = 'nodejs';

// Token format: UUID (8-4-4-4-12 hex) veya 32+ karakter alfanumerik
// Kısa/geçersiz token'lar DB'ye ulasmadan reddedilir
const TOKEN_REgEX = /^[a-zA-Z0-9_-]{20,128}$/;

import { checkRateLimit, createRateLimitResponse, getEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Rate Limit Kontrolü — Brute-force & Enum engelleme
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateConfig = getEndpointRateLimit("/api/teklif");
  const rateResult = await checkRateLimit(`teklif:${ip}`, rateConfig);
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult, rateConfig);
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const full = searchParams.get("full") === "1";

  if (!token) {
    return NextResponse.json({ error: "Token gerekli" }, { status: 400 });
  }

  // Token format kontrolü — brute-force'u zorlastırır, DB'yi gereksiz sorgulardan korur
  if (!TOKEN_REgEX.test(token)) {
    return NextResponse.json({ error: "geçersiz token formatı" }, { status: 400 });
  }

  try {
    const row = await queryOne<{
      token: string;
      name: string;
      email: string;
      service: string;
      status: string;
      price: string | null;
      payment_url: string | null;
      payment_method: string | null;
    }>(
      `SELECT token, name, email, service, status, price, payment_url, payment_method, created_at
       FROM teklif_requests
       WHERE token = $1`,
      [token]
    );

    if (!row) {
      return NextResponse.json({ error: "Teklif bulunamadı" }, { status: 404 });
    }

    if (full) {
      // SECURITY FIX: email maskelendi — token sahibi zaten kendi e-postasını biliyor,
      // ama token sızdıgında tam e-posta ifsa olmaz. name + service gösterimi UX için gerekli.
      const rawEmail: string = row.email ?? "";
      const atIdx = rawEmail.indexOf("@");
      const maskedEmail =
        atIdx > 1
          ? `${rawEmail[0]}${"*".repeat(Math.max(atIdx - 2, 1))}${rawEmail[atIdx - 1]}${rawEmail.slice(atIdx)}`
          : rawEmail;

      return NextResponse.json({
        status: row.status,
        price: row.price ?? null,
        payment_url: row.payment_url ?? null,
        payment_method: row.payment_method ?? null,
        name: row.name,
        service: row.service,
        email: maskedEmail,
      });
    }

    return NextResponse.json({ status: row.status });
  } catch (err) {
    console.error("[API/teklif] DB hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
