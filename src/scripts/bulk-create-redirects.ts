#!/usr/bin/env tsx
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GSC 404 HATALARI İÇİN TOPLU 301 YÖNLENDİRME SCRIPT'i
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * AMAÇ: Google Search Console'da "Bulunamadı (404)" raporlayan eski/kırık URL'leri
 * mevcut çalışan sayfalara 301 kalıcı yönlendirme ile bağlamak.
 *
 * KULLANIM:
 *   npx tsx --env-file=.env.local src/scripts/bulk-create-redirects.ts --dry-run
 *   npx tsx --env-file=.env.local src/scripts/bulk-create-redirects.ts
 *
 * Veri Kaynağı: GSC'den export edilen 404 URL listesi (CSV/JSON) veya
 * sitemap ile karşılaştırarak tespit edilen kırık linkler.
 */

import { Pool } from "pg";
import { upsertRedirect } from "@/lib/redirect-handler";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 10000,
});

// ═══════════════════════════════════════════════════════════════════════════════
// YÖNLENDİRME EŞLEŞTİRME KURALLARI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GSC 404 raporundan gelen yaygın kırık URL kalıpları ve hedefleri.
 * Gerçek veriyle genişletilebilir.
 */
interface RedirectRule {
  sourcePattern: RegExp;
  targetBuilder: (match: RegExpMatchArray) => string;
  description: string;
}

