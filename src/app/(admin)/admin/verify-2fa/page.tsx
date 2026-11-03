import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionCookie } from "@/lib/security";
import { getAdmin2faConfig, checkAdminIdentity } from "@/lib/admin-2fa-config";
import Verify2faClient from "./Verify2faClient";

export const metadata = { title: "2FA Doğrulama | Admin", robots: { index: false, follow: false } };

/**
 * Admin panele erişmeden önceki Telegram 2FA adımı.
 *
 * Bu sayfa yalnızca:
 *   - Geçerli bir admin oturumu varsa VE
 *   - 2FA henüz doğrulanmamışsa gösterilir.
 *
 * Env değişkenleri eksikse sayfa "yapılandırma eksik" uyarısı gösterir; OTP
 * gönderilmez ve admin erişimi kapalı kalır. Normal site/giriş ETKİLENMEZ.
 */
export default async function Verify2faPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("xipsoft_session")?.value;
  if (!sessionToken) {
    redirect("/login?redirect=/admin");
  }

  const payload = await verifySessionCookie(sessionToken);
  const identity = payload ? checkAdminIdentity(payload.role, payload.email) : "not-admin";
  if (identity === "not-admin" || identity === "wrong-account") {
    redirect("/erisim-yok");
  }

  const sp = await searchParams;
  const dest = sp?.redirect && sp.redirect.startsWith("/admin") ? sp.redirect : "/admin";

  // Zaten 2FA doğrulanmışsa doğrudan panele dön.
  if (payload.two_factor_verified === true) {
    redirect(dest);
  }

  const config = getAdmin2faConfig();

  return (
    <Verify2faClient
      redirectTo={dest}
      configReady={config.ready}
      missingConfig={config.missing}
    />
  );
}
