/**
 * check-404s-exact.ts — URL'leri GERÇEK normalizeBlogSlug mantığıyla kontrol et
 * Uygulama ile birebir aynı normalizasyonu kullanır.
 */

import pool from "./src/lib/db/pool";

// Blog-slug.ts ile BİREBİR AYNI fonksiyon
function normalizeBlogSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  let decoded: string;
  try { decoded = decodeURIComponent(value.trim()); } catch { decoded = value.trim(); }
  const withoutPrefix = decoded.replace(/^\/+/, "").replace(/^blog\//i, "");
  const hasDateSuffix = /,\d{4}-\d{2}-\d{2}$/.test(withoutPrefix);
  const withoutDateSuffix = withoutPrefix.replace(/,\d{4}-\d{2}-\d{2}$/, "");
  const cleaned = hasDateSuffix
    ? withoutDateSuffix.replace(/-\d{10,}-\d{3,4}$/, "")
    : withoutDateSuffix.replace(/-\d{10,}-\d{3,4}$/, "").replace(/-\d+$/, "");
  return cleaned || null;
}

// GSC'den gelen ham URL'lerin blog kısmı (www. prefix'leri temizlendi)
const RAW_BLOG_URLS = [
  "https://xipsoft.net/blog/gaziantep-web-tasarim-mp4rx9m6,2026-10-24",
  "https://xipsoft.net/blog/adana-web-tasarim-mp4rx978,2026-10-24",
  "https://xipsoft.net/blog/istanbul-kartal-web-tasarim-hizmeti-xipsoft-profesyonel-cozu-mp4s5l9m,2026-10-24",
  "https://xipsoft.net/blog/grafana-ve-prometheus-ile-gozlemlenebilirlik-observability-1,2026-10-24",
  "https://xipsoft.net/blog/istanbul-maltepe-web-tasarim-hizmeti-xipsoft-profesyonel-coz-mp4s5ls1,2026-10-24",
  "https://xipsoft.net/blog/yazilim-inovasyonu-yazilim-isletme-inovasyonu-merkezinde-oturuyor-1,2026-10-24",
  "https://xipsoft.net/blog/istanbul-arnavutkoy-web-tasarim-hizmeti-xipsoft-profesyonel--mp4s5g5m,2026-10-23",
  "https://xipsoft.net/blog/heap-corruption-exploitleri-modern-allocator-bypass-teknikleri-1778080800525-9472,2026-10-23",
  "https://xipsoft.net/blog/istanbul-bahcelievler-web-tasarim-hizmeti-xipsoft-profesyone-mp4s5han,2026-10-23",
  "https://xipsoft.net/blog/nextjs-15-full-stack-uygulama-gelistirme,2026-10-23",
  "https://xipsoft.net/blog/rust-ile-webassembly-gelistirme-rehberi-mp4qrdxy,2026-10-23",
  "https://xipsoft.net/blog/google-adsense-ile-blog-gelirini-artirmanin-2026-yollari-mpda291u,2026-10-23",
  "https://xipsoft.net/blog/istanbul-bagcilar-web-tasarim-hizmeti-xipsoft-profesyonel-co-mp4s5gzy,2026-10-23",
  "https://xipsoft.net/blog/react-20-modern-frontend-gelistirme,2026-10-23",
  "https://xipsoft.net/blog/next-js-16-ile-gelen-yenilikler-mp4ollp7,2026-10-23",
  "https://xipsoft.net/blog/qubes-os-ve-guvenlik-mimarisi,2026-10-23",
  "https://xipsoft.net/blog/typescript-6-ile-tip-guvenliginde-yeni-donem-mp4qrdiq,2026-10-23",
  "https://xipsoft.net/blog/yapay-zeka-ile-kod-gelistirme-araclari-mp4qmup4,2026-10-23",
  "https://xipsoft.net/blog/circuit-breaker-pattern-microservices-resilience-ve-fault-tolerance,2026-10-23",
  "https://xipsoft.net/blog/istanbul-zeytinburnu-web-tasarim-hizmeti-xipsoft-profesyonel-mp4s5nqw,2026-10-23",
  "https://xipsoft.net/blog/veri-biliminde-python-buyuk-veri-analizi,2026-10-23",
  "https://xipsoft.net/blog/istanbul-gaziosmanpasa-web-tasarim-hizmeti-xipsoft-profesyon-mp4s5khk,2026-10-23",
  "https://xipsoft.net/blog/typescript-60-guclu-tip-guvencesi,2026-10-23",
  "https://xipsoft.net/blog/mobile-seo-mobile-cwv-ile-mobil-uyum,2026-10-23",
  "https://xipsoft.net/blog/format-string-exploitleri-bilgi-sizintisindan-code-executiona-1778080800835-5499,2026-10-22",
  "https://xipsoft.net/blog/domain-authority-artirma-dayi-yukseltmek-icin-etkili-taktikler-1778080801297-5806,2026-10-22",
  "https://xipsoft.net/blog/xipsoft-mobil-uygulama-gelistirme-yaklasimi,2026-10-21",
  "https://xipsoft.net/blog/gelismis-phishing-teknikleri-2026-ai-destekli-oltalama-saldirilari-1,2026-10-21",
  "https://xipsoft.net/blog/nextjs-15-full-stack-uygulama-gelistirme-2,2026-10-20",
  "https://xipsoft.net/blog/istanbul-bakirkoy-web-tasarim-hizmeti-xipsoft-profesyonel-co-mp4s5hlp,2026-10-20",
  "https://xipsoft.net/blog/next-js-server-side-rendering-seo-faydalari,2026-10-19",
  "https://xipsoft.net/blog/why-server-actions-matter-in-nextjs-14-mpgfaaul,2026-10-19",
  "https://xipsoft.net/blog/yapay-zeka-i-cerik-uretimi-ve-google-adsense-bilmeniz-gereke-mpd9rjyd,2026-10-19",
  "https://xipsoft.net/blog/istanbul-eyupsultan-web-tasarim-hizmeti-xipsoft-profesyonel--mp4s5jz8,2026-10-16",
  "https://xipsoft.net/blog/konya-web-tasarim-mp4rx9z0,2026-10-15",
  "https://xipsoft.net/blog/mersin-web-tasarim-mp4rxa7u,2026-10-13",
  "https://xipsoft.net/blog/istanbul-cekmekoy-web-tasarim-hizmeti-xipsoft-profesyonel-co-mp4s5jgq,2026-10-13",
  "https://xipsoft.net/blog/istanbul-sariyer-web-tasarim-hizmeti-xipsoft-profesyonel-coz-mp4s5ma9,2026-10-13",
  "https://xipsoft.net/blog/next-js-16-ile-gelen-yenilikler-mp4qmswn,2026-10-13",
  "https://xipsoft.net/blog/yapay-zeka-ile-kod-gelistirme-araclari-mp4orgb3,2026-10-13",
  "https://xipsoft.net/blog/guncel-teknoloji-haberleri-mayis-2026-mp4ollgq,2026-10-12",
  "https://xipsoft.net/blog/postgresql-veritabani-yonetimi-xipsoft-un-deneyiminden-cikarilan-dersler,2026-10-06",
  "https://xipsoft.net/blog/linux-privilege-escalation-suid-cron-job-ve-misconfiguration-exploitleri-1778080799594-8821,2026-10-05",
  "https://xipsoft.net/blog/guncel-teknoloji-haberleri-mayis-2026-mp4ord4b,2026-10-04",
  "https://xipsoft.net/blog/istanbul-beykoz-web-tasarim-hizmeti-xipsoft-profesyonel-cozu-mp4s5ifa,2026-10-04",
  "https://xipsoft.net/blog/nextjs-seo-rehberi,2026-10-03",
  "https://xipsoft.net/blog/xipsoft-forum-bot-kullanimi,2026-09-11",
  "https://xipsoft.net/blog/blog-12,2026-09-11",
  // Hizmetler (GSC'den gelen tam tarihli URL'ler)
  "https://xipsoft.net/hizmetler/bulut-devops,2026-09-10",
  "https://xipsoft.net/hizmetler/api-entegrasyon,2026-09-09",
  "https://xipsoft.net/hizmetler/yapay-zeka-ai-entegrasyonu,2026-10-19",
];

