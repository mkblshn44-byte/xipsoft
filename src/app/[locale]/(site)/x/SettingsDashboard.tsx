'use client'

import React, { useState, useEffect } from 'react'
import { User, Lock, Bell, Shield, Save, LogOut } from 'lucide-react'
import TitleText from '@/components/Common/TitleText/TitleText'
import { useRouter } from 'next/navigation'
import { changePasswordAction } from '@/app/_actions/auth/password'
import { logoutAction } from '@/app/_actions/auth/session'
import {
  updatePrivacySettingsAction,
  getPrivacySettingsAction,
  enableTwoFactorAction,
  verifyTwoFactorAction,
  disableTwoFactorAction,
} from "@/app/_actions/privacy-actions";
import { updateUserProfileAction } from "@/app/_actions/user-actions";

type Notification = { id: string; title: string; message: string; is_read: boolean; created_at: string };
const getNotificationsAction = async () => ({ success: true, data: [] as Notification[] });
const markNotificationReadAction = async (_id: string) => ({ success: true });
const markAllReadAction = async () => ({ success: true });
const emptyUser = { id: "", display_name: "", email: "", bio: "", website: "", location: "", job: "", photo_url: "" } as any;

export default function SettingsDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'privacy' | 'notifications'>('profile')

  // Auth kaldırıldı — sayfa sadece giriş yapmış kullanıcılar için çalışır
  // Cookie check ile basit bir koruma
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(document.cookie.includes("xipsoft_logged_in=1"));
  }, []);

  // Profil verileri cookie'den basitçe okunamaz — DB sorgusu gerekir
  // Bu sayfa şu an için devre dışı, ileride yeniden yapılandırılacak
  const user = emptyUser;

  // Profile
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')
  const [job, setJob] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  // Security
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [twoFactorMsg, setTwoFactorMsg] = useState('')
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [tfaBusy, setTfaBusy] = useState(false)

  // Privacy
  const [privacy, setPrivacy] = useState({
    privacy_show_email: false,
    privacy_show_activity: true,
    privacy_allow_messages: true,
    privacy_allow_mentions: true,
  })
  const [privacySaving, setPrivacySaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setBio(user.bio || '')
    setWebsite(user.website || '')
    setLocation(user.location || '')
    setJob(user.job || '')
    if (user.id) {
      getPrivacySettingsAction(Number(user.id)).then(res => { if (res) setPrivacy(res) })
    }
  }, [user])

  // Bildirimler tab'ına geçince yükle
  useEffect(() => {
    if (activeTab !== 'notifications') return
    setNotifLoading(true)
    Promise.resolve([]).then(res => {
      setNotifications(res as any)
      setNotifLoading(false)
    })
  }, [activeTab])

  if (!authed) {
    return (
      <div className="min-h-screen bg-obsidian pt-24 pb-20 px-5 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">giriş Yapmanız gerekiyor</h1>
          <p className="text-zinc-400 text-sm">Bu sayfaya erişim için giriş yapmalısınız.</p>
        </div>
      </div>
    );
  }

  const handleProfileSave = async () => {
    if (!user?.id) return
    setProfileSaving(true)
    setProfileMsg('')
    const result = await updateUserProfileAction({
      bio: bio || undefined,
      website: website || undefined,
      location: location || undefined,
      job: job || undefined,
    })
    setProfileSaving(false)
    setProfileMsg(result.success ? '✅ Kaydedildi' : result.error || 'Hata')
    setTimeout(() => setProfileMsg(''), 3000)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg('')
    if (newPassword.length < 8) { setPasswordMsg('En az 8 karakter, büyük/küçük harf, rakam ve özel karakter gerekli'); return }
    if (newPassword !== confirmPassword) { setPasswordMsg('Sifreler eslesmiyor'); return }
    setPasswordBusy(true)
    const result = await changePasswordAction(currentPassword, newPassword)
    setPasswordBusy(false)
    if (result.success) {
      setPasswordMsg('✅ Sifre güncellendi')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } else {
      setPasswordMsg(result.error || 'Hata')
    }
  }

  const handlePrivacyChange = async (key: keyof typeof privacy) => {
    if (!user?.id) return
    setPrivacySaving(true)
    const next = { ...privacy, [key]: !privacy[key] }
    await updatePrivacySettingsAction(Number(user.id), next)
    setPrivacy(next)
    setPrivacySaving(false)
  }

  const handleEnable2FA = async () => {
    if (!user?.id) return
    setTfaBusy(true); setTwoFactorMsg('')
    const result = await enableTwoFactorAction(Number(user.id))
    setTfaBusy(false)
    if (result.success && (result as any).qrCodeUrl) {
      setQrCodeUrl((result as any).qrCodeUrl)
      setShow2FASetup(true)
    } else {
      setTwoFactorMsg(result.error || '2FA baslatılamadı')
    }
  }

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    setTfaBusy(true)
    const result = await verifyTwoFactorAction(Number(user.id), twoFactorToken)
    setTfaBusy(false)
    if (result.success) {
      setTwoFactorMsg('✅ 2FA etkinlestirildi')
      setShow2FASetup(false)
    } else {
      setTwoFactorMsg(result.error || 'Kod dogrulanamadı')
    }
  }

  const tabBtn = (key: typeof activeTab) => {
    const base = 'text-left px-4 py-3 rounded-2xl text-xs -black uppercase tracking-widest transition-all border'
    return activeTab === key
      ? `${base} bg-blue-500/20 text-blue-300 border-blue-500/20`
      : `${base} text-white/40 hover:bg-white/5 border-white/10`
  }

  const input = 'w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-white/40 focus:border-blue-500 outline-none'

  if (!user) return null

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="bg-white/5 border border-white/10 rounded-[28px] p-4">
          <div className="px-4 pt-2 pb-4">
            <TitleText tag="h2" variant="glass" className="text-white">Ayarlar</TitleText>
            <p className="text-[11px] text-white/40">@{user.display_name}</p>
          </div>
          <nav aria-label="Ayarlar menüsü" className="flex flex-col gap-2">
            <button type="button" onClick={() => setActiveTab('profile')} className={tabBtn('profile')} aria-pressed={activeTab === 'profile'}>
              <span className="flex items-center gap-2"><User size={14} aria-hidden="true" /> Profil</span>
            </button>
            <button type="button" onClick={() => setActiveTab('security')} className={tabBtn('security')} aria-pressed={activeTab === 'security'}>
              <span className="flex items-center gap-2"><Lock size={14} aria-hidden="true" /> Güvenlik</span>
            </button>
            <button type="button" onClick={() => setActiveTab('privacy')} className={tabBtn('privacy')} aria-pressed={activeTab === 'privacy'}>
              <span className="flex items-center gap-2"><Shield size={14} aria-hidden="true" /> gizlilik</span>
            </button>
            <button type="button" onClick={() => setActiveTab('notifications')} className={tabBtn('notifications')} aria-pressed={activeTab === 'notifications'}>
              <span className="flex items-center gap-2"><Bell size={14} aria-hidden="true" /> Bildirimler</span>
            </button>
            <button
              type="button"
              onClick={async () => { await logoutAction(); router.push('/') }}
              className="text-left px-4 py-3 rounded-2xl text-xs -black uppercase tracking-widest border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-2 mt-2"
            >
              <LogOut size={14} aria-hidden="true" /> Çıkıs Yap
            </button>
          </nav>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-white/[0.02] border border-white/10 rounded-[2rem] p-8">

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <TitleText tag="h2" variant="glass" className="text-white">Profil Bilgileri</TitleText>
              <button onClick={handleProfileSave} disabled={profileSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white -black rounded-xl text-xs uppercase tracking-widest disabled:opacity-50">
                <Save size={14} aria-hidden="true" /> {profileSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
            {profileMsg && <p className="text-sm text-green-400" role="status">{profileMsg}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-job" className="text-[10px] -black uppercase tracking-widest text-white/40 mb-1 block">Meslek</label>
                <input id="profile-job" className={input} value={job} onChange={e => setJob(e.target.value)} />
              </div>
              <div>
                <label htmlFor="profile-location" className="text-[10px] -black uppercase tracking-widest text-white/40 mb-1 block">Konum</label>
                <input id="profile-location" className={input} value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <div>
                <label htmlFor="profile-website" className="text-[10px] -black uppercase tracking-widest text-white/40 mb-1 block">Website</label>
                <input id="profile-website" className={input} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="profile-bio" className="text-[10px] -black uppercase tracking-widest text-white/40 mb-1 block">Hakkımda</label>
                <textarea id="profile-bio" className={`${input} resize-none`} rows={3} value={bio} onChange={e => setBio(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
              <TitleText tag="h2" variant="glass" className="text-white mb-4">Güvenlik</TitleText>

            {/* Sifre */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h3 className="text-sm -black text-white mb-4 uppercase tracking-widest">Sifre Degistir</h3>
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div>
                  <label htmlFor="current-password" className="sr-only">Mevcut Sifre</label>
                  <input id="current-password" className={input} type="password" placeholder="Mevcut Sifre" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="new-password" className="sr-only">Yeni Sifre</label>
                  <input id="new-password" className={input} type="password" placeholder="Yeni Sifre" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="sr-only">Yeni Sifre tekrar</label>
                  <input id="confirm-password" className={input} type="password" placeholder="Yeni Sifre tekrar" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
                {passwordMsg && <p className="text-sm text-blue-400" role="status">{passwordMsg}</p>}
                <button type="submit" disabled={passwordBusy}
                  className="px-5 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white -black rounded-xl text-xs uppercase tracking-widest disabled:opacity-50">
                  {passwordBusy ? 'güncelleniyor...' : 'güncelle'}
                </button>
              </form>
            </div>

            {/* 2FA */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h3 className="text-sm -black text-white mb-2 uppercase tracking-widest">Iki Faktörlü Dogrulama (2FA)</h3>
              <p className="text-xs text-white/40 mb-4">Hesabınıza ekstra Güvenlik katmanı ekleyin.</p>
              {!show2FASetup ? (
                <button onClick={handleEnable2FA} disabled={tfaBusy}
                  className="px-5 py-2.5 bg-purple-600/80 hover:bg-purple-600 text-white -black rounded-xl text-xs uppercase tracking-widest disabled:opacity-50">
                  {tfaBusy ? 'Yükleniyor...' : '2FA Etkinlestir'}
                </button>
              ) : (
                <form onSubmit={handleVerify2FA} className="space-y-3">
                  {qrCodeUrl && <img src={qrCodeUrl} alt="Iki faktörlü dogrulama için QR kodu — kimlik dogrulayıcı uygulamanızla tarayın" className="w-40 h-40" />}
                  <div>
                    <label htmlFor="tfa-code" className="sr-only">6 haneli dogrulama kodu</label>
                    <input id="tfa-code" className={input} type="text" placeholder="6 haneli kod" maxLength={6}
                      value={twoFactorToken} onChange={e => setTwoFactorToken(e.target.value)} />
                  </div>
                  <button type="submit" disabled={tfaBusy}
                    className="px-5 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white -black rounded-xl text-xs uppercase tracking-widest disabled:opacity-50">
                    {tfaBusy ? 'Dogrulanıyor...' : 'Dogrula'}
                  </button>
                </form>
              )}
              {twoFactorMsg && <p className="text-sm text-blue-400 mt-2" role="status">{twoFactorMsg}</p>}
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-4">
              <TitleText tag="h2" variant="glass" className="text-white mb-4">gizlilik</TitleText>
            {([
              ['privacy_show_email', 'E-posta adresimi göster'],
              ['privacy_show_activity', 'Aktivitemi herkese açık yap'],
              ['privacy_allow_messages', 'Mesaj almaya izin ver'],
              ['privacy_allow_mentions', '@mention\'lara izin ver'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/[0.07] transition">
                <span className="text-sm font-bold text-white">{label}</span>
                <input type="checkbox" checked={privacy[key]} onChange={() => handlePrivacyChange(key)}
                  disabled={privacySaving} className="w-4 h-4 accent-purple-500" />
              </label>
            ))}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <TitleText tag="h2" variant="glass" className="text-white">Bildirimler</TitleText>
              {notifications.some(n => !n.is_read) && (
                <button
                  onClick={async () => {
                    setMarkingAll(true)
                    await markAllReadAction()
                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
                    setMarkingAll(false)
                  }}
                  disabled={markingAll}
                  className="text-xs px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  {markingAll ? 'Isleniyor...' : 'Tümünü okundu isaretle'}
                </button>
              )}
            </div>

            {notifLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-blue-400 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell size={32} className="mx-auto mb-3 text-white/20" />
                <p className="text-white/40 text-sm">Henüz bildirim yok</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                      n.is_read
                        ? 'bg-white/[0.02] border-white/[0.06] opacity-60'
                        : 'bg-blue-500/5 border-blue-500/20'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.is_read ? 'bg-white/20' : 'bg-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{n.title}</p>
                      <p className="text-xs text-white/50 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-white/30 mt-1">
                        {new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={async () => {
                          await markNotificationReadAction(n.id)
                          setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
                        }}
                        className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                      >
                        Okundu
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
