import { NextRequest, NextResponse } from "next/server";
import { getTeklifByToken, getTeklifEvents } from "@/lib/db/teklif";
import { isValidToken, toPublicTeklif } from "@/lib/teklif-shared";
import { checkRateLimit, createRateLimitResponse, getEndpointRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Teklif durumu okuma.
 *
 *   GET /api/teklif?token=UUID                → { status }
 *   GET /api/teklif?token=UUID&full=1         → müşteriye güvenli tam görünüm + aşama olayları
 *
 * E-posta maskelenir (`toPublicTeklif`); tam kayıt yalnız admin tarafındadır.
 */
export async function GET(req: NextRequest) {
  // Rate Limit — brute-force & token enum engelleme
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

  // Format kontrolü — geçersiz/çok kısa token DB'ye hiç ulaşmaz
  if (!isValidToken(token)) {
    return NextResponse.json({ error: "Geçersiz token formatı" }, { status: 400 });
  }

  try {
    const teklif = await getTeklifByToken(token);
    if (!teklif) {
      return NextResponse.json({ error: "Teklif bulunamadı" }, { status: 404 });
    }

    if (!full) {
      return NextResponse.json({ status: teklif.status });
    }

    const events = await getTeklifEvents(teklif.id);
    return NextResponse.json({
      ...toPublicTeklif(teklif),
      // Müşteri yalnızca aşama + zaman görür; iç notlar admin tarafında kalır.
      events: events.map(({ status, created_at }) => ({ status, created_at })),
    });
  } catch (err) {
    console.error("[API/teklif] DB hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
