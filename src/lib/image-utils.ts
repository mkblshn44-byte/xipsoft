/**
 * Görsel domain yardımcıları — istemci ve sunucu bileşenlerinde ortak kullanılır.
 *
 * SSOT: Güvenilir uzak domain listesi yalnızca bu dosyada tanımlanır.
 * next.config.mjs → images.remotePatterns ile senkronlu tutulmalıdır.
 */
import { SITE_URL } from "@/config/brand.config";

/** next/image'in optimize edebileceği güvenilir uzak host adı. */
const SITE_HOST = new URL(SITE_URL).hostname; // örn. "xipsoft.net"

const TRUSTED_EXTERNAL_HOSTS = ["res.cloudinary.com"] as const;

/**
 * Verilen URL'nin next/image optimize pipeline'ından geçip geçemeyeceğini belirler.
 * - "/" ile başlayan yerel yollar → true (her zaman optimize edilir)
 * - Site kendi host'u (örn. xipsoft.net) → true
 * - Cloudinary gibi izin listesindeki harici host'lar → true
 * - Diğer harici host'lar → false (unoptimized={true} gerekir)
 */
export function isConfiguredRemoteDomain(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true; // yerel yol
  try {
    const host = new URL(url).hostname;
    return (
      host === SITE_HOST ||
      host.endsWith(`.${SITE_HOST}`) ||
      (TRUSTED_EXTERNAL_HOSTS as readonly string[]).includes(host)
    );
  } catch {
    return false;
  }
}
