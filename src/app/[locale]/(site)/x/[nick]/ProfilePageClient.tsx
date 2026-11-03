"use client";

import { useEffect, useState, Suspense, lazy } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TitleText from "@/components/Common/TitleText/TitleText";
import XipIcon from "@/components/Ui/Icon";
import { getUserByNickAction } from "@/app/_actions/user-actions";
import type { PublicUserProfile } from "@/types/user-profile";
import { RankglowAvatar } from "@/app/[locale]/(site)/x/RankGlowAvatar";

const SettingsDashboard = lazy(() => import("@/app/[locale]/(site)/x/SettingsDashboard"));

const ROLE_COLORS: Record<string, string> = {
  admin: "#a78bfa",
  moderator: "#ddd6fe",
  user: "#ddd6fe",
  premium: "#c4b5fd",
  banned: "#dc2626",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  moderator: "Moderatör",
  user: "Üye",
  premium: "Premium",
  banned: "Banlı",
};

function parseContent(raw: string): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.text === "string") return parsed.text;
    if (typeof parsed === "string") return parsed;
  } catch {}
  return raw;
}

// ── Skeleton bilesenleri ──────────────────────────────────────────────────────

function ProfileHeaderSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-full h-44 bg-zinc-900" />
      <div className="max-w-6xl mx-auto px-4">
        <div className="relative -mt-14 mb-4 flex items-end justify-between">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 rounded-2xl bg-zinc-800 ring-4 ring-zinc-950" />
            <div className="pb-1 space-y-2">
              <div className="h-5 w-32 bg-zinc-800 rounded" />
              <div className="h-3 w-20 bg-zinc-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-4 bg-zinc-800 rounded w-3/4" />)}
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
        <div className="h-3 w-16 bg-zinc-800 rounded mb-3" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex justify-between py-1.5 border-b border-zinc-800/60 last:border-0">
            <div className="h-3 w-20 bg-zinc-800 rounded" />
            <div className="h-3 w-12 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 animate-pulse">
      <div className="h-3 w-24 bg-zinc-800 rounded mb-4" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800">
            <div className="h-5 w-10 bg-zinc-800 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-16 bg-zinc-800 rounded" />
              <div className="h-4 w-3/4 bg-zinc-800 rounded" />
              <div className="h-3 w-1/2 bg-zinc-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Aktivite bileseni (ayrı yüklenir) ────────────────────────────────────────

