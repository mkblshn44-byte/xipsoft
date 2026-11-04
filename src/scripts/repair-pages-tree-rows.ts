/**
 * repair-pages-tree-rows.ts — `pages` satırlarındaki iki veri hatasını onarır.
 *
 * HATA 1 — `kind='service'` satırlarının `markdown_content`'i BOŞ (11/11).
 * Hizmet sayfasının asıl metni `services` tablosundan şablonla gelir; bu doğru.
 * Ama `ServiceContentPage.renderFallbackOrNotFound()` zincir çözümlenemediğinde
 * doğrudan ağaç düğümünü basar (`renderContentTree`) ve `PageView` boş içerikte
 * "Bu sayfanın içeriği henüz girilmemiş." yazdırıyor — YAYIN ve İNDEKLENEBİLİR
 * bir URL'de, yani soft-404. Onarım: `services.subtitle` + `meta_description`
 * ile kısa bir düşüş metni. Tek kaynak yine `services`; bu kolon yalnızca o
 * düşüş yolunu doldurur.
 *
 * HATA 2 — 4 kurumsal çerçevenin (`hakkimizda`, `contact-us`, `references`,
 * `istanbul-yazilim-sirketi`) satırları bozuk doldurulmuş:
 *   · markdown, `page_meta.sections` jsonb'sının ANAHTARLARINI başlık yapmış
 *     (`## values`, `#### subtitle`, `### subtitle Mid` → tek başına virgül);
 *   · `schema_markup` yalnızca `{name, description}` taşıyor — `@context`/`@type`
 *     yok, `toSchemaMarkup` süzdüğü için sayfada hiç şema kalmaz (kod rotası
 *     AboutPage + BreadcrumbList basıyordu);
 *   · `content_i18n` içinde `tr` anahtarı var, ama temel dil her zaman kolonlarda
 *     ve `localizeNode` haritadan TR okumaz → ölü veri;
 *   · `istanbul-yazilim-sirketi` markdown'ı `# ` ile başlıyor → `PageView` H1'i
 *     `title`'dan basar, ikinci H1 kopya; beş dilin örtüşmesi de TR metnin
 *     kopyası (sayfanın hiçbir dilde yerelleşmiş metni yok).
 * Bu dört sayfanın gövdesi BİLEŞEN tabanlı (iletişim formu, AboutPageClient,
 * referans galerisi) — markdown satırı onları karşılamaz; doğru iş blok/bölüm
 * şablonudur. O yapılana kadar satırlar yayından çekilir ve bozuk alanlar
 * temizlenir. Kod rotaları durduğu için canlı çıktı değişmez; çatı sorgusu ve
 * ağaç çözümü bu döküm metinlerini görmeyi bırakır.
 *
 * Kullanım:
 *   npm run db:repair-tree-rows            (rapor + plan, yazmaz)
 *   npm run db:repair-tree-rows -- --apply
 *
 * HATA 3 — yerelleşmiş satırlarda TR kopyası `h1_title`: `PageView` H1'i
 * `h1Title ?? title`'dan basar, örtüşme `h1Title` taşımıyordu → beş dilin H1'i
 * TR kalıyordu. `seo-parity` ölçtü: 36 hedefin 15'i bu tek alandan sapıyordu.
 */
import pool from "@/lib/db/pool";
import { hashPageContent } from "@/lib/pages/hash";
import { invalidatePageCaches } from "@/lib/redis/page-cache";

const applyChanges = process.argv.includes("--apply");

/** Gövdesi bileşenden gelen, dolayısıyla markdown satırı OLAMAYAZ çerçeveler. */
const COMPONENT_DRIVEN_FRAMES = ["hakkimizda", "contact-us", "references", "istanbul-yazilim-sirketi"];

/** Rotası silinmiş, metni düz prose olan politikalar — bunlara dokunulmaz. */
const PUBLISHED_POLICY_PATHS = ["privacy-policy", "terms-of-service", "cookie-policy"];

interface Counts {
  emptyService: number;
  framePublished: number;
  deadTrKeys: number;
  policyPublished: number;
  h1Shadow: number;
}

