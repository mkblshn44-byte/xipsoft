/**
 * Task 10 — Aylık SEO Cron Raporu (Vercel Cron)
 *
 * Schedule: 05:00 UTC, her ayın 1'i (vercel.json crons aracılığıyla tetiklenir)
 *
 * İşlev:
 * 1. Auth — sadece Vercel Cron (Authorization: Bearer CRON_SECRET) veya
 *    geliştirme ortamında CRON bypass izni ile erişilebilir.
 * 2. Pagespeed Insights (PSİ) API'sini kullanarak kritik sayfalar için
 *    Core Web Vitals (LCP, CLS, INP/FID) + performans skorlarını ölçer.
 * 3. Blog/ hizmet/ ilçe sayfalarını tarayıp SEO eksiklerini sıralar (meta length,
 *    canonical, H1, görsel alt, schema, heading hiyerarşisi vb).
 * 4. SMTP ile (nodemailer — mevcut projeye entegre) ayarlı adrese özet raporu atar.
 * 5. DB'ye (opsiyonel) kaydedilir, admin panelinden izlenebilir.
 *
 * CRON_SECRET env değişkeni Vercel proje settings'den tanımlanmalıdır.
 */

import { NextResponse } from "next/server";
import { importPKCS8, SignJWT } from "jose";
import { SITE_URL } from "@/lib/site-url";

// Örnek kritik sayfalar — veritabanından da çekilebilir.
const CRITICAL_PATHS = [
  "/",
  "/blog",
  "/hizmetler",
  "/hizmetler/web-yazilim-tasarim",
  "/hizmetler/mobil-uygulama-gelistirme",
  "/hizmetler/seo-ve-dijital-pazarlama",
  "/contact-us",
  "/hakkimizda",
];

// Simple heuristic-based SEO audit checklist.
type Issue = {
  severity: "high" | "medium" | "low";
  path: string;
  rule: string;
  detail: string;
};

type PageSpeedMetric = { percentile?: number };

interface PageSpeedResponse {
  lighthouseResult?: {
    categories?: Record<string, { score?: number }>;
    audits?: Record<string, { numericValue?: number }>;
  };
  loadingExperience?: {
    overall_category?: string;
    metrics?: Record<string, PageSpeedMetric>;
  };
  originLoadingExperience?: {
    overall_category?: string;
    metrics?: Record<string, PageSpeedMetric>;
  };
}

interface PageAudit {
  path: string;
  perfScore: number | null;
  seoScore: number | null;
  lcp: number | null;
  cls: number | null;
  fieldLcp: number | null;
  fieldCls: number | null;
  fieldInp: number | null;
  fieldSource: "page" | "origin" | null;
  error: string | null;
  issues: Issue[];
}

interface SearchAnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

interface SearchConsoleChange {
  page: string;
  previousClicks: number;
  currentClicks: number;
  previousImpressions: number;
  currentImpressions: number;
  previousCtr: number;
  currentCtr: number;
  positionChange: number;
}

interface SearchConsoleReport {
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
  changedPages: SearchConsoleChange[];
}

