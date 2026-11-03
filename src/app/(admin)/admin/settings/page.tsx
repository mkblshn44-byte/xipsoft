import type { Metadata } from "next";
import { Settings, Key, Globe, Bot, Shield, Database } from "lucide-react";

export const metadata: Metadata = {
  title: "Ayarlar | Admin XipSoft",
  robots: { index: false, follow: false },
};

const GROUPS = [
  {
    title: "Site", icon: Globe,
    items: [
      { label: "URL", value: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000" },
      { label: "Env", value: process.env.NODE_ENV || "development" },
      { label: "Maintenance", value: process.env.MAINTENANCE_MODE === "true" ? "Aktif" : "Pasif" },
    ],
  },
  {
    title: "Veritabanı", icon: Database,
    items: [
      { label: "Tür", value: "PostgreSQL (Neon)" },
      { label: "SSL", value: process.env.DATABASE_SSL === "true" ? "Aktif" : "Pasif" },
      { label: "Redis", value: process.env.UPSTASH_REDIS_REST_URL ? "Yapılandırılmış" : "Yok" },
    ],
  },
  {
    title: "Güvenlik", icon: Shield,
    items: [
      { label: "JWT Secret", value: process.env.JWT_SECRET ? "Tanımlı" : "Eksik" },
      { label: "Admin Path", value: process.env.ADMIN_SECRET_PATH || "Tanımsız" },
      { label: "Turnstile", value: process.env.TURNSTILE_SECRET_KEY ? "Var" : "Yok" },
      { label: "hCaptcha", value: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ? "Var" : "Yok" },
    ],
  },
  {
    title: "Telegram", icon: Bot,
    items: [
      { label: "Bot Token", value: process.env.TELEGRAM_BOT_TOKEN ? "Tanımlı" : "Eksik" },
      { label: "Admin Chat", value: process.env.TELEGRAM_ADMIN_CHAT_ID ? "Tanımlı" : "Eksik" },
    ],
  },
  {
    title: "API", icon: Key,
    items: [
      { label: "Bot API Key", value: process.env.BOT_API_KEY ? "Tanımlı" : "Eksik" },
      { label: "Google ID", value: process.env.AUTH_GOOGLE_ID ? "Var" : "Yok" },
      { label: "GitHub ID", value: process.env.AUTH_GITHUB_ID ? "Var" : "Yok" },
    ],
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-zinc-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Ayarlar</h1>
          <p className="text-xs text-zinc-500">Çevre değişkenleri ve yapılandırma</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {GROUPS.map(({ title, icon: Icon, items }) => (
          <div key={title} className="rounded-xl border border-white/5 bg-zinc-900/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-zinc-500" />
              <h2 className="text-xs font-semibold text-zinc-300">{title}</h2>
            </div>
            <div className="space-y-1.5">
              {items.map(({ label, value }) => (
                <div key={label} className="flex justify-between text-[11px]">
                  <span className="text-zinc-500">{label}</span>
                  <span className="text-zinc-300 font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4 text-[11px] text-zinc-500">
        Değişiklikler .env dosyasından yapılmalıdır.
      </div>
    </div>
  );
}