async function counts(): Promise<Counts> {
  const { rows } = await pool.query<Counts>(
    `SELECT
       (SELECT count(*) FROM pages
         WHERE kind='service' AND is_deleted=FALSE AND status='published'
           AND coalesce(markdown_content,'')='')::int AS "emptyService",
       (SELECT count(*) FROM pages
         WHERE is_deleted=FALSE AND status='published' AND full_path = ANY($1))::int AS "framePublished",
       (SELECT count(*) FROM pages
         WHERE is_deleted=FALSE AND content_i18n ? 'tr')::int AS "deadTrKeys",
       (SELECT count(*) FROM pages
         WHERE is_deleted=FALSE AND status='published' AND full_path = ANY($2))::int AS "policyPublished",
       (SELECT count(*) FROM pages
         WHERE is_deleted=FALSE AND content_i18n IS NOT NULL
           AND h1_title IS NOT NULL AND h1_title = title)::int AS "h1Shadow"`,
    [COMPONENT_DRIVEN_FRAMES, PUBLISHED_POLICY_PATHS],
  );
  return rows[0];
}

interface ServiceCopy {
  full_path: string;
  title: string;
  subtitle: string | null;
  meta_description: string | null;
}

async function serviceCopies(): Promise<ServiceCopy[]> {
  const { rows } = await pool.query<ServiceCopy>(
    `SELECT 'hizmetler/' || s.slug AS full_path, s.title, s.subtitle, s.meta_description
       FROM services s
      WHERE s.row_type = 'main'
        AND s.is_active = TRUE
        AND COALESCE(s.is_deleted, FALSE) = FALSE
      ORDER BY s.slug`,
  );
  return rows;
}

/** Şablonun kullandığı alanlardan düşüş paragrafı — tekrar eden metin eklenmez. */
function fallbackMarkdown(copy: ServiceCopy): string {
  const lead = (copy.subtitle ?? "").trim() || (copy.meta_description ?? "").trim() || copy.title.trim();
  const extra = (copy.meta_description ?? "").trim();
  const body = extra && extra !== lead && !lead.includes(extra) ? `${lead}\n\n${extra}` : lead;
  if (!body) return "";
  return `## ${copy.title.trim()}\n\n${body}\n`;
}

const FRAME_REPAIR_SQL = `
  UPDATE pages
     SET status = 'draft',
         is_indexable = FALSE,
         markdown_content = NULL,
         rendered_html = NULL,
         content_i18n = NULL,
         schema_markup = NULL,
         content_hash = NULL,
         updated_at = NOW()
   WHERE is_deleted = FALSE
     AND full_path = ANY($1)`;

/** Ölü `tr` örtüşmesi: temel dil kolonlarda taşınır, haritada anahtarı olmaz. */
const DROP_BASE_LOCALE_KEY_SQL = `
  UPDATE pages
     SET content_i18n = content_i18n - 'tr',
         updated_at = NOW()
   WHERE is_deleted = FALSE
     AND content_i18n ? 'tr'`;

/**
 * HATA 3 — `h1_title` yalnızca TR kolonudur ve `PageView` H1'i `h1Title ?? title`
 * üzerinden basar. Politika satırlarında `h1_title = title` doluydu, örtüşmede
 * `h1Title` yoktu → beş dilin H1'i TR kalıyordu (ölçüldü: seo-parity 15/36 sapma).
 * `title` ile birebir aynı olan değer NULL'lanınca H1 yerelleşmiş `title`'dan gelir.
 */
