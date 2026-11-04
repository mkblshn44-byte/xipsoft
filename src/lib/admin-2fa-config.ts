import { getAdminTelegramChatIds } from "@/lib/telegram";

/**
 * Admin Telegram 2FA — Ortam Konfigürasyonu (tek kaynak)
 *
 * Admin paneli 2FA'sı ADMIN_EMAIL, TELEGRAM_BOT_TOKEN ve birincil
 * TELEGRAM_ADMIN_CHAT_ID tanımlı olduğunda çalışır. İkinci chat ID isteğe bağlıdır.
 * Eksik olduğunda:
 *   - Normal kullanıcı girişi ETKİLENMEZ (login bu modüle bağımlı değildir).
 *   - Genel site ETKİLENMEZ.
 *   - Yalnızca admin paneline geçiş sırasında "yapılandırma eksik" uyarısı gösterilir
 *     ve admin erişimi fail-closed olarak kapalı kalır.
 *
 * Bu okumalar middleware (Node runtime), server action'lar ve server component'ler
 * tarafından paylaşılır.
 */

export interface Admin2faConfig {
  /** Gerekli admin 2FA değişkenleri tanımlıysa true. */
  ready: boolean;
  /** Eksik değişken adları (uyarı metni için). */
  missing: string[];
  /** İzin verilen admin e-postası (küçük harf) veya null. */
  authorizedEmail: string | null;
  /** Admin Telegram chat ID veya null. */
  chatId: string | null;
  /** Admin 2FA kodunun gönderileceği tüm chat ID'leri. */
  chatIds: string[];
}

export function getAdmin2faConfig(): Admin2faConfig {
  const authorizedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
  const chatIds = getAdminTelegramChatIds();
  const chatId = chatIds[0] || null;
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || null;

  const missing: string[] = [];
  if (!authorizedEmail) missing.push("ADMIN_EMAIL");
  if (!botToken) missing.push("TELEGRAM_BOT_TOKEN");
  if (!chatId) missing.push("TELEGRAM_ADMIN_CHAT_ID");

  return {
    ready: missing.length === 0,
    missing,
    authorizedEmail,
    chatId,
    chatIds,
  };
}

/**
 * Bir kullanıcının admin paneli için yetkili olup olmadığını belirler.
 *
 * - Rol `admin` olmalıdır.
 * - `ADMIN_EMAIL` tanımlıysa e-posta onunla eşleşmelidir.
 * - `ADMIN_EMAIL` tanımlı değilse yetki VERİLMEZ (fail-closed); ancak bu durum
 *   "yapılandırma eksik" uyarısıyla ayırt edilebilsin diye ayrı bir bayrak döner.
 */
export function checkAdminIdentity(
  role: unknown,
  email: unknown,
  config: Admin2faConfig = getAdmin2faConfig(),
): "authorized" | "wrong-account" | "not-admin" | "config-missing" {
  if (role !== "admin") return "not-admin";
  if (!config.authorizedEmail) return "config-missing";
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  return normalized === config.authorizedEmail ? "authorized" : "wrong-account";
}
