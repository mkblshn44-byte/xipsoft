/**
 * RFC 4648 base32 + RFC 6238 TOTP primitifleri.
 *
 * Alfabe tek kaynak burada tutulur: secret ÜRETEN ve secret DOĞRULAYAN yol
 * aynı tabloyu kullanmak zorunda. `decodeBase32` tanısız karakteri sessizce
 * atlamak yerine `null` döner — sessiz atlama HMAC anahtarını kısaltıp
 * doğrulamayı imkânsızlaştırır.
 */
import crypto from "crypto";

/** RFC 4648 alfabesi (pad'siz, TOTP konvansiyonu). */
export const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 6238 varsayılanları: SHA1, 6 haneli, 30 sn periyot. */
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;

/** Accepte edilen sapma penceresi (bir önceki/bir sonraki adım). */
export const TOTP_WINDOW_STEPS = 1;

export function encodeBase32(bytes: Buffer): string {
  let out = "";
  let value = 0;
  let bits = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/**
 * Base32 secret'ı byte'a çevirir. Geçersiz karakter veya hiç karakter
 * yoksa `null` — çağıran taraf "yapılandırma bozuk" yanıtı verir.
 */
export function decodeBase32(secret: string): Buffer | null {
  const cleaned = secret.toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "");
  if (cleaned.length === 0) return null;

  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  if (bytes.length === 0) return null;
  return Buffer.from(bytes);
}

/** 160 bit (20 byte) secret — Google Authenticator'ın beklediği uzunluk. */
export function generateTotpSecret(byteLength = 20): string {
  return encodeBase32(crypto.randomBytes(byteLength));
}

/** `timeStep` RFC 6238 sayacıdır (süre/30), ham counter değil. */
export function computeTotp(
  secretBytes: Buffer,
  timeStep: number,
  digits = TOTP_DIGITS,
): string {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(timeStep));
  const hmac = crypto.createHmac("sha1", secretBytes).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const truncated = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return truncated.toString().padStart(digits, "0");
}

/**
 * Token'ı `[-window, +window]` adımları üzerinden doğrular.
 * Tüm pencere koşulur (erken `break` zamanlama sinyali verirdi) ve her aday
 * sabit süreli `timingSafeEqual` ile karşılaştırılır.
 */
export function verifyTotp(
  secret: string,
  token: string,
  options: { windowSteps?: number; now?: number } = {},
): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const secretBytes = decodeBase32(secret);
  if (!secretBytes) return false;

  const window = options.windowSteps ?? TOTP_WINDOW_STEPS;
  const currentStep = Math.floor((options.now ?? Date.now()) / 1000 / TOTP_PERIOD_SECONDS);
  let matched = false;

  for (let offset = -window; offset <= window; offset++) {
    const candidate = computeTotp(secretBytes, currentStep + offset);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(token))) matched = true;
  }
  return matched;
}
