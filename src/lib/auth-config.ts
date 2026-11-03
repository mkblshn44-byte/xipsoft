/**
 * Shared Auth Configuration — Tek Kaynak
 *
 * JWT ve CSRF secret'larını tek yerden yönetir.
 * middleware.ts, api-guard.ts ve security.ts buradan import eder.
 * Aynı mantıgı 3 dosyada tekrar yazmak yerine buradan alın.
 *
 * Ortak kök (`DB_ENCRYPTION_KEY`) yalnızca YEDEK olarak kullanılır ve doğrudan
 * imza anahtarı yapılmaz: her amaç için HKDF-SHA256 ile ayrı alt-anahtar türetilir.
 * Aksi halde aynı 32 byte hem JWT'yi hem CSRF token'ını imzalar ve kökü
 * rotasyona almak iki mekanizmayı birden kırmak zorunda kalırdı.
 *
 * DEPLOY NOTU: bu türetme ilk çıktığı canlıda, ortak kökle imzalanmış eski
 * oturum çerezleri geçersiz olur (kullanıcı bir kez yeniden giriş yapar, CSRF
 * token'ları yenilenir). `JWT_SECRET`/`CSRF_SECRET` ayrı tanımlıysa hiçbir
 * oturum etkilenmez.
 */
import { hkdfSync } from "crypto";

const HKDF_SALT = "xipsoft-auth-v1";

/** Ortak kökten amaç-bazlı alt-anahtar üret (domain separation). */
const derivePurposeKey = (root: string, purpose: "jwt" | "csrf"): string =>
  Buffer.from(
    hkdfSync("sha256", Buffer.from(root), Buffer.from(HKDF_SALT), Buffer.from(purpose), 32),
  ).toString("base64");

/**
 * JWT secret'ı Uint8Array olarak döndürür (jose ile dogrudan kullanılabilir).
 * Production'da JWT_SECRET veya DB_ENCRYPTION_KEY zorunlu.
 */
export const getJwtSecret = (): Uint8Array => {
  if (process.env.JWT_SECRET) return new TextEncoder().encode(process.env.JWT_SECRET);

  const root = process.env.DB_ENCRYPTION_KEY;
  if (!root) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[auth-config] JWT_SECRET veya DB_ENCRYPTION_KEY production ortamında tanımlı olmalıdır');
    }
    console.warn('[auth-config] JWT_SECRET not found, using dev fallback secret');
    return new TextEncoder().encode('dev-only-fallback-secret-non-production');
  }
  return new TextEncoder().encode(derivePurposeKey(root, "jwt"));
};

/**
 * CSRF token imzalama için kullanılan secret string.
 */
export const getCsrfSecret = (): string => {
  if (process.env.CSRF_SECRET) return process.env.CSRF_SECRET;

  const root = process.env.DB_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!root) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[auth-config] CSRF_SECRET veya DB_ENCRYPTION_KEY veya JWT_SECRET production ortamında tanımlı olmalıdır');
    }
    console.warn('[auth-config] CSRF_SECRET not found, using dev fallback secret');
    return 'dev-only-no-secret-configured';
  }
  return derivePurposeKey(root, "csrf");
};

