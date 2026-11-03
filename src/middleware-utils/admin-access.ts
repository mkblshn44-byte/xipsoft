/**
 * Admin Access guard — Middleware Module
 *
 * Akış (yalnızca `/admin` ve `/admin/...` yolları için):
 *   1. Oturum (xipsoft_session JWT) yoksa → /login?redirect=... yönlendir.
 *   2. Rol `admin` DEĞİLSE veya izinli ADMIN_EMAIL ile eşleşmiyorsa
 *      → "GEÇİŞ YOK" sayfasına rewrite (URL değişmez, 403 hissi).
 *   3. Rol admin ama `two_factor_verified` claim'i yoksa
 *      → /admin/verify-2fa'ya yönlendir (Telegram 2FA).
 *      (2FA sayfasının KENDİSİ bu adımdan muaftır.)
 *   4. Doğrulanmış admin → geç.
 *
 * `/api/admin/*` için ayrı guard: rol admin + 2FA zorunlu; aksi halde 401/403 JSON.
 *
 * ÖNEMLİ: Bu guard normal kullanıcı girişini veya genel siteyi ETKİLEMEZ.
 * Telegram env değişkenleri eksikse bile yalnızca admin erişimi fail-closed kalır;
 * /admin/verify-2fa sayfası "yapılandırma eksik" uyarısını gösterir.
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/auth-config";
import { checkAdminIdentity } from "@/lib/admin-2fa-config";

const COOKIE_MAINTENANCE = "xipsoft_maintenance";

// `/admin` ve `/admin/...` — `/admin-xyz` gibi yolları YAKALAMAZ.
const ADMIN_PATH = /^\/admin(?:\/|$)/;
const VERIFY_2FA_PATH = "/admin/verify-2fa";
const NO_ACCESS_PATH = "/erisim-yok";

const AUTH_COOKIES = [
  "xipsoft_session",
  "xipsoft_logged_in",
  "xipsoft_admin_access",
  "xipsoft_2fa_verified",
  "xipsoft_admin_login_challenge",
];

function clearAuthCookies(res: NextResponse): NextResponse {
  for (const name of AUTH_COOKIES) res.cookies.delete(name);
  return res;
}

export async function guardAdminAccess(
  req: NextRequest
): Promise<NextResponse | null> {
  const { pathname, search } = req.nextUrl;

  if (!ADMIN_PATH.test(pathname)) {
    return null;
  }

  const isVerify2faPath =
    pathname === VERIFY_2FA_PATH || pathname.startsWith(`${VERIFY_2FA_PATH}/`);
  const fullPath = pathname + search;
  const loginRedirectTarget = isVerify2faPath ? "/admin" : fullPath;

  const sessionToken = req.cookies.get("xipsoft_session")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", loginRedirectTarget);
    return NextResponse.redirect(loginUrl);
  }

  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(sessionToken, getJwtSecret()));
  } catch {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", loginRedirectTarget);
    return clearAuthCookies(NextResponse.redirect(loginUrl));
  }

  // Yetki: rol admin olmalı + (ADMIN_EMAIL tanımlıysa) onunla eşleşmeli.
  const identity = checkAdminIdentity(payload.role, payload.email);
  if (identity === "not-admin" || identity === "wrong-account") {
    // "GEÇİŞ YOK" — URL /admin/... olarak kalır, erişimsiz sayfa render edilir.
    const denied = NextResponse.rewrite(new URL(NO_ACCESS_PATH, req.url));
    denied.headers.set("x-admin-access", "denied");
    return denied;
  }

  if (payload.two_factor_verified !== true) {
    // config-missing durumu da buraya düşer: admin /admin/verify-2fa'ya gider,
    // sayfa env eksikliğini kullanıcıya gösterir. Env varsa OTP akışı başlar.
    if (isVerify2faPath) return null;
    const verifyUrl = new URL(VERIFY_2FA_PATH, req.url);
    verifyUrl.searchParams.set("redirect", fullPath);
    return NextResponse.redirect(verifyUrl);
  }

  // Doğrulanmış admin 2FA sayfasına dönerse panele yönlendir.
  if (isVerify2faPath) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return null;
}

export function guardMaintenanceMode(
  req: NextRequest
): NextResponse | null {
  const { pathname } = req.nextUrl;

  const isMaintenance =
    process.env.MAINTENANCE_MODE === "true" ||
    req.cookies.get(COOKIE_MAINTENANCE)?.value === "1";

  if (!isMaintenance) return null;

  if (
    ADMIN_PATH.test(pathname) ||
    pathname === "/maintenance" ||
    pathname.startsWith("/api/")
  ) {
    return null;
  }

  return NextResponse.redirect(new URL("/maintenance", req.url));
}

export async function guardAdminApi(
  req: NextRequest
): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/admin")) return null;

  const sessionToken = req.cookies.get("xipsoft_session")?.value;
  if (!sessionToken) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Kimlik doğrulama gerekli" },
      { status: 401 }
    );
  }

  try {
    const { payload } = await jwtVerify(sessionToken, getJwtSecret());
    const identity = checkAdminIdentity(payload.role, payload.email);
    if (identity === "not-admin" || identity === "wrong-account") {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin yetkisi gerekli" },
        { status: 403 }
      );
    }
    if (payload.two_factor_verified !== true) {
      return NextResponse.json(
        { error: "Forbidden", message: "Telegram 2FA doğrulaması gerekli" },
        { status: 403 }
      );
    }
    return null;
  } catch {
    return NextResponse.json(
      { error: "Unauthorized", message: "Oturum süresi doldu veya geçersiz" },
      { status: 401 }
    );
  }
}
