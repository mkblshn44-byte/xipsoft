/**
 * audit-db-content.ts — SALT OKUNUR içerik/SEO denetimi.
 *
 * Amaç: "Başlık, meta, canonical, şema için gereken alanlar DB'de gerçekten
 * var mı, doluluk oranı ne?" sorusunu tek komutla ölçmek.
 *
 * Kullanım:
 *   node_modules\.bin\tsx.cmd --env-file=.env.production.local src/scripts/audit-db-content.ts
 *   (veya: npm run db:audit)
 *
 * Not: Gerçek bir DATABASE_URL gerekir. Yerelde yer tutucu ([SENSITIVE]) varsa
 * script bağlanamaz ve bunu açıkça bildirir.
 */
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { extractBlogFaqs, estimateReadingMinutes } from "@/lib/blog/content";

function env(key: string): string {
  for (const file of [".env.local", ".env.production.local", ".env"]) {
    try {
      const raw = readFileSync(file, "utf8");
      const m = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
      if (m) {
        const value = m[1].trim().replace(/^["']|["']$/g, "");
        if (value && !value.includes("[SENSITIVE]")) return value;
      }
    } catch {
      /* dosya yok — devam */
    }
  }
  return process.env[key] ?? "";
}

const connectionString = env("DATABASE_URL");
if (!connectionString || !/^postgres(ql)?:\/\//i.test(connectionString)) {
  console.error(
    "✖ Geçerli bir DATABASE_URL bulunamadı (yer tutucu/boş).\n" +
      "  Gerçek Neon bağlantı dizesini .env.production.local içine koyun veya\n" +
      "  `vercel env pull` ile çekip tekrar çalıştırın.",
  );
  process.exit(2);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool.query(sql, params);
  return r.rows as T[];
}

async function safe(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    const v = await fn();
    console.log(`✔ ${label}:`, typeof v === "object" ? JSON.stringify(v) : v);
  } catch (e) {
    console.log(`✖ ${label}: ${(e as Error).message.split("\n")[0]}`);
  }
}

const SEO_PAGES = [
  "services", "locations", "pages", "service_city_seo", "Blog_posts",
  "xip_dynamic_content", "users", "service_local_seo_templates", "redirects",
];

async function main() {
  console.log("== 1) TABLO VARLIĞI ==");
  const tables = await q<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
  );
  const names = new Set(tables.map((t) => t.table_name));
  for (const t of SEO_PAGES) console.log(`  ${names.has(t) ? "✔" : "✖"} ${t}`);

  console.log("\n== 2) SAYFALAR (pages) — SEO alan doluluğu ==");
  await safe("durum/üretim tipi dağılımı", () =>
    q(`SELECT status, source_type, count(*)::int AS n FROM pages
       WHERE is_deleted = FALSE GROUP BY 1,2 ORDER BY 3 DESC`),
  );
  await safe("YAYINLI sayfalarda BOŞ alan sayısı (0 olmalı)", () =>
    q(`SELECT count(*)::int AS published,
              count(*) FILTER (WHERE markdown_content IS NULL OR btrim(markdown_content)='') AS bos_icerik,
              count(*) FILTER (WHERE meta_title IS NULL OR btrim(meta_title)='') AS bos_meta_title,
              count(*) FILTER (WHERE meta_description IS NULL OR btrim(meta_description)='') AS bos_meta_desc,
              count(*) FILTER (WHERE canonical_url IS NULL OR btrim(canonical_url)='') AS bos_canonical,
              count(*) FILTER (WHERE lokal_sss IS NULL OR lokal_sss::text IN ('[]','null')) AS bos_lokal_sss
       FROM pages WHERE is_deleted = FALSE AND status='published'`),
  );

  console.log("\n== 3) service_city_seo — özgün yerel içerik ==");
  await safe("doluluk", () =>
    q(`SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status='published') AS published,
              count(*) FILTER (WHERE lokal_giris IS NOT NULL AND btrim(lokal_giris)<>'') AS dolu_giris,
              count(*) FILTER (WHERE length(btrim(coalesce(lokal_giris,''))) >= 200) AS yeterli_giris_200,
              count(*) FILTER (WHERE is_indexed) AS indexed,
              count(*) FILTER (WHERE canonical_url IS NULL OR btrim(canonical_url)='') AS bos_canonical
       FROM service_city_seo`),
  );

  console.log("\n== 4) HİZMETLER (services) — meta doluluğu ==");
  await safe("aktif hizmetler", () =>
    q(`SELECT count(*)::int AS aktif,
              count(*) FILTER (WHERE metadata IS NULL) AS metadata_yok,
              count(*) FILTER (WHERE metadata->>'title' IS NULL) AS metadata_title_yok,
              count(*) FILTER (WHERE metadata->>'description' IS NULL) AS metadata_desc_yok
       FROM services WHERE is_active = TRUE`),
  );

  console.log("\n== 5) KURUMSAL/STATİK SAYFA META (xip_dynamic_content) ==");
  await safe("page_meta kategorileri (sayfa başına 1 olmalı)", () =>
    q(`SELECT category, count(*)::int AS n FROM xip_dynamic_content
       WHERE content_type='page_meta' AND is_active AND deleted_at IS NULL
       GROUP BY 1 ORDER BY 1`),
  );
  await safe("page_meta BOŞ description olanlar", () =>
    q(`SELECT category FROM xip_dynamic_content
       WHERE content_type='page_meta' AND is_active AND deleted_at IS NULL
         AND (metadata->>'description' IS NULL OR btrim(metadata->>'description')='')
       ORDER BY 1`),
  );
  await safe("page_faq kategorileri", () =>
    q(`SELECT category, count(*)::int AS n FROM xip_dynamic_content
       WHERE content_type='page_faq' AND is_active AND deleted_at IS NULL
       GROUP BY 1 ORDER BY 1`),
  );

  console.log("\n== 6) BLOG — meta/OG/şema için gereken alanlar ==");
  await safe("durum dağılımı", () =>
    q(`SELECT status, count(*)::int AS n FROM Blog_posts WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC`),
  );
  await safe("YAYINLI bloglarda BOŞ alanlar", () =>
    q(`SELECT count(*)::int AS published,
              count(*) FILTER (WHERE description IS NULL OR btrim(description)='') AS bos_description,
              count(*) FILTER (WHERE cover_image_url IS NULL OR btrim(cover_image_url)='') AS kapak_yok,
              count(*) FILTER (WHERE cover_image_alt IS NULL OR btrim(cover_image_alt)='') AS kapak_alt_yok,
              count(*) FILTER (WHERE tags IS NULL OR cardinality(tags)=0) AS etiket_yok,
              count(*) FILTER (WHERE content IS NULL) AS icerik_yok,
              count(*) FILTER (WHERE author_id IS NULL) AS yazar_yok
       FROM Blog_posts WHERE status='published' AND deleted_at IS NULL`),
  );
  await safe("yazar profil alanları (E-E-A-T sameAs için)", () =>
    q(`SELECT count(*)::int AS toplam_yazar,
              count(*) FILTER (WHERE nick IS NULL OR btrim(nick)='') AS nick_yok,
              count(*) FILTER (WHERE linkedin_url IS NULL AND github_url IS NULL AND twitter_url IS NULL) AS sosyal_yok,
              count(*) FILTER (WHERE expertise_area IS NULL) AS uzmanlik_yok
       FROM users`),
  );

  // 7) FAQPage + okuma süresi: içerikten türetiliyor — gerçek içerikle ölç.
  console.log("\n== 7) BLOG içerik analizi (FAQPage + okuma süresi) ==");
  await safe("yazı bazlı ölçüm", async () => {
    const rows = await q<{ slug: string; content: unknown }>(
      `SELECT slug, content FROM Blog_posts
       WHERE status='published' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 3000`,
    );
    let withFaq = 0;
    let over7min = 0;
    let emptyContent = 0;
    const noFaqSamples: string[] = [];
    for (const r of rows) {
      if (!r.content) { emptyContent += 1; continue; }
      const faqs = extractBlogFaqs(r.content);
      if (faqs.length > 0) withFaq += 1;
      else if (noFaqSamples.length < 5) noFaqSamples.push(r.slug);
      if (estimateReadingMinutes(r.content) >= 7) over7min += 1;
    }
    const pct = rows.length ? Math.round((withFaq / rows.length) * 100) : 0;
    return {
      incelenen: rows.length,
      faq_bulunan: withFaq,
      faq_yuzde: `${pct}%`,
      faq_yok_ornek: noFaqSamples,
      uzun_yazi_7dk_ustu: over7min,
      icerik_bos: emptyContent,
    };
  });

  await pool.end();
  console.log("\nDenetim tamamlandı.");
}

main().catch((e) => {
  console.error("✖ Denetim başarısız:", e instanceof Error ? e.message : e);
  process.exit(1);
});
