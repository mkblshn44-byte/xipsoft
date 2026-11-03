/**
 * secret-box.ts — Kimlik doğrulama sırlarını (TOTP secret) veritabanında
 * düz metin yerine şifreli tutmak için AES-256-GCM kutusu.
 *
 * Anahtar kökü: `SECRET_ENCRYPTION_KEY`, yoksa `DB_ENCRYPTION_KEY`. Kök
 * doğrudan kullanılmaz, HKDF-SHA256 ile bu kullanım için türetilir — böylece
 * aynı kökün JWT/CSRF tarafıyla (bkz. auth-config.ts) ürettiği anahtarlar
 * birbirinden ayrılır.
 *
 * Saklama biçimi: `v1:<iv>:<tag>:<ciphertext>` (base64url). Öneki olmayan
 * değerler eski düz metin kayıt olarak okunur ve ŞİFRELENMİŞ HALDE geri
 * yazılır — yani migrate koşusu gerektirmez.
 */
import crypto from "crypto";

const PREFIX = "v1:";
const IV_BYTES = 12;
const HKDF_SALT = "xipsoft-secret-box";
const HKDF_INFO = "totp-secret-v1";

let warnedNoKey = false;

function keyRoot(): string | null {
  return process.env.SECRET_ENCRYPTION_KEY || process.env.DB_ENCRYPTION_KEY || null;
}

function derivedKey(): Buffer | null {
  const root = keyRoot();
  if (!root) return null;
  return Buffer.from(crypto.hkdfSync("sha256", Buffer.from(root), Buffer.from(HKDF_SALT), Buffer.from(HKDF_INFO), 32));
}

/** Değer bu kutu tarafından yazılmış mı? */
export function isWrappedSecret(value: string): boolean {
  return value.startsWith(PREFIX);
}

/**
 * Düz metni sarar. Anahtar yoksa: production'da hata (sessiz şifreleme
 * atlamak, "şifreli" sanılan düz metin üretir), geliştirme ortamında uyarıyla
 * düz metin döner.
 */
export function encryptSecret(plaintext: string): string {
  const key = derivedKey();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[secret-box] SECRET_ENCRYPTION_KEY veya DB_ENCRYPTION_KEY tanımlı değil; sır düz metine düşürülemez");
    }
    if (!warnedNoKey) {
      warnedNoKey = true;
      console.warn("[secret-box] şifreleme anahtarı yok — sırlar bu oturumda düz metin saklanacak (yalnızca development)");
    }
    return plaintext;
  }

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

/**
 * Sarılı değeri çözer. Önek yoksa değeri olduğu gibi döner (eski düz metin
 * satırları). Bozuk/anahtarı olmayan sarım hata verir — sessiz fallback
 * yanlış secret'la doğrulama denemese de loglanabilir bozulma üretirdi.
 */
export function decryptSecret(stored: string): string {
  if (!isWrappedSecret(stored)) return stored;

  const key = derivedKey();
  if (!key) {
    throw new Error("[secret-box] şifreli sır bulundu ama anahtar tanımlı değil");
  }

  const [ivPart, tagPart, dataPart] = stored.slice(PREFIX.length).split(":");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("[secret-box] bozuk sarım biçimi");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8");
}
