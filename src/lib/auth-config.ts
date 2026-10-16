/**
 * Shared Auth Configuration — Tek Kaynak
 *
 * JWT ve CSRF secret'larını tek yerden yönetir.
 * middleware.ts, api-guard.ts ve security.ts buradan import eder.
 * Aynı mantıgı 3 dosyada tekrar yazmak yerine buradan alın.
 */

/**
 * JWT secret'ı Uint8Array olarak döndürür (jose ile dogrudan kullanılabilir).
 * Production'da JWT_SECRET veya DB_ENCRYPTION_KEY zorunlu.
 */
export const getJwtSecret = (): Uint8Array => {
  const secret = process.env.JWT_SECRET || process.env.DB_ENCRYPTION_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[auth-config] JWT_SECRET veya DB_ENCRYPTION_KEY production ortamında tanımlı olmalıdır');
    }
    console.warn('[auth-config] JWT_SECRET not found, using dev fallback secret');
    return new TextEncoder().encode('dev-only-fallback-secret-non-production');
  }
  return new TextEncoder().encode(secret);
};

/**
 * CSRF token imzalama için kullanılan secret string.
 */
export const getCsrfSecret = (): string => {
  const secret = process.env.CSRF_SECRET || process.env.DB_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[auth-config] CSRF_SECRET veya DB_ENCRYPTION_KEY veya JWT_SECRET production ortamında tanımlı olmalıdır');
    }
    console.warn('[auth-config] CSRF_SECRET not found, using dev fallback secret');
    return 'dev-only-no-secret-configured';
  }
  return secret;
};