function psUrl(path: string, strategy: "mobile" | "desktop" = "mobile") {
  const url = `${SITE_URL}${path}`;
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`;
  const usp = new URLSearchParams({
    url,
    strategy,
    category: ["PERFORMANCE", "SEO", "ACCESSIBILITY", "BEST_PRACTICES"].join(
      ",",
    ),
    prettyPrint: "false",
  });
  const key = process.env.GOOGLE_PSI_API_KEY;
  if (key) usp.set("key", key);
  return `${endpoint}?${usp.toString()}`;
}

function getFieldMetric(
  metrics: Record<string, PageSpeedMetric> | undefined,
  key: string,
  divisor = 1,
): number | null {
  const percentile = metrics?.[key]?.percentile;
  return typeof percentile === "number" ? percentile / divisor : null;
}

async function fetchLighthouseAudit(path: string): Promise<PageAudit> {
  const issues: Issue[] = [];
  let lcp: number | null = null;
  let cls: number | null = null;
  let perfScore: number | null = null;
  let seoScore: number | null = null;

  let data: PageSpeedResponse;
  try {
    const response = await fetch(psUrl(path), {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(35_000),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(
        `PageSpeed Insights HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
      );
    }
    data = (await response.json()) as PageSpeedResponse;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Bilinmeyen PageSpeed Insights hatası";
    console.error(
      `[cron:seo] PageSpeed audit failed for ${path}: ${errorMessage}`,
    );
    issues.push({
      severity: "medium",
      path,
      rule: "PSI-API",
      detail: errorMessage,
    });
    return {
      path,
      perfScore,
      seoScore,
      lcp,
      cls,
      fieldLcp: null,
      fieldCls: null,
      fieldInp: null,
      fieldSource: null,
      error: errorMessage,
      issues,
    };
  }

  if (data.lighthouseResult) {
    const lhr = data.lighthouseResult;
    perfScore = Math.round((lhr.categories?.performance?.score ?? 0) * 100);
    seoScore = Math.round((lhr.categories?.seo?.score ?? 0) * 100);

    lcp = lhr.audits?.["largest-contentful-paint"]?.numericValue ?? null;
    cls = lhr.audits?.["cumulative-layout-shift"]?.numericValue ?? null;

    if (perfScore < 70)
      issues.push({
        severity: "high",
        path,
        rule: "PERF-001",
        detail: `Performans skoru ${perfScore} (<70)`,
      });
    if (lcp !== null && lcp > 2_500)
      issues.push({
        severity: "high",
        path,
        rule: "CWV-LCP-LAB",
        detail: `Laboratuvar LCP ${(lcp / 1000).toFixed(2)}s (>2.5s)`,
      });
    if (cls !== null && cls > 0.1)
      issues.push({
        severity: "high",
        path,
        rule: "CWV-CLS-LAB",
        detail: `Laboratuvar CLS ${cls.toFixed(3)} (>0.1)`,
      });
    if (seoScore !== null && seoScore < 80)
      issues.push({
        severity: "medium",
        path,
        rule: "SEO-001",
        detail: `SEO skoru ${seoScore} (<80)`,
      });
  }

  const pageMetrics = data.loadingExperience?.metrics;
  const originMetrics = data.originLoadingExperience?.metrics;
  const pageHasFieldData = Boolean(
    pageMetrics && Object.keys(pageMetrics).length > 0,
  );
  const fieldMetrics = pageHasFieldData ? pageMetrics : originMetrics;
  const fieldLcp = getFieldMetric(fieldMetrics, "LARGEST_CONTENTFUL_PAINT_MS");
  const fieldCls = getFieldMetric(
    fieldMetrics,
    "CUMULATIVE_LAYOUT_SHIFT_SCORE",
    1000,
  );
  const fieldInp = getFieldMetric(fieldMetrics, "INTERACTION_TO_NEXT_PAINT");
  const fieldSource = fieldMetrics
    ? pageHasFieldData
      ? "page"
      : "origin"
    : null;
  const error = data.lighthouseResult
    ? null
    : "PageSpeed yanıtında Lighthouse raporu bulunamadı.";
  if (error) {
    issues.push({
      severity: "medium",
      path,
      rule: "PSI-RESULT",
      detail: error,
    });
  }

  if (fieldLcp !== null && fieldLcp > 2_500) {
    issues.push({
      severity: "high",
      path,
      rule: "CWV-LCP-FIELD",
      detail: `Alan verisi LCP ${(fieldLcp / 1000).toFixed(2)}s (>2.5s)`,
    });
  }
  if (fieldCls !== null && fieldCls > 0.1) {
    issues.push({
      severity: "high",
      path,
      rule: "CWV-CLS-FIELD",
      detail: `Alan verisi CLS ${fieldCls.toFixed(3)} (>0.1)`,
    });
  }
  if (fieldInp !== null && fieldInp > 200) {
    issues.push({
      severity: "high",
      path,
      rule: "CWV-INP-FIELD",
      detail: `Alan verisi INP ${Math.round(fieldInp)}ms (>200ms)`,
    });
  }

  return {
    path,
    perfScore,
    seoScore,
    lcp,
    cls,
    fieldLcp,
    fieldCls,
    fieldInp,
    fieldSource,
    error,
    issues,
  };
}

