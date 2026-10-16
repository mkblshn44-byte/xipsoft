/**
 * Admin Dashboard Stats API
 * GET /api/admin/dashboard-stats
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
    const start = Date.now();

    const [orders, blog, blockedIPs, blockedCountries, recentThreats, dbPing] =
      await Promise.allSettled([
        // Siparişler
        pool.query(
          `SELECT
             COUNT(*)::int                                         AS total,
             COUNT(*) FILTER (WHERE status = 'pending')::int      AS pending,
             COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS revenue
           FROM orders`
        ),
        // Blog yazıları
        pool.query(
          `SELECT
             COUNT(*)::int                                             AS total,
             COUNT(*) FILTER (WHERE status = 'published')::int        AS published,
             COUNT(*) FILTER (WHERE status = 'draft')::int            AS draft
           FROM blog_posts`
        ),
        // Engellenen IP sayısı
        pool.query(`SELECT COUNT(*)::int AS count FROM ip_blocklist`),
        // Engellenen ülke sayısı
        pool.query(`SELECT COUNT(*)::int AS count FROM country_blocklist`),
        // Son 24 saat tehdit
        pool.query(
          `SELECT COUNT(*)::int AS count
           FROM security_logs
           WHERE created_at > NOW() - INTERVAL '24 hours'
             AND severity IN ('high', 'critical')`
        ),
        // DB ping
        pool.query(`SELECT 1`),
      ]);

    const dbLatency = Date.now() - start;

    const ordersRow  = orders.status  === "fulfilled" ? orders.value.rows[0]  : null;
    const blogRow    = blog.status    === "fulfilled" ? blog.value.rows[0]    : null;
    const ipRow      = blockedIPs.status  === "fulfilled" ? blockedIPs.value.rows[0]  : null;
    const countryRow = blockedCountries.status === "fulfilled" ? blockedCountries.value.rows[0] : null;
    const threatRow  = recentThreats.status === "fulfilled" ? recentThreats.value.rows[0] : null;
    const dbOk       = dbPing.status === "fulfilled";

    return NextResponse.json({
      orders: {
        total:   ordersRow?.total   ?? 0,
        pending: ordersRow?.pending ?? 0,
        revenue: Number(ordersRow?.revenue ?? 0),
      },
      blog: {
        total:     blogRow?.total     ?? 0,
        published: blogRow?.published ?? 0,
        draft:     blogRow?.draft     ?? 0,
      },
      security: {
        blockedIPs:       ipRow?.count      ?? 0,
        blockedCountries: countryRow?.count ?? 0,
        recentThreats:    threatRow?.count  ?? 0,
      },
      system: {
        status:    dbOk ? "ok" : "degraded",
        dbLatency: dbOk ? dbLatency : null,
        uptime:    process.uptime
          ? `${Math.floor(process.uptime() / 3600)}s`
          : "—",
      },
    });
  } catch (err) {
    console.error("[API:dashboard-stats] error:", err);
    return NextResponse.json({ error: "İstatistikler alınamadı" }, { status: 500 });
  }
}
