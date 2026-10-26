/**
 * lib/comment-hash.ts — SERVER-ONLY. Yorum/puan için geri döndürülemez özetler.
 *
 * ⚠ Bu dosya `node:crypto` içerdiği için ASLA bir "use client" bileşeninden
 * import edilmemelidir. Client'ın ihtiyaç duyduğu her şey (sınırlar, tip,
 * doğrulama) `lib/comment-policy.ts` dosyasındadır ve bu ikisi kasıtlı olarak
 * ayrılmıştır.
 *
 * KVKK notu: Ham IP adresi hiçbir yere yazılmaz ve hiçbir API çıktısında
 * döndürülmez. Buradaki özetler yalnızca iki amaçla kullanılır:
 *   1. Rate-limit anahtarı türetmek,
 *   2. "aynı istemci daha önce puan verdi mi" kontrolü.
 */

import { createHash } from "node:crypto";

/**
 * IP özetleme tuzu. `IP_HASH_SALT` önerilir; yoksa `JWT_SECRET`, o da yoksa
 * sabit bir fallback kullanılır. Fallback durumunda özetler kaba tahminle
 * çözülebilir — bu yalnızca rate-limit dağılımını etkiler, saldırı yüzeyini
 * genişletmez.
 */
export function ipHashSalt(): string {
  return (
    process.env.IP_HASH_SALT ||
    process.env.JWT_SECRET ||
    "xipsoft-dev-salt"
  );
}

/**
 * Ham IP'yi geri döndürülemez biçimde özetler.
 *
 * KULLANIM: sadece rate-limit anahtarı ve spam sinyali. Asla API'de
 * döndürülmez, asla loglanmaz.
 */
export function hashIp(ip: string, salt: string = ipHashSalt()): string {
  return createHash("sha256")
    .update(`${salt}:${ip.trim()}`)
    .digest("hex");
}

/**
 * Misafir puanının "bu tarayıcı daha önce puan verdi mi" parmak izinidir.
 * Üye puanlarında KULLANILMAZ (user_id yeterli).
 */
export function buildVoterKey(ipHash: string, userAgent: string): string {
  return createHash("sha256")
    .update(`${ipHash}:${userAgent.slice(0, 256)}`)
    .digest("hex");
}