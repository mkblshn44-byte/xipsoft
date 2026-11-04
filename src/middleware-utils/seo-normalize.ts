/**
 * SEO Normalizasyon Yardımcıları
 *
 * - Trailing slash tek biçime indirgemek (tek canonical URL, Madde 23)
 * - Kalıcı olarak silinen içerik için 410 Gone (Madde 26) — `isGonePath()`
 *   DB'den 60 sn TTL'li snapshot üretir; `DELETED_PATHS` yalnızca manuel ekleri taşır.
 */

import pool from "@/lib/db/pool";

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
 * Manuel olarak 410 Gone edilmesi bilinen yollar. DB'den türeyen liste
 * `isGonePath()` snapshot'ına eklenir; burası yalnızca elle tutulan istisnalar
 * (dışarıdan gelen, DB'de satırı olmayan eski adresler) içindir.
 *
 * ── Manuel ekleme örnekleri ──────────────────────────────────────────
 *   "/eski-urun",
 *   "/kampanya/blackfriday-2023",
 */
export const DELETED_PATHS: Array<string> = [
  // ← Manually-added paths above this line →
];

/**
 * All routes use extensionless canonical URLs. `.html` is accepted only as a
 * legacy request and redirected once before routing.
 */
import {
  EXTENSIONLESS_ROUTE_EXACT,
  EXTENSIONLESS_ROUTE_PREFIXES,
  isExtensionlessRoute,
} from "@/lib/content-path";

export { EXTENSIONLESS_ROUTE_EXACT, EXTENSIONLESS_ROUTE_PREFIXES };

/** Pathname sonundaki `.html` (ve tekrarlarını) söker. */
export function stripHtmlExtension(pathname: string): string {
  return pathname.replace(/(?:\.html)+$/i, "");
}

/**
 * All routes have extensionless canonical URLs.
 */
export function isExtensionlessCanonicalPath(pathname: string): boolean {
  return isExtensionlessRoute(pathname);
}

/**
 * Database ownership is no longer relevant to URL extension normalization.
 */
export async function shouldStripHtmlExtension(_pathnameWithoutExtension: string): Promise<boolean> {
  return true;
}

/**
 * DB'den silinmiş içerik yollarını çeken 410 snapshot'ı (Node runtime, edge DEGİL).
 *
 * YOL KAYNAĞI `full_path`, `slug` DEĞİL: ağaç satırının `slug`'ı tek segmenttir
 * (`web-yazilim`), sunulan yolu ise `hizmetler/web-yazilim`. Yanlış kolondan
 * üretilen bir 410 listesi canlı URL'leri keser.
 *
 * Aynı yolu canlı bir satır sahipleniyorsa (soft-delete sonrası full_path yeniden
 * kullanılmış olabilir) satır listeye girmez; restore edilen sayfa snapshot
 * süresi dolunca kendiliğinden tekrar sunulur.
 */
const GONE_SNAPSHOT_TTL_MS = 60_000;
const GONE_SNAPSHOT_LIMIT = 5_000;

let goneSnapshot: ReadonlySet<string> = new Set(DELETED_PATHS);
let goneSnapshotExpiresAt = 0;
let goneSnapshotRequest: Promise<ReadonlySet<string>> | null = null;

async function loadGonePaths(): Promise<ReadonlySet<string>> {
  const { rows } = await pool.query<{ path: string }>(
    `SELECT p.full_path AS path
       FROM pages p
      WHERE p.is_deleted = TRUE
        AND p.full_path IS NOT NULL AND p.full_path <> ''
        AND NOT EXISTS (
          SELECT 1 FROM pages live
           WHERE live.is_deleted = FALSE AND live.full_path = p.full_path)
     UNION ALL
     SELECT 'blog/' || b.slug AS path
       FROM Blog_posts b
      WHERE b.deleted_at IS NOT NULL
        AND b.slug IS NOT NULL AND b.slug <> ''
        AND NOT EXISTS (
          SELECT 1 FROM Blog_posts live
           WHERE live.slug = b.slug AND live.deleted_at IS NULL)
     LIMIT ${GONE_SNAPSHOT_LIMIT}`,
  );
  return new Set<string>([
    ...DELETED_PATHS,
    ...rows.map((row) => `/${String(row.path ?? "").replace(/^\/+/, "")}`),
  ]);
}

/** Yol kaldırılmış içerik mi? DB yoksa yalnızca manuel `DELETED_PATHS` geçerli. */
export async function isGonePath(pathname: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) return goneSnapshot.has(pathname);

  if (Date.now() >= goneSnapshotExpiresAt && !goneSnapshotRequest) {
    goneSnapshotRequest = loadGonePaths()
      .then((snapshot) => {
        goneSnapshot = snapshot;
        goneSnapshotExpiresAt = Date.now() + GONE_SNAPSHOT_TTL_MS;
        return snapshot;
      })
      .catch((error) => {
        // Fail-open: eski snapshot ile devam, sonraki istekte yeniden dene.
        console.warn("[seo-normalize] Gone path snapshot failed:", error);
        goneSnapshotExpiresAt = Date.now() + GONE_SNAPSHOT_TTL_MS;
        return goneSnapshot;
      })
      .finally(() => {
        goneSnapshotRequest = null;
      });
  }

  if (goneSnapshotRequest) await goneSnapshotRequest;
  return goneSnapshot.has(pathname);
}

/** Admin değişikliğinden sonra snapshot'ı bekletmeden tazelet. */
export function invalidateGonePathSnapshot(): void {
  goneSnapshotExpiresAt = 0;
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
body{min-height:100vh;display:grid;place-items:center;background:#050811;color:#cbd5e1;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px}
.card{max-width:520px;text-align:center}
.code{font-size:clamp(4rem,18vw,8rem);font-weight:900;background:linear-gradient(135deg,#ddd6fe,#a78bfa);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 24px rgba(167, 139, 250,.1))}
h1{font-size:1.5rem;margin:8px 0 12px;color:#ffffff}
p{color:#94a3b8;font-size:.95rem;line-height:1.6;margin-bottom:24px}
.path{display:inline-block;padding:4px 10px;border-radius:8px;background:rgba(167, 139, 250,.06);border:1px solid rgba(203, 213, 225, .08);color:#ddd6fe;font-family:ui-monospace,monospace;font-size:.8rem;margin-bottom:20px;word-break:break-all;max-width:100%}
.links{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;border-radius:12px;font-weight:600;font-size:.875rem;text-decoration:none;transition:all .2s}
.btn-primary{background:linear-gradient(135deg,#a78bfa,#8b5cf6);color:#050811;box-shadow:0 0 20px rgba(167, 139, 250,.12)}
.btn-primary:hover{transform:translateY(-1px)}
.btn-secondary{background:rgba(255,255,255,.04);border:1px solid rgba(203, 213, 225, .1);color:#cbd5e1}
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
    <a class="btn btn-secondary" href="/hizmetler">Hizmetler</a>
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
