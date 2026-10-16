"use server";

import { queryOne, query } from "@/lib/database";
import { getServerActionContext } from "@/lib/api-guard";

async function assertAdmin() {
  const ctx = await getServerActionContext();
  if (!ctx.isAuthenticated || ctx.userRole !== "admin") {
    throw new Error("Admin yetkisi gerekiyor");
  }
}

function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return /googlebot|bingbot|yandexbot|duckduckbot|baiduspider|facebookexternalhit|twitterbot|linkedinbot|whatsapp|slackbot|lighthouse|bot|crawler|spider/i.test(
    userAgent
  );
}

function botWhereSql(field = "user_agent") {
  return `(${field} ~* 'googlebot|bingbot|yandexbot|duckduckbot|baiduspider|facebookexternalhit|twitterbot|linkedinbot|whatsapp|slackbot|lighthouse|bot|crawler|spider')`;
}

export async function getAnalyticsAction() {
  try {
    await assertAdmin();

    const [
      userStats,
      visitorStats,
      recentVisitors,
      botStats,
      topPages,
      topReferrers,
      dailyStats,
    ] = await Promise.all([
      queryOne<any>(`
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
          COUNT(*) FILTER (WHERE role = 'moderator') as moderator_count,
          COUNT(*) FILTER (WHERE is_banned = true) as banned_count,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week
        FROM users WHERE deleted_at IS NULL
      `),
      queryOne<any>(`
        SELECT
          COUNT(*) as total_visits,
          COUNT(DISTINCT ip_address) as unique_visitors,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today_visits
        FROM site_visitors
      `).catch(() => null),
      query<any>(`
        SELECT id, ip_address, country, browser, device_type, page_url as path, user_agent, referrer, created_at
        FROM site_visitors ORDER BY created_at DESC LIMIT 10
      `).catch(() => []),
      queryOne<any>(`
        SELECT
          COUNT(*) FILTER (WHERE ${botWhereSql()}) as bot_count,
          COUNT(*) FILTER (WHERE NOT ${botWhereSql()}) as human_count
        FROM site_visitors
      `).catch(() => ({ bot_count: 0, human_count: 0 })),
      query<any>(`
        SELECT page_url as path, COUNT(*) as count,
          COUNT(*) FILTER (WHERE ${botWhereSql()}) as bot_count
        FROM site_visitors
        gROUP BY page_url ORDER BY count DESC LIMIT 10
      `).catch(() => []),
      query<any>(`
        SELECT referrer, COUNT(*) as count
        FROM site_visitors WHERE referrer IS NOT NULL AND referrer != ''
        gROUP BY referrer ORDER BY count DESC LIMIT 10
      `).catch(() => []),
      query<any>(`
        SELECT DATE(created_at) as date, COUNT(*) as count,
          COUNT(*) FILTER (WHERE ${botWhereSql()}) as bot_count
        FROM site_visitors
        gROUP BY DATE(created_at) ORDER BY date DESC LIMIT 14
      `).catch(() => []),
    ]);

    return {
      success: true,
      data: {
        users: userStats,
        visitors: visitorStats,
        recentVisitors,
        bots: botStats,
        topPages,
        topReferrers,
        dailyStats,
        totalRevenue: 0,
        totalOrders: 0,
        activeSites: 0,
        conversionMetrics: { viewToCartRate: 0, cartToPurchaseRate: 0 },
      },
    };
  } catch (err: any) {
    return { success: false, data: null, error: err.message };
  }
}

export async function getBotVisitsAction(limit = 50) {
  try {
    await assertAdmin();
    const rows = await query<any>(`
      SELECT id, ip_address, page_url as path, user_agent, referrer, created_at
      FROM site_visitors
      WHERE ${botWhereSql()}
      ORDER BY created_at DESC LIMIT $1
    `, [limit]);
    return { success: true, data: rows };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getHumanVisitsAction(limit = 50) {
  try {
    await assertAdmin();
    const rows = await query<any>(`
      SELECT id, ip_address, page_url as path, user_agent, referrer, created_at
      FROM site_visitors
      WHERE NOT ${botWhereSql()}
      ORDER BY created_at DESC LIMIT $1
    `, [limit]);
    return { success: true, data: rows };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getReferrerStatsAction() {
  try {
    await assertAdmin();
    const rows = await query<any>(`
      SELECT referrer, COUNT(*) as count
      FROM site_visitors WHERE referrer IS NOT NULL AND referrer != ''
      gROUP BY referrer ORDER BY count DESC LIMIT 20
    `);
    return { success: true, data: rows };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getDailyStatsAction() {
  try {
    await assertAdmin();
    // Mevcut 30 gün
    const current = await query<any>(`
      SELECT DATE(created_at) as date, COUNT(*) as count,
        COUNT(*) FILTER (WHERE ${botWhereSql()}) as bot_count
      FROM site_visitors
      WHERE created_at >= NOW() - INTERVAL '30 days'
      gROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30
    `);

    // Önceki 30 gün (karsılastırma dönemi)
    const previous = await query<any>(`
      SELECT DATE(created_at) as date, COUNT(*) as count,
        COUNT(*) FILTER (WHERE ${botWhereSql()}) as bot_count
      FROM site_visitors
      WHERE created_at >= NOW() - INTERVAL '60 days'
        AND created_at < NOW() - INTERVAL '30 days'
      gROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30
    `);

    // Özet istatistikler — yüzde degisim
    const currentTotal  = current.reduce((s: number, r: any) => s + parseInt(r.count || '0', 10), 0);
    const previousTotal = previous.reduce((s: number, r: any) => s + parseInt(r.count || '0', 10), 0);
    const changePercent = previousTotal > 0
      ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
      : null;

    return {
      success: true,
      data: current,
      comparison: {
        current:  currentTotal,
        previous: previousTotal,
        changePercent,          // pozitif = artıs, negatif = düsüs, null = önceki veri yok
        trend: changePercent === null ? 'unknown'
             : changePercent > 0 ? 'up'
             : changePercent < 0 ? 'down'
             : 'stable',
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getLiveVisitorsAction() {
  try {
    await assertAdmin();
    const rows = await query<any>(`
      SELECT id, ip_address, page_url as path, user_agent, referrer, created_at
      FROM site_visitors
      WHERE created_at > NOW() - INTERVAL '5 minutes'
      ORDER BY created_at DESC
    `);
    const count = await queryOne<any>(`
      SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 minute') as last_minute,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM site_visitors
      WHERE created_at > NOW() - INTERVAL '5 minutes'
    `);
    return { success: true, data: { visitors: rows, summary: count } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