const REDIRECT_RULES: RedirectRule[] = [
  // 1. Eski blog query parametreli URL'ler → temiz path
  {
    sourcePattern: /^\/?blog\/?\?slug=([^&]+)/i,
    targetBuilder: (m) => `/blog/${m[1].replace(/^\/+/, '').replace(/^blog\//i, '')}`,
    description: "Eski blog query URL → temiz blog path",
  },
  {
    sourcePattern: /^\/?blog\/post\?slug=([^&]+)/i,
    targetBuilder: (m) => `/blog/${m[1].replace(/^\/+/, '').replace(/^blog\//i, '')}`,
    description: "Eski blog/post query → temiz blog path",
  },

  // 2. Eski WordPress forum kalıpları → blog (forum bölümü kaldırıldı)
  {
    sourcePattern: /^\/?forum\/viewtopic\.php/i,
    targetBuilder: () => `/blog`,
    description: "Eski forum viewtopic → blog",
  },
  {
    sourcePattern: /^\/?forum\/viewforum\.php/i,
    targetBuilder: () => `/blog`,
    description: "Eski forum viewforum → blog",
  },

  // 3. Eski .html uzantılı URL'ler
  {
    sourcePattern: /^\/?(.+)\.html$/i,
    targetBuilder: (m) => `/${m[1]}`,
    description: ".html uzantılı URL → uzantısız",
  },

  // 4. Çift slash ve trailing slash normalizasyonu
  {
    sourcePattern: /^\/{2,}(.+)$/,
    targetBuilder: (m) => `/${m[1]}`,
    description: "Başlangıçta çift slash",
  },
  {
    sourcePattern: /^(.+)\/{2,}$/,
    targetBuilder: (m) => `/${m[1]}`,
    description: "Sonda çift slash",
  },

  // 5. Eski hizmet slug alias'ları
  {
    sourcePattern: /^\/hizmetler\/yapay-zeka-otomasyon\/(.+)$/i,
    targetBuilder: (m) => `/hizmetler/yapay-zeka-ml/${m[1]}`,
    description: "Eski yapay-zeka-otomasyon slug",
  },
  {
    sourcePattern: /^\/hizmetler\/yapay-zeka\/(.+)$/i,
    targetBuilder: (m) => `/hizmetler/yapay-zeka-ml/${m[1]}`,
    description: "Eski yapay-zeka slug",
  },
  {
    sourcePattern: /^\/hizmetler\/web-yazilim\/(.+)$/i,
    targetBuilder: (m) => `/hizmetler/web-yazilim-tasarim/${m[1]}`,
    description: "Eski web-yazilim slug",
  },
  {
    sourcePattern: /^\/hizmetler\/mobil-uygulama-gelistirme\/(.+)$/i,
    targetBuilder: (m) => `/hizmetler/mobil-uygulama/${m[1]}`,
    description: "Eski mobil-uygulama-gelistirme slug",
  },
  {
    sourcePattern: /^\/hizmetler\/siber-guvenlik-hizmetleri\/(.+)$/i,
    targetBuilder: (m) => `/hizmetler/siber-guvenlik/${m[1]}`,
    description: "Eski siber-guvenlik-hizmetleri slug",
  },
  {
    sourcePattern: /^\/hizmetler\/seo-dijital-pazarlama-hizmetleri\/(.+)$/i,
    targetBuilder: (m) => `/hizmetler/seo-dijital-pazarlama/${m[1]}`,
    description: "Eski seo-dijital-pazarlama-hizmetleri slug",
  },

  // 6. Eski il/ilçe kısa segmentleri → bileşik segment
  {
    sourcePattern: /^\/hizmetler\/([^\/]+)\/([a-z]+)$/i,
    targetBuilder: (m) => {
      const service = m[1];
      const short = m[2];
      // Bilinen kısa segmentler için bileşik slug tahmini
      const knownShorts: Record<string, string> = {
        'kadikoy': 'istanbul-kadikoy',
        'besiktas': 'istanbul-besiktas',
        'sisli': 'istanbul-sisli',
        'uskudar': 'istanbul-uskudar',
        'atasehir': 'istanbul-atasehir',
        'beylikduzu': 'istanbul-beylikduzu',
        'bakirkoy': 'istanbul-bakirkoy',
        'sariyer': 'istanbul-sariyer',
        'maltepe': 'istanbul-maltepe',
        'kartal': 'istanbul-kartal',
        'pendik': 'istanbul-pendik',
        'umraniye': 'istanbul-umraniye',
        'cekmekoy': 'istanbul-cekmekoy',
        'cankaya': 'ankara-cankaya',
        'yenimahalle': 'ankara-yenimahalle',
        'etimesgut': 'ankara-etimesgut',
        'golbasi': 'ankara-golbasi',
        'kecioren': 'ankara-kecioren',
        'konak': 'izmir-konak',
        'bornova': 'izmir-bornova',
        'bayrakli': 'izmir-bayrakli',
        'karsiyaka': 'izmir-karsiyaka',
        'nilufer': 'bursa-nilufer',
        'osmangazi': 'bursa-osmangazi',
        'muratpasa': 'antalya-muratpasa',
        'konyaalti': 'antalya-konyaalti',
        'gebze': 'kocaeli-gebze',
        'izmit': 'kocaeli-izmit',
      };
      const full = knownShorts[short.toLowerCase()];
      return full ? `/hizmetler/${service}/${full}` : `/hizmetler/${service}/${short}`;
    },
    description: "Kısa ilçe segmenti → bileşik segment",
  },

  // 7. Eski "istanbul-yazilim-sirketi" ve benzeri tek sayfalar
  {
    sourcePattern: /^\/istanbul-yazilim-sirketi\/?$/i,
    targetBuilder: () => `/istanbul-yazilim-sirketi`,
    description: "İstanbul yazılım şirketi sayfası (zaten mevcut)",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MANUEL GSC 404 URL LİSTESİ (CSV export'tan kopyalanabilir)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GSC'den "Bulunamadı (404)" raporunu CSV export edip buraya yapıştırın.
 * Format: ["url1", "url2", ...]
 * Boş bırakılırsa sadece REDIRECT_RULES ile otomatik eşleştirme yapılır.
 */
const MANUAL_GSC_404_URLS: string[] = [
  // Örnekler - GSC CSV'den kopyalayın:
  // "/hizmetler/web-yazilim/kadikoy",
  // "/blog?slug=eski-yazi",
  // "/forum/viewtopic.php?t=123",
];

// ═══════════════════════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ══════════════════════════════════════════════════════════════════════════════

function normalizePath(path: string): string {
  let p = path.trim();
  if (!p.startsWith('/')) p = `/${p}`;
  // Query string ve fragment'ı ayır
  const url = new URL(p, 'http://localhost');
  return url.pathname.replace(/\/+$/, '') || '/';
}

function findRedirectTarget(sourcePath: string): string | null {
  const normalized = normalizePath(sourcePath);

  // Önce manuel kuralları dene
  for (const rule of REDIRECT_RULES) {
    const match = normalized.match(rule.sourcePattern);
    if (match) {
      try {
        return rule.targetBuilder(match);
      } catch {
        continue;
      }
    }
  }

  return null;
}

async function checkTargetExists(targetPath: string): Promise<boolean> {
  // Hedef URL'nin mevcut bir sayfaya karşılık gelip gelmediğini kontrol et
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM pages WHERE slug = $1 AND is_deleted = FALSE AND status = 'published' LIMIT 1`,
      [targetPath.replace(/^\//, '')],
    );
    if (rows.length > 0) return true;

    const { rows: blogRows } = await pool.query(
      `SELECT 1 FROM Blog_posts WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL LIMIT 1`,
      [targetPath.replace(/^\/blog\//, '')],
    );
    if (blogRows.length > 0) return true;

    // Service sayfaları
    const { rows: svcRows } = await pool.query(
      `SELECT 1 FROM services WHERE slug = $1 AND is_active = TRUE LIMIT 1`,
      [targetPath.replace(/^\/hizmetler\//, '')],
    );
    if (svcRows.length > 0) return true;

    // Service city pages
    const { rows: cityRows } = await pool.query(
      `SELECT 1 FROM service_city_seo WHERE service_slug || '/' || city_slug = $1 AND is_published = TRUE LIMIT 1`,
      [targetPath.replace(/^\/hizmetler\//, '')],
    );
    if (cityRows.length > 0) return true;

    // Static routes that exist
    const staticRoutes = [
      '/', '/hizmetler', '/blog',
      '/hakkimizda', '/contact-us', '/references',
      '/istanbul-yazilim-sirketi', '/privacy-policy',
      '/terms-of-service', '/cookie-policy',
    ];
    if (staticRoutes.includes(targetPath)) return true;

  } catch (err) {
    console.warn(`[CheckTarget] DB error for ${targetPath}:`, err);
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANA İŞLEM
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`\n🔄 GSC 404 → 301 Yönlendirme Oluşturucu ${dryRun ? '(DRY-RUN)' : ''}\n`);

  // 1. URL kaynaklarını topla
  const sourceUrls = new Set<string>();

  // a) Manuel liste
  for (const url of MANUAL_GSC_404_URLS) {
    sourceUrls.add(normalizePath(url));
  }

  // b) DB'den silinmiş (soft-delete) sayfalar
  try {
    const pagesRes = await pool.query<{ slug: string }>(
      `SELECT slug FROM pages WHERE is_deleted = TRUE AND slug IS NOT NULL`
    );
    for (const r of pagesRes.rows) {
      sourceUrls.add(normalizePath(r.slug));
    }

    const blogRes = await pool.query<{ slug: string }>(
      `SELECT slug FROM Blog_posts WHERE deleted_at IS NOT NULL AND slug IS NOT NULL`
    );
    for (const r of blogRes.rows) {
      sourceUrls.add(normalizePath(`/blog/${r.slug}`));
    }
  } catch (err) {
    console.warn('[DB] Silinmiş URL çekme hatası:', err);
  }

  console.log(`📋 Toplam kaynak URL: ${sourceUrls.size}\n`);

  // 2. Her URL için hedef bul ve yönlendirme oluştur
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const results: Array<{ source: string; target: string; status: 'created' | 'skipped' | 'failed' | 'no-target'; rule?: string }> = [];

  for (const sourceUrl of Array.from(sourceUrls).sort()) {
    // Kural ile hedef bul
    let targetUrl: string | null = null;
    let matchedRule = '';

    for (const rule of REDIRECT_RULES) {
      const match = sourceUrl.match(rule.sourcePattern);
      if (match) {
        try {
          targetUrl = rule.targetBuilder(match);
          matchedRule = rule.description;
          break;
        } catch {
          continue;
        }
      }
    }

    // Manuel listede varsa ve kural eşleşmediyse, ana sayfaya yönlendir (fallback)
    if (!targetUrl && MANUAL_GSC_404_URLS.includes(sourceUrl)) {
      targetUrl = '/';
      matchedRule = 'Manuel liste fallback → ana sayfa';
    }

    if (!targetUrl) {
      results.push({ source: sourceUrl, target: '', status: 'no-target', rule: 'Eşleşen kural yok' });
      skipped++;
      continue;
    }

    // Hedefin varlığını kontrol et
    const targetExists = await checkTargetExists(targetUrl);
    if (!targetExists) {
      console.warn(`⚠️  Hedef mevcut değil, atlanıyor: ${sourceUrl} → ${targetUrl}`);
      results.push({ source: sourceUrl, target: targetUrl, status: 'skipped', rule: matchedRule + ' (hedef yok)' });
      skipped++;
      continue;
    }

    // Aynı URL'e yönlendirme döngüsü önle
    if (normalizePath(sourceUrl) === normalizePath(targetUrl)) {
      results.push({ source: sourceUrl, target: targetUrl, status: 'skipped', rule: 'Kaynak=Hedef' });
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`✅ [DRY-RUN] ${sourceUrl} → ${targetUrl} (${matchedRule})`);
      results.push({ source: sourceUrl, target: targetUrl, status: 'created', rule: matchedRule });
      created++;
      continue;
    }

    // Gerçek yönlendirmeyi oluştur
    try {
      await upsertRedirect(pool, {
        sourcePath: normalizePath(sourceUrl),
        targetPath: normalizePath(targetUrl),
        statusCode: 301,
        isActive: true,
      });
      console.log(`✅ ${sourceUrl} → ${targetUrl} (${matchedRule})`);
      results.push({ source: sourceUrl, target: targetUrl, status: 'created', rule: matchedRule });
      created++;
    } catch (err) {
      console.error(`❌ ${sourceUrl} → ${targetUrl}:`, err);
      results.push({ source: sourceUrl, target: targetUrl, status: 'failed', rule: matchedRule });
      failed++;
    }
  }

  // 3. Özet rapor
  console.log(`\n📊 ÖZET:`);
  console.log(`   Oluşturulan: ${created}`);
  console.log(`   Atlanan:     ${skipped}`);
  console.log(`   Hatalı:      ${failed}`);
  console.log(`   Toplam:      ${sourceUrls.size}\n`);

  if (!dryRun && created > 0) {
    console.log('🔄 Redirect cache temizleniyor...');
    // Cache temizleme (redirect-handler zaten upsertRedirect içinde yapıyor)
  }

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ Script hatası:', err);
  process.exit(1);
});