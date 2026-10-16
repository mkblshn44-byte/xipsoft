/**
 * SEO Normalizasyon Yardımcıları
 *
 * - Trailing slash tek biçime indirgemek (tek canonical URL, Madde 23)
 * - Bilinen kalıcı olarak silinen içerikler için 410 Gone listesi (Madde 26)
 *
 * Build zamanı statik tutulduğu için middleware'in hızına etkisi sıfırdır.
 * `syncDeletedPathsFromDb()` ile DB'den güncel liste çekilebilir.
 */

import pool from "@/lib/database";

export const TRAILING_SLASH_POLICY: "remove" | "add" = "remove";

/**
 * Trailing slash normalizasyonu.
 * Politika `remove` ise:
 *   /hakkimizda/ → 301 /hakkimizda
 *   /           → /           (kök yol istisna)
 *   query string korunur
 */
export function normalizeTrailingSlash(pathname: string): string {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;

  if (TRAILING_SLASH_POLICY === "remove") {
    if (pathname.length > 1 && pathname.endsWith("/")) {
      return pathname.slice(0, -1);
    }
    return pathname;
  } else {
    if (!pathname.endsWith("/")) {
      return `${pathname}/`;
    }
    return pathname;
  }
}

/**
 * Varsayılan locale önekini URL'den söker (A seçeneği — Türkçe kök).
 *
 *   /tr            → /
 *   /tr/hakkimizda → /hakkimizda
 *   /hakkimizda    → /hakkimizda   (dokunulmaz)
 *   /tr-foo        → /tr-foo       (yalnızca tam segment eşleşir)
 */
export function stripLocalePrefix(pathname: string, locale: string): string {
  const prefix = `/${locale}`;
  if (pathname === prefix) return "/";
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  return pathname;
}

/**
 * Kalıcı olarak silinen (geriye dönüşsüz) URL'ler.
 * Middleware statik set üzerinden 410 Gone döner.
 * DB'den güncellemek için `syncDeletedPathsFromDb()` çalıştır.
 *
 * ── Manuel ekleme örnekleri ──────────────────────────────────────────
 *   "/eski-urun",
 *   "/kampanya/blackfriday-2023",
 */
export const DELETED_PATHS: Array<string> = [
  // ← Manually-added paths above this line →
];

export const DELETED_PATH_SET: ReadonlySet<string> = new Set(DELETED_PATHS);

/**
 * DB'den silinen slug'ları çeker ve döner (Node.js runtime, edge DEGIL).
 * Kullanım: Build öncesi script veya admin panelinden triggerlanır.
 * Döndüğü array'i DELETED_PATHS'e ekle veya ayrı dosyaya yaz.
 */
export async function syncDeletedPathsFromDb(): Promise<string[]> {
  const results: string[] = [];
  try {
    const pagesRes = await pool.query<{ slug: string }>(
      `SELECT slug FROM pages WHERE is_deleted = TRUE AND slug IS NOT NULL`
    );
    for (const r of pagesRes.rows) results.push(r.slug.startsWith("/") ? r.slug : `/${r.slug}`);

    const blogRes = await pool.query<{ slug: string }>(
      `SELECT slug FROM Blog_posts WHERE deleted_at IS NOT NULL AND slug IS NOT NULL`
    );
    for (const r of blogRes.rows) {
      const p = r.slug.startsWith("/") ? r.slug : `/blog/${r.slug}`;
      if (!results.includes(p)) results.push(p);
    }
  } catch (err) {
    console.warn("[seo-normalize] DB sync failed, continuing with static list:", err);
  }
  return Array.from(new Set([...DELETED_PATHS, ...results]));
}

/**
 * 410 Gone sayfası HTML şablonu — XipSoft markasına uygun,
 * yönlendirme linkleri içerir, X-Robots-Tag: noindex eklenir.
 */
export function buildGoneResponse(pathname: string): Response {
  const safePathname = pathname.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>410 — İçerik Kaldırıldı | XipSoft</title>
<meta name="robots" content="noindex, follow" />
<meta name="color-scheme" content="dark" />
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:grid;place-items:center;background:#050811;color:#e2e8f0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px}
.card{max-width:520px;text-align:center}
.code{font-size:clamp(4rem,18vw,8rem);font-weight:900;background:linear-gradient(135deg,#a78bfa,#ddd6fe);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 24px rgba(167,139,250,.3))}
h1{font-size:1.5rem;margin:8px 0 12px;color:#fff}
p{color:#94a3b8;font-size:.95rem;line-height:1.6;margin-bottom:24px}
.path{display:inline-block;padding:4px 10px;border-radius:8px;background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.2);color:#c4b5fd;font-family:ui-monospace,monospace;font-size:.8rem;margin-bottom:20px;word-break:break-all;max-width:100%}
.links{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;border-radius:12px;font-weight:600;font-size:.875rem;text-decoration:none;transition:all .2s}
.btn-primary{background:linear-gradient(135deg,#a78bfa,#ddd6fe);color:#09090b;box-shadow:0 0 20px rgba(167,139,250,.35)}
.btn-primary:hover{transform:translateY(-1px)}
.btn-secondary{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#cbd5e1}
.btn-secondary:hover{background:rgba(255,255,255,.08);color:#fff}
</style>
</head>
<body>
<div class="card">
  <div class="code">410</div>
  <h1>Bu İçerik Kalıcı Olarak Kaldırıldı</h1>
  <span class="path">${safePathname}</span>
  <p>Aradığınız sayfa artık sunulmuyor. Aşağıdaki bağlantılardan devam edebilir ya da ana sayfaya dönebilirsiniz.</p>
  <div class="links">
    <a class="btn btn-primary" href="/">← Ana Sayfaya Dön</a>
    <a class="btn btn-secondary" href="/blog">Blog</a>
    <a class="btn btn-secondary" href="/hizmetler/web-yazilim-tasarim">Hizmetler</a>
    <a class="btn btn-secondary" href="/contact-us">İletişim</a>
  </div>
</div>
</body>
</html>`;
  return new Response(html, {
    status: 410,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, follow",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