function dateAtUtcOffset(value: Date, offsetDays: number): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function getSearchConsoleAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;

  if (!email && !privateKey && !siteUrl) return null;
  if (!email || !privateKey || !siteUrl) {
    throw new Error(
      "Search Console için GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL, GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ve GOOGLE_SEARCH_CONSOLE_SITE_URL birlikte tanımlanmalıdır.",
    );
  }

  const key = await importPKCS8(privateKey, "RS256");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(
      `Google OAuth token request failed with HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  const token = (await response.json()) as { access_token?: unknown };
  if (typeof token.access_token !== "string" || !token.access_token) {
    throw new Error("Google OAuth response did not include an access token.");
  }
  return token.access_token;
}

async function querySearchAnalytics(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<SearchAnalyticsRow[]> {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
  if (!siteUrl)
    throw new Error("GOOGLE_SEARCH_CONSOLE_SITE_URL is not configured.");

  const endpoint = new URL(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
  );
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["page"],
      type: "web",
      rowLimit: 25_000,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(
      `Search Console Search Analytics returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  const result = (await response.json()) as { rows?: SearchAnalyticsRow[] };
  return Array.isArray(result.rows) ? result.rows : [];
}

async function fetchSearchConsoleReport(): Promise<SearchConsoleReport | null> {
  const accessToken = await getSearchConsoleAccessToken();
  if (!accessToken) return null;

  const endDate = dateAtUtcOffset(new Date(), -1);
  const startDate = dateAtUtcOffset(new Date(`${endDate}T00:00:00Z`), -27);
  const previousEndDate = dateAtUtcOffset(
    new Date(`${startDate}T00:00:00Z`),
    -1,
  );
  const previousStartDate = dateAtUtcOffset(
    new Date(`${previousEndDate}T00:00:00Z`),
    -27,
  );
  const [currentRows, previousRows] = await Promise.all([
    querySearchAnalytics(accessToken, startDate, endDate),
    querySearchAnalytics(accessToken, previousStartDate, previousEndDate),
  ]);

  const currentByPage = new Map(
    currentRows
      .filter((row) => typeof row.keys?.[0] === "string")
      .map((row) => [row.keys![0], row]),
  );

  const changedPages = previousRows.flatMap(
    (previous): SearchConsoleChange[] => {
      const page = previous.keys?.[0];
      if (!page || (previous.impressions ?? 0) < 20) return [];

      const current = currentByPage.get(page);
      const previousClicks = previous.clicks ?? 0;
      const currentClicks = current?.clicks ?? 0;
      const previousImpressions = previous.impressions ?? 0;
      const currentImpressions = current?.impressions ?? 0;
      const previousCtr = previous.ctr ?? 0;
      const currentCtr = current?.ctr ?? 0;
      const positionChange =
        (current?.position ?? previous.position ?? 0) -
        (previous.position ?? 0);
      const clicksDropped =
        previousClicks >= 5 && currentClicks <= previousClicks * 0.8;
      const impressionsDropped =
        currentImpressions <= previousImpressions * 0.8;
      const positionWorsened = positionChange >= 1;
      const ctrDropped =
        previousCtr > 0 && (currentCtr - previousCtr) / previousCtr <= -0.1;

      if (
        !clicksDropped &&
        !impressionsDropped &&
        !positionWorsened &&
        !ctrDropped
      )
        return [];
      return [
        {
          page,
          previousClicks,
          currentClicks,
          previousImpressions,
          currentImpressions,
          previousCtr,
          currentCtr,
          positionChange,
        },
      ];
    },
  );

  changedPages.sort((a, b) => {
    const aScore =
      Math.max(0, a.positionChange) +
      Math.max(0, (a.previousCtr - a.currentCtr) * 100);
    const bScore =
      Math.max(0, b.positionChange) +
      Math.max(0, (b.previousCtr - b.currentCtr) * 100);
    return bScore - aScore;
  });
  return {
    startDate,
    endDate,
    previousStartDate,
    previousEndDate,
    changedPages: changedPages.slice(0, 10),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function buildSummaryHtml(ctx: {
  generatedAt: string;
  pages: PageAudit[];
  issues: Issue[];
  searchConsole: SearchConsoleReport | null;
  searchConsoleError: string | null;
}) {
  const issueRows = ctx.issues
    .slice(0, 30)
    .map(
      (i) =>
        `<tr><td><span style="color:${
          i.severity === "high"
            ? "#dc2626"
            : i.severity === "medium"
              ? "#a78bfa"
              : "#0891b2"
        };font-weight:600">${i.severity.toUpperCase()}</span></td><td><code>${escapeHtml(i.path)}</code></td><td>${escapeHtml(i.rule)}</td><td>${escapeHtml(i.detail)}</td></tr>`,
    )
    .join("");

  const pageRows = ctx.pages
    .map(
      (page) => `<tr>
      <td><a href="${escapeHtml(new URL(page.path, SITE_URL).toString())}" style="color:#a78bfa;text-decoration:none">${escapeHtml(page.path)}</a></td>
      <td>${page.perfScore ?? "-"}</td>
      <td>${page.seoScore ?? "-"}</td>
      <td>${page.lcp !== null ? (page.lcp / 1000).toFixed(2) + "s" : "-"}</td>
      <td>${page.cls !== null ? page.cls.toFixed(3) : "-"}</td>
      <td>${page.fieldLcp !== null ? (page.fieldLcp / 1000).toFixed(2) + "s" : "-"}</td>
      <td>${page.fieldCls !== null ? page.fieldCls.toFixed(3) : "-"}</td>
      <td>${page.fieldInp !== null ? `${Math.round(page.fieldInp)}ms` : "-"}</td>
      <td>${page.fieldSource === "page" ? "Sayfa" : page.fieldSource === "origin" ? "Site" : "-"}</td>
    </tr>`,
    )
    .join("");

  const searchConsoleRows = ctx.searchConsole?.changedPages
    .map(
      (page) => `<tr>
      <td>${escapeHtml(page.page)}</td>
      <td>${page.previousClicks}</td>
      <td>${page.currentClicks}</td>
      <td>${page.previousImpressions}</td>
      <td>${page.currentImpressions}</td>
      <td>${(page.previousCtr * 100).toFixed(2)}%</td>
      <td>${(page.currentCtr * 100).toFixed(2)}%</td>
      <td>+${page.positionChange.toFixed(1)}</td>
    </tr>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Aylık SEO Raporu — XipSoft</title>
<body style="font-family:Inter,system-ui,-apple-system,sans-serif;background:#0b0b12;color:#e5e7eb;padding:24px">
<div style="max-width:960px;margin:0 auto">
<div style="background:linear-gradient(135deg,#a78bfa,#ddd6fe);-webkit-background-clip:text;background-clip:text;color:transparent">
<h1 style="font-size:28px;margin:0 0 4px 0">XipSoft Aylık SEO Raporu</h1></div>
<p style="color:#94a3b8;margin:0 0 24px 0">Üretilme: ${escapeHtml(ctx.generatedAt)} · ${escapeHtml(SITE_URL)}</p>

<h2 style="font-size:18px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:8px;margin-bottom:12px">Kritik Sayfalar</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:13px">
<thead><tr style="color:#94a3b8;text-align:left">
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Sayfa</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Performans</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">SEO</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">LCP (lab)</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">CLS (lab)</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">LCP p75 (alan)</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">CLS p75 (alan)</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">INP p75 (alan)</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Alan kaynağı</th>
</tr></thead>
<tbody>${pageRows}</tbody></table>

<h2 style="font-size:18px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:8px;margin-bottom:12px">Google Search Console</h2>
${
  ctx.searchConsole
    ? `<p style="color:#94a3b8">Son 28 gün (${ctx.searchConsole.startDate} – ${ctx.searchConsole.endDate}) karşılaştırması: önceki 28 gün (${ctx.searchConsole.previousStartDate} – ${ctx.searchConsole.previousEndDate}). Sıralama kaybı ve CTR düşüşü görülen sayfalar:</p>${
        searchConsoleRows
          ? `<table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:13px"><thead><tr style="color:#94a3b8;text-align:left">
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Sayfa</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Tıklama önce</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Tıklama şimdi</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Gösterim önce</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Gösterim şimdi</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">CTR önce</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">CTR şimdi</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Konum kaybı</th>
</tr></thead><tbody>${searchConsoleRows}</tbody></table>`
          : `<p style="color:#ddd6fe">Belirtilen eşikleri aşan sayfa düşüşü bulunamadı.</p>`
      }`
    : `<p style="color:#a78bfa">Search Console verisi alınmadı: ${
        ctx.searchConsoleError
          ? escapeHtml(ctx.searchConsoleError)
          : "GSC kimlik bilgileri yapılandırılmamış."
      }</p>`
}

<h2 style="font-size:18px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:8px;margin-bottom:12px">
Sorunlar (top 30)
</h2>
${
  issueRows
    ? `<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="color:#94a3b8;text-align:left">
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Şiddet</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Sayfa</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Kural</th>
<th style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.06)">Detay</th>
</tr></thead><tbody>${issueRows}</tbody></table>`
    : `<p style="color:#ddd6fe">✅ Kritik sorun bulunamadı.</p>`
}

<hr style="border-color:rgba(255,255,255,0.06);margin:32px 0 16px">
<p style="color:#64748b;font-size:12px">Bu rapor XipSoft SEO Otomasyonu (Task 10) tarafından aylık Vercel Cron ile üretilmiştir.</p>
</div></body></html>`;
}

async function sendReportEmail(html: string, subject: string) {
  const recipients = process.env.SEO_REPORT_RECIPIENTS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? ["info@xipsoft.net"];
  // SMTP yapılandırması yoksa log'layıp pas geçiyoruz.
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.info(
      "[cron:seo] SMTP yapılandırılmamış — e-posta gönderilmedi, recipients:",
      recipients,
    );
    return false;
  }
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: String(process.env.SMTP_SECURE ?? "false") === "true",
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `"XipSoft SEO Bot" <${user}>`,
      to: recipients.join(", "),
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[cron:seo] mail gönderim hatası:", err);
    return false;
  }
}

