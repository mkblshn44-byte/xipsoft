/**
 * Google AdSense Script + AdBanner Component
 *
 * next/script yerine useEffect + document.createElement kullanılıyor.
 * Sebep: next/script, AdSense'in desteklemedigi "data-nscript" attribute'unu
 * otomatik ekliyor ve bu AdSense konsolunda uyarıya yol açıyor.
 * Düz script tag'i ile bu sorun ortadan kalkar.
 *
 * CLS onlemi: AdBanner, reklam slotları sabit aspect-ratio ve shimmer placeholder kullanır,
 * reklam SDK'sız yükleme esnasında layout shift olmaz.
 */
'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/utils';

const CONSENT_KEY = 'xipsoft_adsense_consent';
const CONSENT_EVENT = 'xipsoft-adsense-consent';

export type AdBannerSize =
  | '728x90'    // leaderboard, üst
  | '300x250'   // MREC, yan/satır içi
  | '320x50'    // mobil banner
  | '160x600'   // wide skyscraper
  | 'responsive';

interface AdBannerProps {
  slot?: string;
  size?: AdBannerSize;
  className?: string;
  label?: string;
}

const SIZE_MAP: Record<AdBannerSize, { w: number; h: number; cls: string }> = {
  '728x90':    { w: 728, h: 90,  cls: 'max-w-[728px] h-[90px]' },
  '300x250':   { w: 300, h: 250, cls: 'w-[300px] h-[250px]' },
  '320x50':    { w: 320, h: 50,  cls: 'max-w-[320px] h-[50px]' },
  '160x600':   { w: 160, h: 600, cls: 'w-[160px] h-[600px]' },
  responsive:  { w: 0,   h: 0,   cls: 'w-full min-h-[280px]' },
};

function ShimmerPlaceholder({ size }: { size: AdBannerSize }) {
  const spec = SIZE_MAP[size];
  return (
    <div
      className={cn(
        'relative mx-auto overflow-hidden rounded-xl border border-white/[0.04] bg-gradient-to-br from-white/[0.02] to-white/[0.01]',
        spec.cls,
        size === 'responsive' ? 'aspect-[16/5] md:aspect-[728/90]' : ''
      )}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.08) 50%, transparent 100%)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
        Reklam
      </div>
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
    </div>
  );
}

export function AdBanner({ slot, size = 'responsive', className, label }: AdBannerProps) {
  const [loaded, setLoaded] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_gOOgLE_ADS_ID;
  const spec = SIZE_MAP[size];

  useEffect(() => {
    const t = window.setTimeout(() => setLoaded(true), 50);
    return () => window.clearTimeout(t);
  }, []);

  if (!clientId) return <ShimmerPlaceholder size={size} />;

  return (
    <div
      className={cn('relative w-full my-6 flex justify-center', className)}
      role="complementary"
      aria-label={label || 'Reklam alanı'}
      data-ad-size={size}
    >
      {!loaded && <ShimmerPlaceholder size={size} />}
      <ins
        className={cn('adsbygoogle block', loaded ? 'opacity-100' : 'absolute opacity-0 pointer-events-none', spec.cls)}
        style={size === 'responsive' ? { display: 'block' } : { display: 'block', width: spec.w, height: spec.h }}
        data-ad-client={clientId}
        data-ad-slot={slot || ''}
        data-ad-format={size === 'responsive' ? 'auto' : undefined}
        data-full-width-responsive={size === 'responsive' ? 'true' : undefined}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(adsbygoogle = window.adsbygoogle || []).push({});`,
        }}
      />
    </div>
  );
}

const GoogleAdSense = () => {
  const clientId = process.env.NEXT_PUBLIC_gOOgLE_ADS_ID;
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    if (!clientId) return;

    const storedConsent = localStorage.getItem(CONSENT_KEY);
    if (storedConsent === 'accepted') {
      setHasConsent(true);
    }

    const handleConsentEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ status: string }>;
      if (customEvent?.detail?.status === 'accepted') {
        setHasConsent(true);
      }
    };

    window.addEventListener(CONSENT_EVENT, handleConsentEvent as EventListener);
    return () => {
      window.removeEventListener(CONSENT_EVENT, handleConsentEvent as EventListener);
    };
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !hasConsent) return;

    if (document.getElementById('google-adsense-script')) return;

    const script = document.createElement('script');
    script.id = 'google-adsense-script';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }, [clientId, hasConsent]);

  return null;
};

export default GoogleAdSense;
