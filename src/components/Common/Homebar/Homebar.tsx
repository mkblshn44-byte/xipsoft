'use client'



import React, { useState, useEffect, useContext } from 'react'

import Image from 'next/image'

import { User } from 'lucide-react'

import { useLanguage } from '@/hooks/useLanguage'

import { AuthContext } from '@/context/AuthContext'



import { cn } from "@/utils"



const UserIcon = () => <User className="w-4 h-4" />



export const Homebar = ({ className }: { className?: string } = {}) => {

  const { locale, setLocale } = useLanguage()

  const user = useContext(AuthContext)?.user ?? null





  const [isOpen, setIsOpen] = useState(false)

  const [position, setPosition] = useState<'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'>('bottom-left')

  const [adminBarHidden, setAdminBarHidden] = useState(false)

  const [homeBarHidden, setHomeBarHidden] = useState(false)



  useEffect(() => {

    const savedPosition = localStorage.getItem('homebar-position') as 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | null

    const savedHidden = localStorage.getItem('homebar-hidden') === 'true'

    const savedAdminHidden = localStorage.getItem('adminbar-hidden') === 'true'

    if (savedPosition) setPosition(savedPosition)

    setHomeBarHidden(savedHidden)

    setAdminBarHidden(savedAdminHidden)

    if (typeof document !== 'undefined') {

      document.body.classList.toggle('admin-bar-hidden', savedAdminHidden)

      document.documentElement.setAttribute('data-theme', 'obsidian')

    }

    // ✅ SECURE: User bilgisi AuthContext'ten alınıyor (localStorage DEĞİL)

  }, [])



  useEffect(() => { localStorage.setItem('homebar-position', position) }, [position])

  useEffect(() => { localStorage.setItem('homebar-hidden', homeBarHidden.toString()) }, [homeBarHidden])

  useEffect(() => { localStorage.setItem('adminbar-hidden', adminBarHidden.toString()) }, [adminBarHidden])



  const clearCookies = async () => {

    if (typeof document === 'undefined') return



    // 1. Client-side erişilebilir cookie'leri temizle

    const cookieStr = typeof document !== 'undefined' ? document.cookie : '';

    cookieStr.split(";").forEach((c) => {

      const parts = (c as string).split("=");

      const key = (parts[0] ?? "").trim();

      if (!key) return;

      document.cookie = `${key}=;expires=${new Date().toUTCString()};path=/`;

      document.cookie = `${key}=;expires=${new Date().toUTCString()};path=/;domain=${window.location.hostname}`;

    });



    // 2. localStorage ve sessionStorage temizle

    localStorage.clear()

    sessionStorage.clear()



    // 4. Cache API (Service Worker cache) temizle

    if ('caches' in window) {

      const cacheNames = await caches.keys()

      await Promise.all(cacheNames.map((name) => caches.delete(name)))

    }



    // 5. IndexedDB temizle

    if ('indexedDB' in window) {

      try {

        const dbs = await indexedDB.databases()

        await Promise.all(dbs.map((db) => db.name ? indexedDB.deleteDatabase(db.name) : Promise.resolve()))

      } catch (_) {}

    }



    window.location.reload()

  }



  const getPositionClasses = () => {

    switch (position) {

      case 'bottom-left':  return 'bottom-4 left-4'

      case 'bottom-right': return 'bottom-4 right-4'

      case 'top-left':     return 'top-4 left-4'

      case 'top-right':    return 'top-4 right-4'

      default:             return 'bottom-4 left-4'

    }

  }



  // Android nav bar / iOS home indicator için safe-area-inset-bottom

  const getPositionStyle = (): React.CSSProperties => {

    if (position === 'bottom-left' || position === 'bottom-right') {

      return { bottom: 'max(1rem, calc(1rem + env(safe-area-inset-bottom)))' }

    }

    return {}

  }



  const getPanelPositionClasses = () =>

    position.startsWith('bottom') ? 'bottom-14 left-0' : 'top-14 left-0'



  if (homeBarHidden) return (

    <button

      onClick={() => setHomeBarHidden(false)}

      aria-label="HomeBar'ı göster"

      className={`fixed z-50 ${getPositionClasses()} w-7 h-7 rounded-full bg-zinc-900/60 border border-zinc-700/40 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity`}

      style={getPositionStyle()}

    >

      <Image src="/media/homebar.webp" alt="XipSoft" width={14} height={14} className="w-3.5 h-3.5 object-contain" />

    </button>

  )



  return (

    <div className={cn("transition-all duration-500 fixed z-50 relative", getPositionClasses(), className)} style={getPositionStyle()}>

      {/* Tetikleyici buton */}

      <button

        onClick={() => setIsOpen(!isOpen)}

        aria-label="XipSoft ayarlar panelini aç"

        aria-expanded={isOpen}

        className="bg-zinc-900/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 dark:border-zinc-700/50 p-2 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center w-11 h-11 hover:border-neon/50"

      >

        <Image

          src="/media/homebar.webp"

          alt="XipSoft"

          width={24}

          height={24}

          className={`w-6 h-6 object-contain transition-transform duration-300 ${isOpen ? 'scale-110 rotate-12' : 'scale-100'}`}

        />

      </button>



      {/* Panel */}

      {isOpen && (

        <div className={`absolute ${getPanelPositionClasses()} w-[min(16rem,calc(100vw-2rem))] rounded-2xl overflow-hidden bg-zinc-900/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 dark:border-zinc-700/50 shadow-2xl text-zinc-300 dark:text-zinc-300`}>

          {/* Başlık */}

          <div className="border-b border-white/10 dark:border-white/10 p-4 flex items-center justify-between">

            <div className="flex items-center gap-2">

              <Image src="/media/logo.webp" alt="XipSoft" width={16} height={5} className="h-4 w-auto" />

              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white dark:text-white">XipSoft Ayarlar</h3>

            </div>

            <button onClick={() => setIsOpen(false)} aria-label="Ayarlar panelini kapat" className="text-zinc-500 dark:text-zinc-400 hover:text-white dark:hover:text-white text-xs transition">✕</button>

          </div>



          <div className="p-4 space-y-5">

            {/* Kullanıcı - SECURE: AuthContext'ten */}

            {user && (

              <div>

                <label className="text-[9px] text-zinc-500 font-bold uppercase mb-2 block tracking-widest">Kullanıcı</label>

                <div className="bg-white/5 border border-white/10 w-full rounded-lg p-2.5 text-xs flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <UserIcon />

                    <span className="truncate">Ziyaretçi</span>

                  </div>

                  <span className="text-[8px] text-zinc-500 uppercase">user</span>

                </div>

              </div>

            )}



            {/* Dil Seçimi */}

            <div>

              <label className="text-[9px] text-zinc-500 font-bold uppercase mb-2 block tracking-widest">Sistem Dili</label>

              <select

                value={locale}

                onChange={(e) => setLocale(e.target.value as any)}

                className="w-full text-zinc-200 rounded-lg p-2.5 text-xs outline-none bg-white/5 border border-white/10 cursor-pointer"

              >

                <option value="tr">🇹🇷 Türkçe</option>

                <option value="en">🇺🇸 English</option><option value="de">🇩🇪 Deutsch</option><option value="fr">🇫🇷 Français</option><option value="es">🇪🇸 Español</option><option value="ru">🇷🇺 Русский</option>

              </select>

            </div>



            {/* Arayüz Kontrolü */}

            <div>

              <label className="text-[9px] text-zinc-500 font-bold uppercase mb-2 block tracking-widest">Arayüz</label>

              <div className="space-y-2">

                <button

                  onClick={() => setHomeBarHidden(true)}

                  className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 py-2 px-3 rounded-lg text-xs font-medium transition"

                >

                  HomeBar&apos;ı gizle

                </button>

              </div>

            </div>



            {/* Çerezleri Temizle */}

            <button

              onClick={clearCookies}

              className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 py-2 px-3 rounded-lg text-xs font-medium transition"

            >

              Çerezleri Temizle

            </button>



            {/* Alt bilgi */}

            <div className="border-t border-white/10 flex items-center justify-between pt-3 text-[9px] text-zinc-600 font-medium">

              <span>v1.0.0</span>

              <span className="flex items-center gap-1">

                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />

                Sistem Aktif

              </span>

            </div>

          </div>

        </div>

      )}

    </div>

  )

}



export default Homebar







