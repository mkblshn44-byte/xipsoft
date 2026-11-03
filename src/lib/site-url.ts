const configuredSiteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;

const configuredOrDefaultUrl = configuredSiteUrl || (
  process.env.NODE_ENV === "production" ? "https://xipsoft.net" : "http://localhost:3000"
);

function isLocalHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return normalizedHostname === "localhost"
    || normalizedHostname.endsWith(".localhost")
    || normalizedHostname === "0.0.0.0"
    || /^127(?:\.\d{1,3}){3}$/.test(normalizedHostname)
    || normalizedHostname === "[::1]";
}

function isLocalUrl(value: string): boolean {
  try {
    return isLocalHostname(new URL(value).hostname);
  } catch {
    return true;
  }
}

// Local development URLs must never be emitted as public canonical URLs.
export const SITE_URL = (isLocalUrl(configuredOrDefaultUrl)
  ? "https://xipsoft.net"
  : configuredOrDefaultUrl
).replace(/\/+$/, "");
