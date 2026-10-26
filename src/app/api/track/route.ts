/**
 * Pageview Tracking API
 * POST /api/track
 *
 * Ziyaretçi IP, ülke (Cloudflare headers), cihaz, referrer bilgilerini loglar.
 * Engellenen ülkelerden gelen istekleri reddeder.
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/pool";
import { getClientIp } from "@/lib/rate-limit";
import { ensureSiteVisitorAnalyticsSchema } from "@/lib/db/site-visitors";

export const runtime = "nodejs";

/** Cloudflare veya Vercel'den gelen ülke kodunu al */
function getCountry(req: NextRequest): string | null {
  return (
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-vercel-ip-country") ||
    null
  );
}

/** Basit UA parse — bot, cihaz tipi, tarayıcı, işletim sistemi */
function parseUA(ua: string | null): {
  is_bot: boolean;
  device_type: string;
  browser: string;
  os: string;
} {
  if (!ua) return { is_bot: false, device_type: "unknown", browser: "unknown", os: "unknown" };

  const u = ua.toLowerCase();

  const is_bot = /bot|crawler|spider|slurp|bingbot|googlebot|yandex|baidu|duckduck|facebot|ia_archiver|applebot/.test(u);

  let device_type = "desktop";
  if (/mobile|iphone|android.*mobile|windows phone/.test(u)) device_type = "mobile";
  else if (/tablet|ipad|android(?!.*mobile)/.test(u)) device_type = "tablet";

  let browser = "other";
  if (/edg\//.test(u)) browser = "edge";
  else if (/firefox\//.test(u)) browser = "firefox";
  else if (/opr\/|opera/.test(u)) browser = "opera";
  else if (/chrome\//.test(u)) browser = "chrome";
  else if (/safari\//.test(u)) browser = "safari";

  let os = "other";
  if (/windows/.test(u)) os = "windows";
  else if (/mac os x/.test(u)) os = "macos";
  else if (/android/.test(u)) os = "android";
  else if (/iphone|ipad/.test(u)) os = "ios";
  else if (/linux/.test(u)) os = "linux";

  return { is_bot, device_type, browser, os };
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const { page_url, referrer, session_id, visit_token, duration_seconds, transfer_bytes } = input;

    if (
      typeof visit_token !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visit_token)
    ) {
      return NextResponse.json({ error: "Geçersiz ziyaret kimliği" }, { status: 400 });
    }

    // Bot trafiği DB'ye hiç yazılmaz: tarama başına 1 SELECT + 1 INSERT, kotayı
    // yiyen de şişen tablo da bu. Admin tarafı artık bot kaynaklı satır görmez.
    const ua = req.headers.get("user-agent");
    const { is_bot, device_type, browser, os } = parseUA(ua);
    if (is_bot) return new NextResponse(null, { status: 204 });

    const duration = Number.isSafeInteger(duration_seconds)
      ? Math.min(Math.max(Number(duration_seconds), 0), 86_400)
      : 0;
    const transferredBytes = Number.isSafeInteger(transfer_bytes)
      ? Math.min(Math.max(Number(transfer_bytes), 0), 2_147_483_647)
      : 0;

    await ensureSiteVisitorAnalyticsSchema();

    const ip = getClientIp(req);

    const country      = getCountry(req);
    const cf_ray       = req.headers.get("cf-ray");
    const cf_ipcountry = req.headers.get("cf-ipcountry");
    const city         = req.headers.get("cf-ipcity") || req.headers.get("x-vercel-ip-city") || null;
    const asn          = req.headers.get("cf-asn") || null;

    // Ülke bloğu kontrolü
    if (country) {
      const blocked = await pool.query(
        `SELECT 1 FROM country_blocklist WHERE country_code = $1 LIMIT 1`,
        [country],
      );
      if (blocked.rows.length > 0) return NextResponse.json({ success: true, blocked: true });
    }

    await pool.query(
      `INSERT INTO site_visitors
         (ip_address, page_url, user_agent, referrer,
          country, city, cf_ray, cf_ipcountry, asn,
          device_type, browser, os, is_bot, session_id,
          visit_token, duration_seconds, transfer_bytes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (visit_token) WHERE visit_token IS NOT NULL
       DO UPDATE SET
         duration_seconds = GREATEST(COALESCE(site_visitors.duration_seconds, 0), EXCLUDED.duration_seconds),
         transfer_bytes = GREATEST(COALESCE(site_visitors.transfer_bytes, 0), EXCLUDED.transfer_bytes)`,
      [
        ip,
        typeof page_url === "string" ? page_url : "/",
        ua || null,
        typeof referrer === "string" ? referrer : null,
        country,
        city,
        cf_ray,
        cf_ipcountry,
        asn,
        device_type,
        browser,
        os,
        is_bot,
        typeof session_id === "string" ? session_id : null,
        visit_token,
        duration,
        transferredBytes,
      ],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API:track] ziyaret kaydedilemedi:", error);
    return NextResponse.json({ error: "Ziyaret kaydedilemedi" }, { status: 500 });
  }
}