async function main() {
  console.log("=== BLOG URL KONTROLÜ (doğru normalizasyon) ===\n");

  const results: Array<{ rawUrl: string; normalizedSlug: string | null; dbSlug: string | null; status: string; deleted: boolean | null }> = [];

  for (const rawUrl of RAW_BLOG_URLS) {
    const urlPath = new URL(rawUrl.split(",")[0]).pathname;

    if (!urlPath.startsWith("/blog/")) {
      console.log(`SKIP (hizmet): ${rawUrl}`);
      continue;
    }

    // URL'in tam parçası: path + tarih suffix
    const fullSegment = rawUrl.split("/blog/")[1]; // "gaziantep-web-tasarim-mp4rx9m6,2026-10-24"
    const normalized = normalizeBlogSlug(fullSegment);

    if (!normalized) {
      results.push({ rawUrl, normalizedSlug: null, dbSlug: null, status: "NORMALIZE_FAIL", deleted: null });
      console.log(`  ⚠️  Normalize BAŞARISIZ: ${rawUrl}`);
      continue;
    }

    // DB'de ara: exact match VEYA slug LIKE normalized || '-%'
    const { rows } = await pool.query<{ slug: string; status: string; deleted_at: Date | null }>(
      `SELECT slug, status, deleted_at
       FROM blog_posts
       WHERE slug = $1 OR slug LIKE $1 || '-%'
       ORDER BY
         CASE WHEN slug = $1 THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT 3`,
      [normalized]
    );

    if (rows.length === 0) {
      results.push({ rawUrl, normalizedSlug: normalized, dbSlug: null, status: "NOT_FOUND", deleted: null });
      console.log(`  ❌ DB'DE YOK  normalized="${normalized}"`);
      console.log(`     RAW: ${rawUrl}`);
    } else {
      const published = rows.find(r => r.status === "published" && !r.deleted_at);
      const anyRow = rows[0];
      if (published) {
        results.push({ rawUrl, normalizedSlug: normalized, dbSlug: published.slug, status: "PUBLISHED", deleted: false });
        console.log(`  ✅ YAYINDA    slug="${published.slug}"`);
        // Slug farklıysa normalizasyonun doğru çalışıp çalışmadığını göster
        if (published.slug !== normalized) {
          console.log(`     ↳ normalize="${normalized}" ≠ dbslug="${published.slug}" → ${published.slug.startsWith(normalized) ? "LIKE eşleşti" : "FARKLI"}`);
        }
      } else {
        results.push({ rawUrl, normalizedSlug: normalized, dbSlug: anyRow.slug, status: anyRow.status, deleted: !!anyRow.deleted_at });
        console.log(`  🗑️  YAYINDA DEĞİL  slug="${anyRow.slug}" status=${anyRow.status} deleted=${!!anyRow.deleted_at}`);
      }
    }
  }

  // Özet
  const notFound = results.filter(r => r.status === "NOT_FOUND");
  const notPublished = results.filter(r => r.status !== "NOT_FOUND" && r.status !== "PUBLISHED" && r.status !== "NORMALIZE_FAIL");
  const published = results.filter(r => r.status === "PUBLISHED");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`ÖZET:`);
  console.log(`  ✅ Yayında (erişilebilir):       ${published.length}`);
  console.log(`  🗑️  DB'de var ama yayında değil: ${notPublished.length}`);
  console.log(`  ❌ DB'de hiç yok:                ${notFound.length}`);

  if (notFound.length > 0) {
    console.log(`\nDB'DE HİÇ OLMAYAN BLOG URL'LERİ (normalize sonrası slug → 410 adayı):`);
    for (const r of notFound) {
      console.log(`  "${r.normalizedSlug}"`);
      console.log(`    GSC URL: ${r.rawUrl}`);
    }
  }

  // Hizmet kontrolü
  console.log(`\n${"=".repeat(60)}`);
  console.log(`=== HİZMET SLUG KÖKLERİ KONTROLÜ ===\n`);

  const serviceSlugsToCheck = [
    "bulut-devops", "api-entegrasyon", "yapay-zeka-ai-entegrasyonu",
    "yapay-zeka-otomasyon",
  ];

  for (const slug of serviceSlugsToCheck) {
    const { rows } = await pool.query<{ slug: string; is_active: boolean; row_type: string }>(
      `SELECT slug, is_active, row_type FROM services WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    if (rows.length === 0) {
      console.log(`  ❌ YOK: /hizmetler/${slug}`);
    } else {
      console.log(`  ✅ /hizmetler/${slug} (is_active=${rows[0].is_active}, row_type=${rows[0].row_type})`);
    }
  }

  // pages tablosunda hizmet adları
  console.log(`\n=== PAGES TABLOSUNDA HİZMET SLUG'LARI (services JOIN) ===`);
  const { rows: distinctServices } = await pool.query<{ slug: string; count: string }>(
    `SELECT s.slug, COUNT(p.id)::text AS count
     FROM pages p
     JOIN services s ON s.id = p.service_id
     WHERE p.status = 'published' AND p.is_deleted = false
     GROUP BY s.slug
     ORDER BY s.slug`
  );
  for (const r of distinctServices) {
    console.log(`  ${r.slug}: ${r.count} sayfa`);
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

