/**
 * Admin Telegram 2FA — Ortam Konfigürasyonu (tek kaynak)
 *
 * Admin paneli 2FA'sı yalnızca bu üç değişkenin TAMAMI tanımlı olduğunda çalışır.
 * Eksik olduğunda:
 *   - Normal kullanıcı girişi ETKİLENMEZ (login bu modüle bağımlı değildir).
 *   - Genel site ETKİLENMEZ.
 *   - Yalnızca admin paneline geçiş sırasında "yapılandırma eksik" uyarısı gösterilir
 *     ve admin erişimi fail-closed olarak kapalı kalır.
 *
 * Bu okumalar middleware (Node runtime), server action'lar ve server component'ler
 * tarafından paylaşılır — env değişken adları başka yerde tekrar yazılmaz.
 */

export interface Admin2faConfig {
  /** Üç değişken de tanımlıysa true. */
  ready: boolean;
  /** Eksik değişken adları (uyarı metni için). */
  missing: string[];
  /** İzin verilen admin e-postası (küçük harf) veya null. */
  authorizedEmail: string | null;
  /** Admin Telegram chat ID veya null. */
  chatId: string | null;
}

export function getAdmin2faConfig(): Admin2faConfig {
  const authorizedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() || null;
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
