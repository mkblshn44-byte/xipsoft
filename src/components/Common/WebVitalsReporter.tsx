"use client";

/**
 * WebVitalsReporter
 *
 * Core Web Vitals (LCP, CLS, INP, FCP, TTFB) ölçümü ve raporlama.
 *
 * - Production: GA4 custom event olarak gönderir (varsa)
 * - Development: console.table ile formatlı çıktı verir
 * - Eşik değerleri Google'ın "Good / Needs Improvement / Poor" skalasına göre
 *
 * Hiçbir görsel render etmez — sıfır CLS etkisi.
 */

import { useEffect } from "react";
import type { Metric } from "web-vitals";

// ── Eşik değerleri (Google CWV 2024 standartları) ─────────────────────────
const THRESHOLDS: Record<string, [number, number]> = {
  LCP:  [2500,  4000],   // good < 2.5s,  poor > 4s
  CLS:  [0.1,   0.25],   // good < 0.1,   poor > 0.25
  INP:  [200,   500],    // good < 200ms, poor > 500ms
  FCP:  [1800,  3000],   // good < 1.8s,  poor > 3s
  TTFB: [800,   1800],   // good < 800ms, poor > 1.8s
};

type Rating = "good" | "needs-improvement" | "poor";

function getRating(name: string, value: number): Rating {
  const [good, poor] = THRESHOLDS[name] ?? [0, Infinity];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

const RATING_EMOJI: Record<Rating, string> = {
  "good":              "✅",
  "needs-improvement": "⚠️",
  "poor":              "❌",
};

// ── GA4'e gönder ──────────────────────────────────────────────────────────
function sendToAnalytics(metric: Metric) {
  // GA4 gtag mevcut değilse sessizce çık
  if (typeof window === "undefined" || !("gtag" in window)) return;

  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;

  gtag("event", metric.name, {
    event_category:   "Web Vitals",
    // GA4 sayısal değer tamsayı bekler — CLS için x1000
    value:            Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    event_label:      metric.id,
    non_interaction:  true,
    metric_rating:    metric.rating,
    metric_delta:     Math.round(metric.delta),
    navigation_type:  metric.navigationType,
  });
}

// ── Dev ortamı konsol çıktısı ─────────────────────────────────────────────
function logToConsole(metric: Metric) {
  const rating  = getRating(metric.name, metric.value);
  const emoji   = RATING_EMOJI[rating];
  const display = metric.name === "CLS"
    ? metric.value.toFixed(4)
    : `${Math.round(metric.value)}ms`;

  console.groupCollapsed(
    `%c${emoji} CWV › ${metric.name}  %c${display}  %c${rating.toUpperCase()}`,
    "font-weight:bold; color:#94a3b8",
    "font-weight:bold; color:#f1f5f9",
    `font-weight:bold; color:${rating === "good" ? "#ddd6fe" : rating === "needs-improvement" ? "#a78bfa" : "#f87171"}`,
  );
  console.table({
    id:    metric.id,
    value: display,
    delta: metric.name === "CLS" ? metric.delta.toFixed(4) : `${Math.round(metric.delta)}ms`,
    rating,
    navigationType: metric.navigationType,
  });
  console.groupEnd();
}

// ── Rapor fonksiyonu ─────────────────────────────────────────────────────
function onMetric(metric: Metric) {
  if (process.env.NODE_ENV !== "production") {
    // Dev'de TTFB/FCP on-demand derleme ve HMR rebuild'iyle şişiyor: rebuild
    // sırasında yüklenen `/` 2435 ms TTFB üretti, ısınmış aynı yol 320 ms.
    // Yanıltıcı "POOR" satırları yerine yalnızca yükleme sonrası metrikler.
    if (metric.name !== "TTFB" && metric.name !== "FCP") logToConsole(metric);
  }
  sendToAnalytics(metric);
}

// ── Bileşen — sıfır render, sadece ölçüm ────────────────────────────────
export default function WebVitalsReporter() {
  useEffect(() => {
    // PERF: `web-vitals` import'u da ilk yüklemede ana thread'i meşgul ediyordu
    // (dev'de ~30 ms, prod'da daha az ama LCP penceresinde gereksiz). Ölçüm
    // zaten sayfa yüklendikten sonra anlamlı; import'u load + idle'a erteliyoruz.
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      // web-vitals'ı lazy import et — initial bundle'a ekleme
      import("web-vitals").then(({ onLCP, onCLS, onINP, onFCP, onTTFB }) => {
        if (cancelled) return;
        // reportAllChanges: true → her güncellemeyi raporla (soft nav dahil)
        onLCP(onMetric,  { reportAllChanges: false });
        onCLS(onMetric,  { reportAllChanges: false });
        onINP(onMetric,  { reportAllChanges: false });
        onFCP(onMetric,  { reportAllChanges: false });
        onTTFB(onMetric, { reportAllChanges: false });
      }).catch(() => {
        // web-vitals yüklenemezse sessizce devam et
      });
    };

    const idle = () => {
      const ric = (
        window as Window & {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
        }
      ).requestIdleCallback;
      if (typeof ric === "function") ric(start, { timeout: 2500 });
      else window.setTimeout(start, 1200);
    };

    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", idle);
    };
  }, []);

  // Hiçbir DOM elementi render etme — CLS etkisi sıfır
  return null;
}
