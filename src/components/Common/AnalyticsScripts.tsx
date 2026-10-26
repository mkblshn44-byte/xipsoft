"use client";

import Script from "next/script";
import { useEffect } from "react";
import {
  adsId,
  gaId,
  gtagId as primarygtagId,
  metricaId,
  turnstileSiteKey as TURNSTILE_SITE,
} from "@/lib/analytics-config";

/**
 * requestIdleCallback polyfill (Safari ve eski tarayıcılar)
 */
function scheduleIdle(cb: () => void, timeoutMs = 3500) {
  const ric: any =
    (typeof window !== "undefined" && (window as any).requestIdleCallback) ||
    ((fn: () => void) => window.setTimeout(fn, 220));
  try {
    ric(cb, { timeout: timeoutMs });
  } catch {
    window.setTimeout(cb, 600);
  }
}

/**
 * Task 11 — Üçüncü parti scriptler: hydration sonrası idle callback'e ertelenir.
 * - GA/Ads/Yandex: lazyOnload + ayrıca idle sonra inject.
 * - Turnstile: form render edilene kadar hiç yüklenmez.
 * - WhatsApp / Cloudinary: gerek duyulduğunda (intersection) yükle.
 */
export default function AnalyticsScripts() {
  useEffect(() => {
    // window.load sonrası 2s bekle -> requestIdleCallback
    const boot = () => {
      window.setTimeout(() => {
        scheduleIdle(() => {
          // Turnstile scripti: sayfada form varsa yüklensin
          if (TURNSTILE_SITE && !document.getElementById("xip-turnstile-defer")) {
            const hasForms = document.querySelector("form");
            if (hasForms) {
              const s = document.createElement("script");
              s.id = "xip-turnstile-defer";
              s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
              s.async = true;
              s.defer = true;
              document.body.appendChild(s);
            }
          }
        }, 2500);
      }, 1800);
    };

    if (typeof window === "undefined") return;
    if (document.readyState === "complete") boot();
    else window.addEventListener("load", boot, { once: true });
    return () => window.removeEventListener("load", boot);
  }, []);

  if (!primarygtagId && !metricaId) return null;

  return (
    <>
      {primarygtagId && (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${primarygtagId}`}
          strategy="lazyOnload"
        />
      )}
      {primarygtagId && (
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.addEventListener('load', function () {
  window.setTimeout(function () {
    var run = function () {
      window.dataLayer=window.dataLayer||[];
      function gtag(){dataLayer.push(arguments);}
      gtag('js',new Date());
      ${gaId ? `gtag('config','${gaId}');` : ""}
      ${adsId ? `gtag('config','${adsId}');` : ""}
    };
    (window.requestIdleCallback ? window.requestIdleCallback(run, {timeout: 2000}) : setTimeout(run, 500));
  }, 1500);
});`}
        </Script>
      )}
      {metricaId && (
        <Script id="yandex-metrica" strategy="afterInteractive">
          {`window.addEventListener('load', function () {
  window.setTimeout(function () {
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.defer=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(${metricaId},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});
  }, 2200);
});`}
        </Script>
      )}
    </>
  );
}