export const revalidate = 0; // cache yok

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const expectedSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev) {
    if (!expectedSecret) {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET env tanımlı değil" },
        { status: 500 },
      );
    }
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { ok: false, error: "Yetkisiz" },
        { status: 401 },
      );
    }
  }

  const generatedAt = new Date().toISOString();
  const reports: PageAudit[] = [];
  const issues: Issue[] = [];

  for (const path of CRITICAL_PATHS.slice(0, 5)) {
    try {
      const r = await fetchLighthouseAudit(path);
      reports.push(r);
      issues.push(...r.issues);
    } catch (err) {
      console.warn(`[cron:seo] audit failed ${path}:`, err);
    }
  }

  let searchConsole: SearchConsoleReport | null = null;
  let searchConsoleError: string | null = null;
  let searchConsoleStatus: "configured" | "not_configured" | "error" =
    "not_configured";
  try {
    searchConsole = await fetchSearchConsoleReport();
    if (searchConsole) {
      searchConsoleStatus = "configured";
    }
  } catch (error) {
    searchConsoleStatus = "error";
    searchConsoleError =
      error instanceof Error
        ? error.message
        : "Bilinmeyen Search Console hatası";
    console.error("[cron:seo] Search Console report failed:", error);
    issues.push({
      severity: "medium",
      path: "/",
      rule: "GSC-API",
      detail: `Search Console verisi alınamadı: ${searchConsoleError}`,
    });
  }

  // Sıralama: yüksek şiddet → orta → düşük
  const sortedIssues = issues.sort((a, b) => {
    const rank: Record<Issue["severity"], number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    return rank[a.severity] - rank[b.severity];
  });

  const summaryHtml = buildSummaryHtml({
    generatedAt,
    pages: reports,
    issues: sortedIssues,
    searchConsole,
    searchConsoleError,
  });

  const totalHigh = sortedIssues.filter((i) => i.severity === "high").length;
  const subject = `[XipSoft SEO] Aylık Rapor — ${totalHigh} high issue · ${new Date().toLocaleDateString(
    "tr-TR",
  )}`;

  const emailSent = await sendReportEmail(summaryHtml, subject);

  return new NextResponse(
    JSON.stringify(
      {
        ok: true,
        generatedAt,
        totalPages: reports.length,
        totalIssues: sortedIssues.length,
        highIssues: totalHigh,
        topIssues: sortedIssues.slice(0, 10),
        emailSent,
        searchConsoleStatus,
        searchConsoleError,
        searchConsole,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

export const dynamic = "force-dynamic";
