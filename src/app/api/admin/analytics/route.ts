/**
 * Admin Analytics API
 * GET /api/admin/analytics
 *
 * Ziyaretçi istatistikleri: ülke, cihaz, tarayıcı, sayfa, referrer, bot vs.
 */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/database";
import { extractAuthContext, requireAdmin } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get("days") || "7", 10), 90);

    const interval = `${days} days`;

    const [
      summary,
      byCountry,
      byDevice,
      byBrowser,
      byOs,
      topPages,
      topReferrers,
      daily,
      recent,
      botStats,
    ] = await Promise.allSettled([
      // Özet
      pool.query<any>(`
        SELECT
          COUNT(*)::int                                                      AS total_visits,
          COUNT(DISTINCT ip_address)::int                                    AS unique_ips,
          COUNT(*) FILTER (WHERE is_bot = true)::int                        AS bot_visits,
          COUNT(*) FILTER (WHERE is_bot = false OR is_bot IS NULL)::int     AS human_visits,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS today_visits,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')::int   AS last_hour_visits
        FROM site_visitors
        WHERE created_at > NOW() - INTERVAL '${interval}'
      `),

      // Ülkelere göre
      pool.query<any>(`
        SELECT
          COALESCE(country, cf_ipcountry, 'XX') AS country_code,
          COUNT(*)::int                          AS visits,
          COUNT(DISTINCT ip_address)::int        AS unique_ips
        FROM site_visitors
        WHERE created_at > NOW() - INTERVAL '${interval}'
        GROUP BY COALESCE(country, cf_ipcountry, 'XX')
        ORDER BY visits DESC
        LIMIT 30
      `),

      // Cihaz tipine göre
      pool.query<any>(`
        SELECT
          COALESCE(device_type, 'unknown') AS device,
          COUNT(*)::int                    AS visits
        FROM site_visitors
        WHERE created_at > NOW() - INTERVAL '${interval}'
        GROUP BY COALESCE(device_type, 'unknown')
        ORDER BY visits DESC
      `),

      // Tarayıcıya göre
      pool.query<any>(`
        SELECT
          COALESCE(browser, 'unknown') AS browser,
          COUNT(*)::int                AS visits
        FROM site_visitors
        WHERE created_at > NOW() - INTERVAL '${interval}'
        GROUP BY COALESCE(browser, 'unknown')
        ORDER BY visits DESC
        LIMIT 10
      `),

      // İşletim sistemine göre
      pool.query<any>(`
        SELECT
          COALESCE(os, 'unknown') AS os,
          COUNT(*)::int           AS visits
        FROM site_visitors
        WHERE created_at > NOW() - INTERVAL '${interval}'
        GROUP BY COALESCE(os, 'unknown')
        ORDER BY visits DESC
        LIMIT 10
      `),

      // En çok ziyaret edilen sayfalar
      pool.query<any>(`
        SELECT
          page_url             AS path,
          COUNT(*)::int        AS visits,
          COUNT(DISTINCT ip_address)::int AS unique_ips
        FROM site_visitors
        WHERE created_at > NOW() - INTERVAL '${interval}'
        GROUP BY page_url
        ORDER BY visits DESC
        LIMIT 20
      `),

      // Top referrerlar
      pool.query<any>(`
        SELECT
          referrer,
          COUNT(*)::int AS visits
        FROM site_visitors
        WHERE referrer IS NOT NULL AND referrer != ''
          AND created_at > NOW() - INTERVAL '${interval}'
        GROUP BY referrer
        ORDER BY visits DESC
        LIMIT 15
      `),

      // Günlük istatistikler
      pool.query<any>(`
        SELECT
          DATE(created_at)                                               AS date,
          COUNT(*)::int                                                  AS visits,
          COUNT(DISTINCT ip_address)::int                                AS unique_ips,
          COUNT(*) FILTER (WHERE is_bot = true)::int                    AS bot_visits
        FROM site_visitors
        WHERE created_at > NOW() - INTERVAL '${interval}'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `),

      // Son ziyaretçiler
      pool.query<any>(`
        SELECT
          id, ip_address,
          COALESCE(country, cf_ipcountry) AS country,
          city,
          page_url                        AS path,
          device_type, browser, os,
          is_bot, user_agent, referrer,
          created_at
        FROM site_visitors
        ORDER BY created_at DESC
        LIMIT 50
      `),

      // Bot istatistikleri
      pool.query<any>(`
        SELECT
          user_agent,
          COUNT(*)::int AS visits
        FROM site_visitors
        WHERE is_bot = true
          AND created_at > NOW() - INTERVAL '${interval}'
        GROUP BY user_agent
        ORDER BY visits DESC
        LIMIT 10
      `),
    ]);

    const get = (r: PromiseSettledResult<any>) =>
      r.status === "fulfilled" ? r.value.rows : [];
    const getOne = (r: PromiseSettledResult<any>) =>
      r.status === "fulfilled" ? (r.value.rows[0] ?? null) : null;

    return NextResponse.json({
      period_days: days,
      summary:     getOne(summary),
      by_country:  get(byCountry),
      by_device:   get(byDevice),
      by_browser:  get(byBrowser),
      by_os:       get(byOs),
      top_pages:   get(topPages),
      top_referrers: get(topReferrers),
      daily:       get(daily),
      recent:      get(recent),
      bot_agents:  get(botStats),
    });
  } catch (err) {
    console.error("[API:analytics] error:", err);
    return NextResponse.json({ error: "Analitik veriler alınamadı" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await extractAuthContext(req);
  const guard = requireAdmin(auth);
  if (guard !== null && "status" in guard) return guard;

  let input: { id?: unknown; all?: unknown };
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  try {
    if (input.all === true && input.id === undefined) {
      const result = await pool.query("DELETE FROM site_visitors");
      return NextResponse.json({ deleted: result.rowCount ?? 0 });
    }

    if (Number.isSafeInteger(input.id) && Number(input.id) > 0 && input.all === undefined) {
      const result = await pool.query(
        "DELETE FROM site_visitors WHERE id = $1",
        [Number(input.id)],
      );
      if (!result.rowCount) {
        return NextResponse.json({ error: "Ziyaret kaydı bulunamadı" }, { status: 404 });
      }
      return NextResponse.json({ deleted: result.rowCount });
    }

    return NextResponse.json({ error: "Bir kayıt ID'si veya all: true gönderin" }, { status: 400 });
  } catch (error) {
    console.error("[API:analytics] delete error:", error);
    return NextResponse.json({ error: "Ziyaret kayıtları silinemedi" }, { status: 500 });
  }
}
