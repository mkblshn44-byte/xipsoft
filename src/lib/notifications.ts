import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

// Bildirim deduplication — aynı olayı 5 dakika içinde tekrar gönderme
const recentNotifications = new Map<string, number>();
const NOTIFICATION_DEDUP_TTL = 5 * 60 * 1000; // 5 dakika

function getNotificationKey(type: string, ip?: string): string {
  return `${type}:${ip || "none"}`;
}

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const lastSent = recentNotifications.get(key);
  if (lastSent && now - lastSent < NOTIFICATION_DEDUP_TTL) {
    return true;
  }
  recentNotifications.set(key, now);
  return false;
}

// Periyodik temizlik — her 10 dakikada eski entry'leri sil
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of recentNotifications.entries()) {
    if (now - ts > NOTIFICATION_DEDUP_TTL * 2) recentNotifications.delete(key);
  }
}, 10 * 60 * 1000).unref();

export async function notifySecurityEvent(event: {
  eventType: string;
  ipAddress?: string;
  severity: string;
  endpoint?: string;
  userAgent?: string;
  isBlocked?: boolean;
}): Promise<void> {
  if (!ADMIN_CHAT_ID) return;
  if (event.severity !== "high" && event.severity !== "critical") return;

  const dedupKey = getNotificationKey(`security:${event.eventType}`, event.ipAddress);
  if (isDuplicate(dedupKey)) return;

  const emoji = event.isBlocked ? "🚫" : "⚠️";
  const lines = [
    `${emoji} <b>Güvenlik Olayı</b>`,
    ``,
    `<b>Tür:</b> ${escapeHtml(event.eventType)}`,
    event.ipAddress ? `<b>IP:</b> <code>${escapeHtml(event.ipAddress)}</code>` : null,
    event.endpoint ? `<b>Hedef:</b> <code>${escapeHtml(event.endpoint)}</code>` : null,
    `<b>Seviye:</b> ${escapeHtml(event.severity.toUpperCase())}`,
    event.isBlocked ? `<b>Durum:</b> Engellendi` : null,
    event.userAgent ? `<b>UA:</b> <code>${escapeHtml(event.userAgent.slice(0, 100))}</code>` : null,
  ].filter(Boolean).join("\n");

  try {
    await sendTelegramMessage(ADMIN_CHAT_ID, lines);
  } catch (err) {
    console.error("[Notifications] Security event notify failed:", err);
  }
}

export async function notifyBruteForce(ip: string, attempts: number, endpoint: string): Promise<void> {
  if (!ADMIN_CHAT_ID) return;

  const dedupKey = getNotificationKey("brute_force", ip);
  if (isDuplicate(dedupKey)) return;

  const text = [
    `⚠️ <b>Brute Force Saldırısı</b>`,
    ``,
    `<b>IP:</b> <code>${escapeHtml(ip)}</code>`,
    `<b>Hedef:</b> <code>${escapeHtml(endpoint)}</code>`,
    `<b>Deneme sayısı:</b> ${attempts}`,
    `<b>Durum:</b> 1 saat engellendi`,
  ].join("\n");

  try {
    await sendTelegramMessage(ADMIN_CHAT_ID, text);
  } catch (err) {
    console.error("[Notifications] Brute force notify failed:", err);
  }
}
