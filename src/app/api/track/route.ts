/**
 * Pageview Tracking API
 * POST /api/track
 *
 * Ziyaretçi IP, ülke (Cloudflare headers), cihaz, referrer bilgilerini loglar.
 * Engellenen ülkelerden gelen istekleri reddeder.
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";
import { getClientIp } from "@/lib/rate-limit";

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
    const body = await req.json().catch(() => ({}));
    const { page_url, referrer, session_id } = body;

    const ip = getClientIp(req);

    const country      = getCountry(req);
    const cf_ray       = req.headers.get("cf-ray");
    const cf_ipcountry = req.headers.get("cf-ipcountry");
    const city         = req.headers.get("cf-ipcity") || req.headers.get("x-vercel-ip-city") || null;
    const asn          = req.headers.get("cf-asn") || null;
    const ua           = req.headers.get("user-agent");
    const { is_bot, device_type, browser, os } = parseUA(ua);

    // Ülke bloğu kontrolü
    if (country) {
      pool.query(
        `SELECT 1 FROM country_blocklist WHERE country_code = $1 LIMIT 1`,
        [country]
      ).then((res) => {
        if (res.rows.length > 0) return; // engellendi, kayıt atla
        insertVisitor();
      }).catch(() => insertVisitor());
    } else {
      insertVisitor();
    }

    function insertVisitor() {
      pool.query(
        `INSERT INTO site_visitors
           (ip_address, page_url, user_agent, referrer,
            country, city, cf_ray, cf_ipcountry, asn,
            device_type, browser, os, is_bot, session_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          ip,
          page_url || "/",
          ua || null,
          referrer || null,
          country,
          city,
          cf_ray,
          cf_ipcountry,
          asn,
          device_type,
          browser,
          os,
          is_bot,
          session_id || null,
        ]
      ).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
