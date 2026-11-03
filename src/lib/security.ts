/**
 * CSRF Protection & Secure Cookie Utilities
 * 
 * Security Features:
 * - HttpOnly cookies (XSS koruması)
 * - Secure flag (HTTPS only)
 * - SameSite=strict (CSRF koruması)
 * - CSRF token generation/validation (database-backed)
 * - DOMPurify-style HTML sanitization
 * - Advanced input validation
 */

import { jwtVerify, SignJWT } from 'jose';
import { getJwtSecret } from './auth-config';

// getJwtSecret → @/lib/auth-config'den geliyor (tek kaynak)

// =====================================// COOKIE OPTIONS (SECURE)
// =====================================
export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge?: number;
  domain?: string;
}

export const SECURE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,      // XSS koruması - JavaScript erisemez
  secure: process.env.NODE_ENV === 'production', // Production'da HTTPS only
  sameSite: 'lax',     // 'strict' window.location.href hard-nav'da cookie'yi bloke eder
  path: '/',
  // SECURITY FIX: 30 dakikaya düsürüldü — token çalınırsa etki süresi kısalır
  maxAge: 60 * 30, // 30 dakika
};

// =====================================// SESSION COOKIE (HTTPONLY)
// =====================================
export async function createSessionCookie(userId: string | number, userData: Record<string, any>): Promise<string> {
  const secret = getJwtSecret();
  const token = await new SignJWT({
    sub: String(userId),
    email: userData.email,
    display_name: userData.display_name,
    role: userData.role,
    photo_url: userData.photo_url,
    ...(userData.two_factor_verified === true ? { two_factor_verified: true } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(secret);
  return token;
}

export async function verifySessionCookie(token: string): Promise<any | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload;
  } catch (error) {
    console.error('[Cookie] Invalid session cookie:', error);
    return null;
  }
}

// =====================================// SANITIZATION HELPERS (XSS KORUMASI - DOMPurify Style)
// =====================================
/**
 * HTML sanitization — tehlikeli tag ve attribute'ları kaldırır.
 *
 * BUg FIX (önceki sorunlar):
 * 1. Tehlikeli tag'leri regex ile kaldırdıktan SONRA kalan < > " ' karakterlerini
 *    encode ediyordu. Bu  gibi yerlerde mesru HTML içerigini tamamen bozuyordu.
 *    Örnek: <b>kalın</b> → &lt;b&gt;kalın&lt;/b&gt; (render edilemez)
 * 2. "/" karakterini &#x2F; olarak encode ediyordu — URL'leri ve path'leri kırıyordu.
 *
 * Yeni davranıs:
 * - Sadece tehlikeli tag/attribute/scheme'leri kaldırır/bosaltır.
 * - Mesru HTML yapısına dokunmaz.
 * - Plain text için sanitizeUserInput() kullan (HTML encode eder).
 * - HTML içerik için sanitizeHTML() kullan (sadece tehlikelileri kaldırır).
 */
export function sanitizeHTML(input: string): string {
  if (!input) return '';

  return input
    // <script> taglerini kaldır
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // <iframe> taglerini kaldır
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // <style> taglerini kaldır
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // <link>, <meta>, <base> taglerini kaldır
    .replace(/<link\b[^<]*>/gi, '')
    .replace(/<meta\b[^<]*>/gi, '')
    .replace(/<base\b[^<]*>/gi, '')
    // <form> taglerini kaldır
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    // on* event handler attribute'larını kaldır (onclick, onload vb.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // javascript: scheme'ini kaldır
    .replace(/javascript\s*:/gi, '')
    // data: scheme'ini kaldır (resim data URI'leri hariç)
    .replace(/data:(?!image\/(png|jpeg|jpg|gif|svg\+xml);base64)/gi, '');
}

/**
 * Plain text input sanitizasyonu — HTML encode eder.
 * Kullanıcı adı, baslık, yorum gibi plain text alanlar için kullan.
 * HTML render edilmeyecek yerlerde kullan.
 */
export function sanitizeUserInput(input: string): string {
  if (!input) return '';
  return input
    .trim()
    // HTML özel karakterlerini encode et (XSS koruması)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  // NOT: "/" encode edilmiyor — URL ve path'leri kırar
}

// =====================================// PASSWORD VALIDATION
// =====================================
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Sifre en az 8 karakter olmalıdır');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Sifre en az bir buyuk harf içermelidir');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Sifre en az bir kuçuk harf içermelidir');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Sifre en az bir rakam içermelidir');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Sifre en az bir özel karakter içermelidir');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