const CLEAR_DUPLICATE_H1_SQL = `
  UPDATE pages
     SET h1_title = NULL,
         updated_at = NOW()
   WHERE is_deleted = FALSE
     AND content_i18n IS NOT NULL
     AND h1_title IS NOT NULL
     AND h1_title = title`;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL yok — `--env-file=.env.local` ile çalıştırın.");
    process.exitCode = 1;
    return;
  }

  const before = await counts();
  console.log("=== ÖNCE ===");
  console.log(`  yayın + boş markdown'lı service satırı : ${before.emptyService}`);
  console.log(`  yayında olan bileşen çerçevesi         : ${before.framePublished}`);
  console.log(`  content_i18n'de ölü 'tr' anahtarı       : ${before.deadTrKeys}`);
  console.log(`  yerelleşmiş satırda TR kopyası h1_title  : ${before.h1Shadow}`);
  console.log(`  yayında olan politika satırı            : ${before.policyPublished} (korunur)`);

  const copies = await serviceCopies();
  const writes: Array<{ full_path: string; markdown: string; hash: string }> = [];
  for (const copy of copies) {
    const markdown = fallbackMarkdown(copy);
    if (!markdown) continue;
    writes.push({ full_path: copy.full_path, markdown, hash: hashPageContent(markdown) });
  }

  console.log(`\n=== HİZMET DÜŞÜŞ METNİ (${writes.length} satır) ===`);
  for (const w of writes.slice(0, 3)) {
    console.log(`  ${w.full_path}\n     ${JSON.stringify(w.markdown.slice(0, 160))}`);
  }
  console.log(`  … (${writes.length} satır)`);

  const { rows: hashAudit } = await pool.query<{ full_path: string; markdown_content: string; content_hash: string | null }>(
    `SELECT full_path, coalesce(markdown_content,'') AS markdown_content, content_hash
       FROM pages
      WHERE is_deleted = FALSE AND status = 'published' AND kind = 'page'`,
  );
  const brokenHashes = hashAudit
    .filter((row) => row.content_hash !== hashPageContent(row.markdown_content))
    // Çerçevelerin metni bu çalıştırmada NULL'lanıyor; onlara boş içerik hash'i
    // yazmak `page-audit`'in dublikat taramasını yanıltır → hash de NULL kalır.
    .filter((row) => !COMPONENT_DRIVEN_FRAMES.some((f) => row.full_path.endsWith(f)))
    .map((row) => row.full_path);
  console.log(`\npublish'lı sayfa satırlarında content_hash uyumsuzluğu: ${brokenHashes.join(", ") || "yok"}`);

  if (!applyChanges) {
    console.log("\n[dry-run] Yazma olmadı. Uygulamak için: --apply");
    return;
  }

  const client = await pool.connect();
  let serviceWritten = 0;
  try {
    await client.query("BEGIN");

    for (const w of writes) {
      const res = await client.query(
        `UPDATE pages
            SET markdown_content = $2, content_hash = $3, updated_at = NOW()
          WHERE kind = 'service' AND is_deleted = FALSE AND full_path = $1
            AND coalesce(markdown_content, '') = ''`,
        [w.full_path, w.markdown, w.hash],
      );
      serviceWritten += res.rowCount ?? 0;
    }

    const frames = await client.query(FRAME_REPAIR_SQL, [COMPONENT_DRIVEN_FRAMES]);
    const trKeys = await client.query(DROP_BASE_LOCALE_KEY_SQL);
    const h1Shadow = await client.query(CLEAR_DUPLICATE_H1_SQL);

    for (const fullPath of brokenHashes) {
      const { rows } = await client.query<{ markdown_content: string }>(
        `SELECT coalesce(markdown_content,'') AS markdown_content FROM pages WHERE full_path = $1`,
        [fullPath],
      );
      await client.query(`UPDATE pages SET content_hash = $2 WHERE full_path = $1`, [
        fullPath,
        hashPageContent(rows[0]?.markdown_content ?? ""),
      ]);
    }

    await client.query("COMMIT");
    console.log(
      `\nyazıldı → service düşüş metni: ${serviceWritten}, ` +
        `çerçeve yayından çekildi: ${frames.rowCount}, ` +
        `ölü 'tr' anahtarı silindi: ${trKeys.rowCount}, ` +
        `TR kopyası h1_title NULL'landı: ${h1Shadow.rowCount}, ` +
        `hash yeniden hesaplandı: ${brokenHashes.length}`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // Doğrudan SQL yazımı iki önbellek katmanının (L1 Map + Redis) yanından geçer.
  // Ağaç anahtarı `full_path` ile tutulur; hizmet zinciri çıplak slug'ı da kullandığı
  // için ikisi birden verilir. Next'in kendi `content-tree` tag'i bu süreçten
  // temizlenemez (ayrı process) — en geç 300 sn'lik revalidate süresinde düşer.
  await invalidatePageCaches({
    slugs: [
      ...writes.flatMap((w) => [w.full_path, w.full_path.split("/").pop()]),
      ...COMPONENT_DRIVEN_FRAMES,
      ...PUBLISHED_POLICY_PATHS,
    ],
    sitemap: true,
  });

  const after = await counts();
  console.log("\n=== SONRA ===");
  console.log(`  yayın + boş markdown'lı service satırı : ${after.emptyService}`);
  console.log(`  yayında olan bileşen çerçevesi         : ${after.framePublished}`);
  console.log(`  content_i18n'de ölü 'tr' anahtarı       : ${after.deadTrKeys}`);
  console.log(`  yerelleşmiş satırda TR kopyası h1_title  : ${after.h1Shadow}`);
  console.log(`  yayında olan politika satırı            : ${after.policyPublished}`);
}

void main()
  .catch((error: unknown) => {
    console.error("onarım başarısız:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
