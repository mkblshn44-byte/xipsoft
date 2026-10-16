import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";

export const metadata: Metadata = {
  title: "Geçiş Yok",
  description: "Bu sayfaya erişim yetkiniz bulunmuyor.",
  robots: { index: false, follow: false },
};

/**
 * Admin paneli erişim reddi sayfası.
 *
 * Middleware, `/admin/*` isteğinde oturum sahibinin rolü admin değilse
 * (veya izinli ADMIN_EMAIL ile eşleşmiyorsa) isteği buraya rewrite eder.
 * URL `/admin/...` olarak kalır; kullanıcı doğrudan "GEÇİŞ YOK" uyarısını görür.
 */
export default function NoAccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 mb-6">
          <ShieldX className="w-10 h-10 text-red-400" />
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
          GEÇİŞ YOK
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">
          Bu alana erişim yetkiniz bulunmuyor. Admin paneli yalnızca yetkili
          hesaplara açıktır.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-900/30"
          >
            Ana sayfaya dön
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-sm font-semibold transition-all"
          >
            Farklı hesapla giriş yap
          </Link>
        </div>
      </div>
    </div>
  );
}
