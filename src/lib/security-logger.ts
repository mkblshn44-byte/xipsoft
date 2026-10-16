/**
 * Security Logger
 * Güvenlik olaylarını security_logs tablosuna asenkron yazar.
 * Hiçbir zaman ana akısı bloklamaz — fire-and-forget.
 */

import pool from "@/lib/database";

export type SecurityEventType =
  | "brute_force"
  | "rate_limit"
  | "csrf_fail"
  | "sql_inject_attempt"
  | "xss_attempt"
  | "unauthorized_access"
  | "suspicious_ip"
  | "bot_detected";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

interface SecurityLogPayload {
  eventType: SecurityEventType;
  ipAddress?: string;
  userId?: number;
  userAgent?: string;
  endpoint?: string;
  payload?: Record<string, unknown>;
  severity?: SecuritySeverity;
  isBlocked?: boolean;
  blockedUntil?: Date;
}

/**
 * Güvenlik olayını DB'ye yazar. Fire-and-forget — await etme.
 */
export function logSecurityEvent(data: SecurityLogPayload): void {
  const {
    eventType,
    ipAddress,
    userId,
    userAgent,
    endpoint,
    payload,
    severity = "medium",
    isBlocked = false,
    blockedUntil,
  } = data;

  // Asenkron — ana akısı bloklamaz
  pool
    .query(
      `INSERT INTO security_logs
        (event_type, ip_address, user_id, user_agent, endpoint, payload, severity, is_blocked, blocked_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        eventType,
        ipAddress ?? null,
        userId ?? null,
        userAgent ?? null,
        endpoint ?? null,
        payload ? JSON.stringify(payload) : null,
        severity,
        isBlocked,
        blockedUntil ?? null,
      ]
    )
    .catch((err) => {
      // Log yazma hatası ana akısı etkilemez
      console.error("[SecurityLogger] DB write failed:", err?.message);
    });
}

/**
 * IP'yi ip_blocklist tablosuna ekler.
 * Otomatik sistem engeli için blocked_by = NULL.
 */
export async function blockIp(
  ipAddress: string,
  reason: string,
  options: { isPermanent?: boolean; expiresAt?: Date; blockedBy?: number } = {}
): Promise<void> {
  const { isPermanent = false, expiresAt, blockedBy } = options;
  await pool
    .query(
      `INSERT INTO ip_blocklist (ip_address, reason, is_permanent, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ip_address) DO UPDATE
         SET reason = EXCLUDED.reason,
             is_permanent = EXCLUDED.is_permanent,
             expires_at = EXCLUDED.expires_at`,
      [ipAddress, reason, isPermanent, expiresAt ?? null]
    )
    .catch((err) => {
      console.error("[SecurityLogger] blockIp failed:", err?.message);
    });
}
