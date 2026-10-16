/**
 * SSRF koruması — dış URL'lerin yalnızca genel HTTPS adreslerine işaret
 * etmesini sağlar (iç ağ / loopback / link-local yasak).
 */

const PRIVATE_IP_PATTERNS = [
  /^127\./, // loopback
  /^10\./, // RFC1918
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC1918
  /^192\.168\./, // RFC1918
  /^169\.254\./, // link-local (APIPA)
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 ULA
  /^fe80:/i, // IPv6 link-local
  /^0\./, // 0.0.0.0/8
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /\.corp$/i,
];

/** URL genel bir HTTPS adres mi? (SSRF koruması) */
export function isSafeExternalUrl(rawUrl: string): boolean {
  if (!rawUrl || rawUrl.length > 2048) return false;
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:") return false;
    if (u.port && u.port !== "443") return false;
    const host = u.hostname.toLowerCase();
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(host)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
