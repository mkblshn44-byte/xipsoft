"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, MessageSquare, RefreshCw, AlertTriangle } from "lucide-react";
import { verifyAdmin2faOtpAction, sendAdmin2faOtpAction } from "@/app/_actions/admin-2fa-actions";

interface Props {
  redirectTo?: string;
  configReady: boolean;
  missingConfig: string[];
}

// Aynı sekmede otomatik gönderimi tek seferlik yap (sayfa yenilemede tekrar kod göndermesin).
const OTP_SENT_SES_KEY = "xipsoft_2fa_otp_sent";

export default function Verify2faClient({ redirectTo, configReady, missingConfig }: Props) {
  const router = useRouter();
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const autoSentRef = useRef(false);

  const dest = redirectTo && redirectTo.startsWith("/admin") ? redirectTo : "/admin";

  async function handleResend(auto = false) {
    if (!auto) setResending(true);
    setResent(false);
    if (!auto) setError("");
    try {
      const result = await sendAdmin2faOtpAction();
      if (!result.success) {
        setError(result.error || "Kod gönderilemedi");
      } else {
        setResent(true);
      }
    } catch {
      setError("Kod gönderilirken hata oluştu");
    } finally {
      if (!auto) setResending(false);
    }
  }

  // İlk yüklemede OTP'yi otomatik gönder (config hazırsa, sekme başına bir kez).
  useEffect(() => {
    if (!configReady || autoSentRef.current) return;
    autoSentRef.current = true;
    if (typeof window !== "undefined" && sessionStorage.getItem(OTP_SENT_SES_KEY) === "1") return;
    if (typeof window !== "undefined") sessionStorage.setItem(OTP_SENT_SES_KEY, "1");
    void handleResend(true);
  }, [configReady]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const clean = otpCode.replace(/\D/g, "").slice(0, 6);
    if (clean.length < 6) {
      setError("Lütfen 6 haneli kodu girin");
      return;
    }
    setLoading(true);
    try {
      const result = await verifyAdmin2faOtpAction(clean);
      if (!result.success) {
        setError(result.error || "Kod doğrulanamadı");
        return;
      }
      if (typeof window !== "undefined") sessionStorage.removeItem(OTP_SENT_SES_KEY);
      router.refresh();
      router.push(dest);
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4">
            <ShieldCheck className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">2FA Doğrulama</h1>
          <p className="text-sm text-zinc-400">Admin paneline erişmek için doğrulama kodunu girin</p>
        </div>

        {/* ── Yapılandırma eksik: yalnızca bu ekranda uyarı, site akışı bozulmaz ── */}
        {!configReady && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Admin Telegram 2FA yapılandırması eksik. Bu nedenle admin paneline giriş
                yapılamaz. Eksik değişkenler:
                <br />
                <code className="text-amber-200">{missingConfig.join(", ") || "-"}</code>
              </span>
            </div>
            <p className="text-xs text-zinc-500 text-center">
              Env değişkenleri tanımlandıktan sonra bu sayfa yeniden yüklenmelidir.
              Normal site ve üye girişi bu durumdan etkilenmez.
            </p>
            <Link
              href="/"
              className="block w-full text-center py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-sm font-semibold transition-all"
            >
              Siteye dön
            </Link>
          </div>
        )}

        {configReady && (
          <>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm mb-6">
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span>
                Telegram botunuz size 6 haneli bir kod göndermiştir. Kod 5 dakika geçerlidir.
                <br />
                <strong>Lütfen Telegram&apos;daki en son mesajda gelen kodu girin.</strong>
              </span>
            </div>

            <form onSubmit={handleVerify} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <span className="mt-0.5">⚠</span>
                  {error}
                </div>
              )}
              {resent && !error && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                  <span className="mt-0.5">✓</span>
                  Kod Telegram&apos;a gönderildi.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Doğrulama Kodu
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoFocus
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-4 rounded-xl bg-white/5 border border-white/8 text-white placeholder:text-zinc-700 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/30"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                {loading ? "Doğrulanıyor..." : "Kodu Doğrula"}
              </button>

              <button
                type="button"
                onClick={() => handleResend(false)}
                disabled={resending}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                {resending ? "Gönderiliyor..." : "Yeni kod gönder"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
