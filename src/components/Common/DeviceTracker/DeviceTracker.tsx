"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "xipsoft_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function getScreenSize(): string {
  if (typeof window === "undefined") return "";
  const w = window.screen?.width ?? 0;
  const h = window.screen?.height ?? 0;
  return w && h ? `${w}x${h}` : "";
}

export default function DeviceTracker() {
  const pathname = usePathname();
  const lastPath = useRef("");
  const startTime = useRef(Date.now());

  useEffect(() => {
    const path = pathname;
    if (path === lastPath.current) return;
    const isInitialPage = lastPath.current === "";
    lastPath.current = path;
    const startedAt = performance.now();
    startTime.current = Date.now();
    const visitToken = crypto.randomUUID();

    // PERF: pageview'i tamamen kritik yoldan çıkar.
    // sendBeacon ile bağlantı kurulmadan gönder (en düşük öncelik).
    // Tarayıcı desteklemiyorsa load+idle sonrası fetch.
    let cancelled = false;
    let delivered = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const payload = {
      session_id: getSessionId(),
      page_url: path,
      referrer: typeof document !== "undefined" ? document.referrer || "" : "",
      screen: getScreenSize(),
      timestamp: new Date().toISOString(),
      visit_token: visitToken,
      duration_seconds: 0,
      transfer_bytes: 0,
    };
    const body = JSON.stringify({ type: "pageview", ...payload });

    const sendRequest = (requestBody: string) => {
      try {
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          const blob = new Blob([requestBody], { type: "application/json" });
          if (navigator.sendBeacon("/api/track", blob)) return;
        }
      } catch {
        // fallback to fetch
      }

      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
        keepalive: true,
      }).catch(() => {});
    };

    const sendEngagement = () => {
      const duration = Math.max(0, Math.floor((performance.now() - startedAt) / 1000));
      const navigationBytes = isInitialPage
        ? (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.transferSize ?? 0
        : 0;
      const resourceBytes = performance
        .getEntriesByType("resource")
        .filter((entry) => isInitialPage || entry.startTime >= startedAt)
        .reduce((total, entry) => total + ((entry as PerformanceResourceTiming).transferSize || 0), 0);

      sendRequest(JSON.stringify({
        type: "engagement",
        ...payload,
        duration_seconds: duration,
        transfer_bytes: navigationBytes + resourceBytes,
      }));
    };
    const onPageHide = () => sendEngagement();
    window.addEventListener("pagehide", onPageHide);

    const sendPageview = () => {
      if (cancelled || delivered) return;
      delivered = true;
      sendRequest(body);
    };

    const schedule = () => {
      if (cancelled) return;
      const ric = (
        window as Window & {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
          cancelIdleCallback?: (id: number) => void;
        }
      ).requestIdleCallback;

      if (typeof ric === "function") {
        idleId = ric(sendPageview, { timeout: 4000 });
      } else {
        timeoutId = setTimeout(sendPageview, 2000);
      }
    };

    // Mümkünse hemen sendBeacon ile gönder (en az gecikme, zincire girmez)
    if (document.readyState === "complete") {
      // küçük bir gecikme ile paint'ten sonra gönder
      timeoutId = setTimeout(() => {
        sendPageview();
        schedule();
      }, 600);
    } else {
      const onLoad = () => {
        timeoutId = setTimeout(() => {
          sendPageview();
          schedule();
        }, 600);
      };
      window.addEventListener("load", onLoad, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onPageHide);
      sendEngagement();
      if (idleId !== null && typeof (window as any).cancelIdleCallback === "function") {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}
