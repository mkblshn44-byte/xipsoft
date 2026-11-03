/**
 * Telegram Bot API — Mesaj gönderme Servisi
 *
 * Env degiskenleri:
 *   TELEGRAM_BOT_TOKEN  — BotFather'dan alınan token
 *   TELEGRAM_GROUP_ID   — Grup ID'si (-100xxx), yoksa CHANNEL_ID fallback edilir
 *   TELEGRAM_CHANNEL_ID — Kanal username (@xipsoft) veya sayısal ID (-100xxx)
 */

const TELEGRAM_API = "https://api.telegram.org";
import { SITE_URL } from "@/lib/site-url";

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c)
  );
}

async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<{ ok: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return { ok: false, error: "TELEGRAM_BOT_TOKEN eksik" };

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
    });
    const json = await res.json();
    return json.ok ? { ok: true } : { ok: false, error: json.description };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Bilinmeyen hata" };
  }
}

async function sendCustomTelegramMessage(
  text: string,
  chatId?: string
): Promise<{ ok: boolean; error?: string }> {
  const targetChatId = chatId || process.env.TELEGRAM_GROUP_ID || process.env.TELEGRAM_CHANNEL_ID;
  if (!targetChatId) return { ok: false, error: "Chat ID bulunamadı" };
  return sendTelegramMessage(targetChatId, text);
}

function buildBlogShareText(post: {
  title: string;
  slug: string;
  excerpt?: string;
  description?: string | null;
  authorName?: string | null;
  tags?: string[];
}): string {
  const siteUrl = SITE_URL;
  const summary = post.excerpt || post.description;
  return [
    `<b>📝 Yeni Blog Yazısı</b>`,
    ``,
    `<b>${escapeHtml(post.title)}</b>`,
    summary ? escapeHtml(summary) : null,
    post.authorName ? `✍️ ${escapeHtml(post.authorName)}` : null,
    post.tags?.length ? `🏷 ${post.tags.map(escapeHtml).join(", ")}` : null,
    ``,
    `🔗 ${siteUrl}/blog/${post.slug}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

async function shareBlogToTelegram(post: {
  title: string;
  slug: string;
  excerpt?: string;
  description?: string | null;
  authorName?: string | null;
  tags?: string[];
}, chatId?: string): Promise<{ ok: boolean; error?: string }> {
  const targetChatId = chatId || process.env.TELEGRAM_GROUP_ID || process.env.TELEGRAM_CHANNEL_ID;
  if (!targetChatId) return { ok: false, error: "TELEGRAM_GROUP_ID / TELEGRAM_CHANNEL_ID eksik" };
  return sendTelegramMessage(targetChatId, buildBlogShareText(post));
}

async function shareBlogToTelegramAll(post: {
  title: string;
  slug: string;
  excerpt?: string;
  description?: string | null;
  authorName?: string | null;
  tags?: string[];
}): Promise<Array<{ ok: boolean; error?: string }>> {
  const groupId = process.env.TELEGRAM_GROUP_ID;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  const text = buildBlogShareText(post);
  const results: Array<{ ok: boolean; error?: string }> = [];

  const sentIds = new Set<string>();
  const ids: string[] = [];
  if (groupId && !sentIds.has(groupId)) { ids.push(groupId); sentIds.add(groupId); }
  if (channelId && !sentIds.has(channelId)) { ids.push(channelId); sentIds.add(channelId); }

  if (ids.length === 0) {
    return [{ ok: false, error: "TELEGRAM_GROUP_ID / TELEGRAM_CHANNEL_ID eksik" }];
  }

  for (const id of ids) {
    results.push(await sendTelegramMessage(id, text));
  }
  return results;
}

export {
  sendTelegramMessage,
  sendCustomTelegramMessage,
  shareBlogToTelegram,
  shareBlogToTelegramAll,
  escapeHtml,
};