function ActivityPanel({ userId }: { userId: number }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActivities([]);
    setLoading(false);
  }, [userId]);

  if (loading) return <ActivitySkeleton />;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
        <XipIcon name="activity" className="w-3.5 h-3.5" />Son Aktiviteler
      </div>
      {activities.length > 0 ? (
        <div className="space-y-2">
          {activities.slice(0, 15).map((activity, index) => {
            const isThread = activity.type === "thread";
            const contentText = parseContent(activity.content ?? "");
            const href = isThread
              ? `/blog`
              : `/blog`;
            return (
              <Link
                key={index}
                href={href}
                className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 transition-all group"
              >
                <div className={`mt-0.5 flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isThread ? "bg-blue-500/15 text-blue-400" : "bg-violet-500/15 text-violet-400"
                }`}>
                  {isThread ? "Konu" : "Mesaj"}
                </div>
                <div className="flex-1 min-w-0">
                  {activity.category_name && (
                    <span className="text-[10px] text-zinc-600 mb-0.5 block">{activity.category_name}</span>
                  )}
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">{activity.title}</p>
                  {contentText && (
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{contentText}</p>
                  )}
                  <p className="text-[10px] text-zinc-600 mt-1">
                    {new Date(activity.created_at).toLocaleString("tr-TR", {
                      day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-zinc-600 text-sm">Henüz aktivite bulunmuyor</p>
        </div>
      )}
    </div>
  );
}

// ── Stats + sidebar (ayrı yüklenir) ──────────────────────────────────────────

function ProfileSidebar({
  profile,
  privacySettings,
}: {
  profile: PublicUserProfile;
  privacySettings: { privacy_show_email: boolean; privacy_show_activity: boolean; privacy_allow_messages: boolean };
}) {
  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  return (
    <div className="space-y-3">
      {(profile.website || profile.email || profile.location || profile.job) && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
          {profile.website && (
            <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-xs text-zinc-400 hover:text-cyan-400 transition-colors truncate">
              <XipIcon name="globe" className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {privacySettings.privacy_show_email && profile.email && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 truncate">
              <XipIcon name="mail" className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              {profile.email}
            </div>
          )}
          {profile.location && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <XipIcon name="map-pin" className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              {profile.location}
            </div>
          )}
          {profile.job && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <XipIcon name="briefcase" className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
              {profile.job}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Rozetler</span>
          <Link href="#" className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">Tümü</Link>
        </div>
        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Rozet kazanmak için{" "}
          <Link href="#" className="text-blue-400 hover:underline">rozetler</Link>{" "}
          sayfasını inceleyebilirsiniz.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <XipIcon name="clock" className="w-3 h-3" />Son görülme
          </span>
          <span className="text-[11px] text-zinc-300">
            {profile.last_active
              ? new Date(profile.last_active).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
              : "Bugün"}
          </span>
        </div>
        {privacySettings.privacy_show_activity && profile.last_active && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <XipIcon name="wifi" className="w-3 h-3" />Son görülme
            </span>
            <span className="text-[11px] text-zinc-300">
              {new Date(profile.last_active).toLocaleString("tr-TR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <XipIcon name="hash" className="w-3 h-3" />Künye
        </div>
        <div className="space-y-0">
          {[
            ["Ad Soyad", profile.display_name ? `${profile.display_name.substring(0, 2)}***** ${profile.display_name.split(" ")[1]?.substring(0, 2) || ""}*****` : "—"],
            ["Üyelik Tarihi", joinDate],
            ["Meslek", profile.job || "—"],
            ["sube", profile.branch || profile.location || "—"],
            ["Profil Ziyareti", "—"],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between items-center py-1.5 border-b border-zinc-800/60 last:border-0">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <span className="w-3 h-3 text-green-500 flex-shrink-0">•</span>
                {label}
              </span>
              <span className="text-[11px] text-zinc-300">: {val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
      </div>
    </div>
  );
}

// ── Sidebar veri yükleyici ────────────────────────────────────────────────────

function ProfileSidebarLoader({ profile }: { profile: PublicUserProfile }) {
  const [ready, setReady] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    privacy_show_email: false,
    privacy_show_activity: true,
    privacy_allow_messages: true,
  });

  useEffect(() => {
    Promise.resolve({ privacy_show_email: false, privacy_show_activity: true, privacy_allow_messages: true }).then((privacy) => {
      if (privacy) setPrivacySettings(privacy);
      setReady(true);
    });
  }, [profile.id]);

  if (!ready) return <SidebarSkeleton />;

  return (
    <ProfileSidebar
      profile={profile}
      privacySettings={privacySettings}
    />
  );
}

// ── Ana bilesen ───────────────────────────────────────────────────────────────

type ProfileTab = "activity" | "profile";

export default function ProfilePageClient({
  initialProfile = null,
}: {
  /** Sunucu tarafında çözülen profil (SSR). Yoksa istemci fallback ile çekilir. */
  initialProfile?: PublicUserProfile | null;
}) {
  const params = useParams();
  const currentUser = null as PublicUserProfile | null;
  const [profile, setProfile] = useState<PublicUserProfile | null>(initialProfile);
  const [loading, setLoading] = useState(!initialProfile);
  const [activeTab, setActiveTab] = useState<ProfileTab>("activity");
  const [showSettings, setShowSettings] = useState(false);

  // Sunucu verisi yoksa (ör. istemci tarafı gezinme) profil verisini çek.
  useEffect(() => {
    if (initialProfile || !params.nick) return;
    const nick = (params.nick as string).toLowerCase();
    getUserByNickAction(nick).then((data) => {
      setProfile((data as PublicUserProfile | null) ?? null);
      setLoading(false);
    });
  }, [initialProfile, params.nick]);

  if (loading) return <ProfileHeaderSkeleton />;

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(167, 139, 250,0.10)", border: "1px solid rgba(167, 139, 250,0.20)" }}
          >
            <XipIcon name="user" className="h-9 w-9" style={{ color: "#a78bfa" }} glow="none" />
          </div>
          <TitleText tag="h1" variant="glass" className="mb-2">Kullanıcı Bulunamadı</TitleText>
          <p className="text-zinc-500 text-sm mb-6">
            <span className="text-zinc-300 font-mono">@{params.nick}</span> adlı kullanıcı mevcut degil ya da hesabı silinmis.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-zinc-950 transition-all hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg, #ddd6fe, #a78bfa)", boxShadow: "0 0 20px rgba(167, 139, 250,0.12)" }}
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  // TypeScript type assertion to fix narrowing issue
  const profileData = profile!;
  const isOwner = currentUser?.id === profileData.id;
  const roleColor = ROLE_COLORS[profileData.role] ?? "#ddd6fe";
  const roleLabel = ROLE_LABELS[profileData.role] ?? profileData.role;

  if (showSettings && isOwner) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => setShowSettings(false)}
          className="text-xs text-zinc-500 hover:text-white mb-6 flex items-center gap-1 transition-colors"
        >
          ← Profile Dön
        </button>
        <Suspense fallback={<div className="animate-pulse h-64 bg-zinc-900 rounded-xl" />}>
          <SettingsDashboard />
        </Suspense>
      </div>
    );
  }

  // Person (E-E-A-T) JSON-LD sunucu tarafında (page.tsx) üretilir ve tek yere
  // basılır; burada yalnızca görsel arayüz render edilir.
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Cover */}
      <div className="relative w-full h-44 overflow-hidden">
        {(profile as any).cover_url ? (
          <img src={(profile as any).cover_url} alt="Kapak" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(100deg, #0b0f19 0%, #121826 42%, #0b0f19 60%, #121826 100%)" }} />
        )}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(203, 213, 225,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(203, 213, 225,0.5) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        {isOwner && (
          <label className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <XipIcon name="camera" className="w-4 h-4" />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append("file", file);
                fd.append("type", "cover");
                const { uploadAvatarAction } = await import("@/app/_actions/upload-actions");
                const result = await uploadAvatarAction(fd);
                if (result.success && result.url) {
                  setProfile((p) => p ? { ...p, cover_url: result.url as string } : p);
                }
              }}
            />
          </label>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* Avatar row — hemen render */}
        <div className="relative -mt-14 mb-4 flex items-end justify-between">
          <div className="flex items-end gap-4">
            <div className="ring-4 ring-zinc-950 rounded-2xl flex-shrink-0 relative">
              {isOwner ? (
                <label className="cursor-pointer block relative group/avatar">
                  <RankglowAvatar
                    avatar={profileData.photo_url}
                    username={profileData.display_name || "?"}
                    rankColor={roleColor}
                    isNeon={profileData.role === "admin"}
                    size={96}
                  />
                  <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                    <XipIcon name="camera" className="w-6 h-6 text-white" />
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("file", file);
                      fd.append("type", "avatar");
                      const { uploadAvatarAction } = await import("@/app/_actions/upload-actions");
                      const result = await uploadAvatarAction(fd);
                      if (result.success && result.url) {
                        setProfile((p) => p ? { ...p, photo_url: result.url ?? null } : p);
                      }
                    }}
                  />
                </label>
              ) : (
                <RankglowAvatar
                  avatar={profileData.photo_url}
                  username={profileData.display_name || "?"}
                  rankColor={roleColor}
                  isNeon={profileData.role === "admin"}
                  size={96}
                />
              )}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <TitleText tag="h1" variant="glass" className="text-white">{profileData.display_name || "Anonymous"}</TitleText>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: roleColor }}>
                  {roleLabel}
                </span>
                {(() => {
                  const lastActive = profileData.last_active ? new Date(profileData.last_active) : null;
                  const isOnline = lastActive && (Date.now() - lastActive.getTime()) < 5 * 60 * 1000;
                  return isOnline ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] text-green-400">Çevrimiçi</span>
                    </span>
                  ) : null;
                })()}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">@{profileData.display_name?.toLowerCase().replace(/\s/g, "") || "user"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-1">
            {!isOwner && (
              <>
                <Link
                  href={`/hakkimizda#contact`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold transition-all"
                >
                  <XipIcon name="message-circle" className="w-3.5 h-3.5" glow="none" />Mesaj
                </Link>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all text-xs font-semibold">
                  <XipIcon name="user" className="w-3.5 h-3.5" />Takip Et
                </button>
              </>
            )}
            {isOwner && (
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all text-xs font-semibold"
              >
                <XipIcon name="settings" className="w-3.5 h-3.5" />Ayarlar
              </button>
            )}
          </div>
        </div>

        {/* grid: sidebar + content */}
        <div className="grid grid-cols-12 gap-4 pb-12">

          {/* Sol sidebar — stats/privacy lazy yüklenir */}
          <aside className="col-span-12 lg:col-span-3">
            <ProfileSidebarLoader profile={profile} />
          </aside>

          {/* Sag içerik */}
          <main className="col-span-12 lg:col-span-9 space-y-3">
            {/* Tabs */}
            <div className="flex items-center gap-0 border-b border-zinc-800 overflow-x-auto">
              {[
                { key: "activity", label: "Aktivite", icon: "activity" },
                { key: "profile", label: "Profil", icon: "user" },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as ProfileTab)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all -mb-px ${
                    activeTab === key
                      ? "border-purple-500 text-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <XipIcon name={icon} className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
              <button className="flex items-center gap-1 px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-all ml-auto">
                Diger <XipIcon name="chevron-down" className="w-3 h-3" />
              </button>
            </div>

            {/* Aktivite — lazy yüklenir */}
            {activeTab === "activity" && (
              <ActivityPanel userId={profileData.id as number} />
            )}

            {/* Profil tab */}
            {activeTab === "profile" && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 min-h-[300px]">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <XipIcon name="user" className="w-3.5 h-3.5" />Profil Bilgileri
                </div>
                <div className="space-y-4">
                  {profileData.bio && (
                    <div>
                      <p className="text-[11px] text-zinc-500 mb-1">Hakkında</p>
                      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{profileData.bio}</p>
                    </div>
                  )}
                  {profileData.signature && (
                    <div className="pt-3 border-t border-zinc-800">
                      <p className="text-[11px] text-zinc-500 mb-1">Imza</p>
                      <p className="text-xs text-zinc-400 leading-relaxed italic">{profileData.signature}</p>
                    </div>
                  )}
                  {!profileData.bio && !profileData.signature && (
                    <p className="text-zinc-600 text-sm text-center py-8">Profil bilgisi eklenmemis</p>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
