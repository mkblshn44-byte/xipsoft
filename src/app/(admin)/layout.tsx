import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionCookie } from "@/lib/security";
import { checkAdminIdentity } from "@/lib/admin-2fa-config";
import { NOINDEX_NOFOLLOW } from "@/lib/seo-helpers";
import AdminGuard from "./AdminGuard";

/**
 * Panel sayfaları arama motorlarına kapalıdır. next.config.mjs `X-Robots-Tag`
 * başlığıyla bunu header seviyesinde yapıyor; aynı karar HTML içindeki
 * `<meta name="robots">` etiketiyle de verilir — başlık bir CDN/proxy
 * katmanında düşerse etiket yedek olarak kalır.
 */
export const metadata = {
  robots: NOINDEX_NOFOLLOW,
};

/**
 * Admin layout — savunma derinliği katmanı.
 *
 * Erişim kararı middleware'de verilir (rol + ADMIN_EMAIL + Telegram 2FA).
 * Burada yalnızca oturumun geçerli bir admin olduğu doğrulanır.
 *
 * DİKKAT: 2FA yönlendirmesi BU LAYOUT'TA YAPILMAZ. Aksi halde
 * /admin/verify-2fa sayfası (2FA henüz doğrulanmamışken) kendi layout'u
 * tarafından engellenir ve doğrulama akışı kilitlenir. 2FA zorlaması
 * middleware'dedir; buraya 2FA'sız admin yalnızca /admin/verify-2fa
 * üzerinden ulaşabilir, diğer admin sayfalarına erişemez.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  return <AdminGuard>{children}</AdminGuard>;
}
