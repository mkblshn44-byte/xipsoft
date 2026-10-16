"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { Mail, Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/app/_actions/auth/login";

const IS_LOCAL_DEV = process.env.NODE_ENV === "development";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const unauthorized = searchParams.get("error") === "unauthorized";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [error, setError] = useState(unauthorized ? "Bu sayfaya erişim yetkiniz yok." : "");
  const [loading, setLoading] = useState(false);

  function redirectAfterLogin() {
    const redirectTo = searchParams.get("redirect");
    router.refresh();
    // Admin paneline OTOMATİK yönlendirme YAPILMAZ.
    // Giriş sonrası kullanıcı (admin dâhil) siteye (/) döner; admin paneli
    // yalnızca kullanıcı kendisi /admin'e gittiğinde (Telegram 2FA ile) açılır.
    // Aksi halde "giriş → admin paneli" sürprizi oluşur. Yalnızca /admin
    // DIŞINDAKİ güvenli iç hedefler (ör. /blog/write) korunur.
    const isAdminPath =
      !!redirectTo && (redirectTo === "/admin" || redirectTo.startsWith("/admin/"));
    if (
      redirectTo &&
      redirectTo.startsWith("/") &&
      !redirectTo.startsWith("//") &&
      !isAdminPath
    ) {
      router.push(redirectTo);
    } else {
      router.push("/");
    }
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!IS_LOCAL_DEV && !turnstileToken) {
      setError("Lütfen bot doğrulamasını tamamlayın");
      return;
    }

    setLoading(true);
    try {
      const result = await loginAction(email, password, turnstileToken);
      if (!result.success) {
        setError(result.error || "Giriş başarısız");
        turnstileRef.current?.reset();
        setTurnstileToken("");
        return;
      }

      // Tüm roller aynı akıştan geçer. Admin paneline erişimde Telegram 2FA
      // ayrıca tetiklenir (/admin → /admin/verify-2fa).
      redirectAfterLogin();
    } catch {
      setError("Bir hata oluştu");
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      {/* ── Sol: Tam ekran fotoğraf ── */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-3/5">
        <Image
          src="/media/megatron.webp"
          alt="XipSoft"
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1023px) 100vw, (max-width: 1279px) 50vw, 60vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/60" />
      </div>

      {/* ── Sağ: Form ── */}
      <div className="relative flex flex-col w-full lg:w-1/2 xl:w-2/5 bg-zinc-950 overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(124,58,237,0.12)_0%,_transparent_60%)] pointer-events-none" />

        <div className="flex flex-1 items-center justify-center px-6 py-12 z-10">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Tekrar hoş geldiniz</h1>
              <p className="text-sm text-zinc-400">Hesabınıza giriş yapın</p>
            </div>

            <form onSubmit={handleCredentials} className="space-y-5">
              {justRegistered && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                  <span className="mt-0.5">✓</span>
                  Kayıt başarılı! Şimdi giriş yapabilirsiniz.
                </div>
              )}
              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <span className="mt-0.5">⚠</span>
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="ornek@email.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/8 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Şifre</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/5 border border-white/8 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!IS_LOCAL_DEV && (
                <div className="flex justify-center">
                  <div className="cf-turnstile" data-action="turnstile-spin-v2">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={SITE_KEY}
                      onSuccess={setTurnstileToken}
                      onExpire={() => setTurnstileToken("")}
                      onError={() => setTurnstileToken("")}
                      options={{ theme: "dark", action: "turnstile-spin-v2" }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (!IS_LOCAL_DEV && !turnstileToken)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/30"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              Hesabınız yok mu?{" "}
              <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Kayıt olun
              </Link>
            </p>
          </div>
        </div>

        <div className="px-8 pb-6 text-center z-10">
          <p className="text-xs text-zinc-600">© {new Date().getFullYear()} XipSoft. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </div>
  );
}
