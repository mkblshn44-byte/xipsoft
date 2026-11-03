"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import XipIcon from "@/components/Ui/Icon";
import { registerAction } from "@/app/_actions/auth/register";

const IS_LOCAL_DEV = process.env.NODE_ENV === "development";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export default function RegisterPageClient() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileInstance>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    if (!IS_LOCAL_DEV && !turnstileToken) {
      setError("Lütfen bot doğrulamasını tamamlayın");
      return;
    }

    setLoading(true);
    try {
      const result = await registerAction(displayName, email, password, turnstileToken);
      if (!result.success) {
        setError(result.error || "Kayıt başarısız");
        turnstileRef.current?.reset();
        setTurnstileToken("");
        return;
      }
      router.push("/login?registered=1");
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
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/60" />

      </div>

      {/* ── Sağ: Register formu ── */}
      <div className="relative flex flex-col w-full lg:w-1/2 xl:w-2/5 bg-zinc-950 overflow-y-auto">
        {/* Arka plan desen */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(156,124,34,0.12)_0%,_transparent_60%)] pointer-events-none" />

        {/* Geri butonu */}
        <div className="hidden lg:flex px-8 pt-8 z-10">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            <XipIcon name="arrow-left" className="w-4 h-4" />
            Ana sayfaya dön
          </Link>
        </div>

        {/* Form alanı */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 z-10">
          <div className="w-full max-w-sm">
            {/* Başlık */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">
                Hesap oluştur
              </h1>
              <p className="text-sm text-zinc-400">
                XipSoft&apos;a katılın, hemen başlayın
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <span className="mt-0.5">⚠</span>
                  {error}
                </div>
              )}

              {/* İsim */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <XipIcon name="user" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Adınız"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/8 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <XipIcon name="mail" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
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

              {/* Şifre */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Şifre
                </label>
                <div className="relative">
                  <XipIcon name="lock" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="En az 8 karakter"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/5 border border-white/8 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <XipIcon name="eye-off" className="w-4 h-4" /> : <XipIcon name="eye" className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Şifre tekrar */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Şifre Tekrar
                </label>
                <div className="relative">
                  <XipIcon name="lock" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Şifrenizi tekrar girin"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/5 border border-white/8 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <XipIcon name="eye-off" className="w-4 h-4" /> : <XipIcon name="eye" className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!IS_LOCAL_DEV && (
                <div className="flex justify-center">
                  <div className="cf-turnstile" data-action="turnstile-register">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={SITE_KEY}
                      onSuccess={setTurnstileToken}
                      onExpire={() => setTurnstileToken("")}
                      onError={() => setTurnstileToken("")}
                      options={{ theme: "dark", action: "turnstile-register" }}
                    />
                  </div>
                </div>
              )}

              {/* Kayıt butonu */}
              <button
                type="submit"
                disabled={loading || (!IS_LOCAL_DEV && !turnstileToken)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-space-950 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/30"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <XipIcon name="user-plus" className="w-4 h-4" glow="strong" />
                )}
                {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
              </button>
            </form>

            {/* Alt bağlantı */}
            <p className="mt-6 text-center text-sm text-zinc-500">
              Zaten hesabınız var mı?{" "}
              <Link
                href="/login"
                className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
              >
                Giriş yapın
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center z-10">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} XipSoft. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </div>
  );
}
