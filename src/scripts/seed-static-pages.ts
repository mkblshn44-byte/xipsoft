/**
 * seed-static-pages.ts — politika sayfalarını `pages` çatısına taşır.
 *
 * NEDEN BU ÜÇ SAYFA? `privacy-policy`, `terms-of-service`, `cookie-policy`
 * bugün kod rotası + `messages/{locale}.json` ile yayınlanıyor: DB'de SIFIR
 * içerik satırları var (ölçüldü: `xip_dynamic_content` `page_meta` kategorileri
 * arasında bu üç anahtar YOK). Route silme kapısı bunlar için veri tarafında
 * henüz kapalı — bu script o kapıyı açar.
 *
 * ÇOK DİL: 6 dilin metni satır başına 6 kopya OLMAZ. TR temel kolonlara yazılır,
 * diğer beş dil `pages.content_i18n` jsonb haritasına (`localizeNode` isteğe göre
 * örtüştürür; cache yol başına tek kalır).
 *
 * PARİTE HEDEFİ (route silince değişmemesi gereken her şey):
 *  - `<title>`: rota bugün `titleAbsolute: true` basıyor → `title_absolute = TRUE`
 *    + `meta_title = <locale başlığı>` aynı çıktıyı verir.
 *  - `<h1>`: `t("title")` → `title` kolonu (h1_title boş bırakılır).
 *  - meta description: `t("description")` → `meta_description` / dil örtüşmesi.
 *  - gövde: JSX bölüm sırası JSON anahtar sırasıyla BİREBİR aynı → markdown
 *    başlık seviyeleri korunur (h2 bölüm, h3 alt blok).
 *  - JSON-LD: `corporatePageSchema` çıktısı `schema_markup`'a aynen yazılır;
 *    `name`/`description` dil bazlı olduğu için şemanın kopyası da `content_i18n`
 *    içinde taşınır.
 *  - BİLİNÇLİ KAYIPLAR (kod rotası silinince değişir, rapor edilir):
 *    `JsonLd` `id` özniteliği (`privacy-policy` → `tree-<uuid>`),
 *    `<Container>` sarmalayıcısı ve `prose-inverse` yerine `prose-invert`,
 *    başlıklara eklenen `rehype-slug` çapa linkleri.
 *
 * Kullanım:
 *   npm run db:seed-static-pages          (dry-run: hiçbir şey yazmaz)
 *   npm run db:seed-static-pages -- --apply
 */
import fs from "node:fs";
import path from "node:path";
import pool from "@/lib/db/pool";
import { SITE_URL } from "@/lib/site-url";
import { corporatePageSchema } from "@/lib/schema/page";
import { hashPageContent } from "@/lib/pages/hash";
import { invalidatePageCaches } from "@/lib/redis/page-cache";
import { routing } from "@/i18n/routing";

const applyChanges = process.argv.includes("--apply");

type Dict = Record<string, unknown>;

interface PageSpec {
  /** `pages.full_path` (uzantısız, başsız) — `slug` ile aynı, kök segment. */
  path: string;
  /** `messages/{locale}.json` namespace'i. */
  namespace: string;
  /** Rotanın yazdığı BreadcrumbList son elemanı (TR sabitiydi, aynen taşınır). */
  crumbName: string;
}

const SPECS: PageSpec[] = [
  { path: "privacy-policy", namespace: "privacy", crumbName: "Gizlilik Politikası" },
  { path: "terms-of-service", namespace: "terms", crumbName: "Kullanım Şartları" },
  { path: "cookie-policy", namespace: "cookies", crumbName: "Çerez Politikası" },
];

const LOCALES = routing.locales as readonly string[];
const BASE_LOCALE = routing.defaultLocale;

function isDict(value: unknown): value is Dict {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function loadNamespace(locale: string, namespace: string): Dict {
  const file = path.join(process.cwd(), "messages", `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8")) as Dict;
  const ns = json[namespace];
  if (!isDict(ns)) throw new Error(`messages/${locale}.json içinde '${namespace}' yok`);
  return ns;
}

/** Yaprak yolları (`sections.rights.items.access`) — diller arası eksik/fazla denetimi. */
function leafPaths(node: Dict, prefix = ""): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    const p = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.push(p);
    else if (Array.isArray(value)) out.push(`${p}[]${value.length}`);
    else if (isDict(value)) out.push(...leafPaths(value, p));
  }
  return out;
}

function bullets(out: string[], items: string[]): void {
  if (items.length === 0) return;
  if (out.at(-1) !== "") out.push("");
  for (const item of items) out.push(`- ${item}`);
  out.push("");
}

function paragraphs(out: string[], value: string): void {
  if (out.at(-1) !== "") out.push("");
  out.push(value);
  out.push("");
}

/**
 * `sections` düğümünü JSX sırasına göre markdown'a çevirir.
 *
 * Alan adlarını TEK TEK listelememek bilinçli tercih: JSON anahtar sırası
 * `page.tsx`'teki bölüm sırasıyla aynı (doğrulandı), böylece şablon iki yerde
 * bakım görmez. Kurallar:
 *   `title`           → başlık (bölüm ##, alt blok ###)
 *   düz string        → paragraf (`content`, `intro`, `optout`, `details` …)
 *   string nesnesi    → madde listesi (`items`, `browsers`)
 *   `{label,value}`   → `- **label** value` (`contact.email`, `contact.address`)
 *   dizi              → madde listesi
 */
function emitSections(node: Dict, depth: number, out: string[]): void {
  for (const [key, value] of Object.entries(node)) {
    if (key === "title") continue;

    const straight = text(value);
    if (straight) {
      paragraphs(out, straight);
      continue;
    }

    if (Array.isArray(value)) {
      bullets(out, value.map((item) => String(item).trim()).filter(Boolean));
      continue;
    }

    if (!isDict(value)) continue;

    const label = text(value.label);
    const rendered = text(value.value);
    if (label && rendered && Object.keys(value).length === 2) {
      bullets(out, [`**${label}** ${rendered}`]);
      continue;
    }

    const title = text(value.title);
    if (title) {
      if (out.at(-1) !== "") out.push("");
      out.push(`${"#".repeat(Math.min(depth, 6))} ${title}`, "");
      emitSections(value, depth + 1, out);
      continue;
    }

    const values = Object.values(value);
    if (values.length > 0 && values.every((v) => typeof v === "string")) {
      bullets(out, values.map((v) => (v as string).trim()).filter(Boolean));
      continue;
    }

    emitSections(value, depth, out);
  }
}

function buildMarkdown(ns: Dict): string {
  const out: string[] = [];
  const lastUpdated = text(ns.lastUpdated);
  if (lastUpdated) out.push(`**${lastUpdated}**`, "");
  const sections = ns.sections;
  if (isDict(sections)) emitSections(sections, 2, out);
  const backToHome = text(ns.backToHome);
  if (backToHome) out.push("", `← [${backToHome}](/)`);
  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

/** Rotanın bastığı şemanın aynısı (locale bazlı `name`/`description` ile). */
function buildSchema(spec: PageSpec, title: string, description: string) {
  return corporatePageSchema({
    name: title,
    description,
    url: `/${spec.path}`,
    breadcrumbs: [
      { name: "Ana Sayfa", url: "/" },
      { name: spec.crumbName, url: `/${spec.path}` },
    ],
  }) as Record<string, unknown>[];
}

interface BuiltRow {
  spec: PageSpec;
  title: string;
  metaTitle: string;
  metaDescription: string;
  markdown: string;
  schema: Record<string, unknown>[];
  /** `pages.content_i18n`: temel dil (TR) YOK — örtüşme haritası yalnızca diğerleri. */
  i18n: Record<string, unknown>;
  contentHash: string;
}

function buildRow(spec: PageSpec): BuiltRow {
  const base = loadNamespace(BASE_LOCALE, spec.namespace);
  const title = text(base.title);
  const description = text(base.description);
  if (!title || !description) {
    throw new Error(`${spec.namespace}: TR title/description boş — seed reddedildi`);
  }
  const markdown = buildMarkdown(base);

  const i18n: Record<string, unknown> = {};
  const problems: string[] = [];
  const baseLeaves = new Set(leafPaths(base));

  for (const locale of LOCALES) {
    if (locale === BASE_LOCALE) continue;
    const ns = loadNamespace(locale, spec.namespace);

    // Eksik yaprak = o dilde içerik kaybı (sessizce TR kalır). Fazla yaprak =
    // TR'de olmayan bir bölüm, markdown'a girmeyebilir. İkisi de rapor edilir.
    const leaves = leafPaths(ns);
    const missing = [...baseLeaves].filter((p) => !leaves.includes(p));
    const extra = leaves.filter((p) => !baseLeaves.has(p));
    if (missing.length) problems.push(`${locale}: eksik ${missing.length} alan (${missing.slice(0, 4).join(", ")})`);
    if (extra.length) problems.push(`${locale}: fazla ${extra.length} alan (${extra.slice(0, 4).join(", ")})`);

    const localeTitle = text(ns.title);
    const localeDescription = text(ns.description);
    const localeMarkdown = buildMarkdown(ns);

    i18n[locale] = {
      title: localeTitle ?? undefined,
      // `PageView` H1'i `h1Title ?? title`'dan basar: örtüşmede `h1Title` olmazsa
      // temel kolonun TR başlığı diğer dillerin H1'i olarak sızar.
      h1Title: localeTitle ?? undefined,
      metaTitle: localeTitle ?? undefined,
      metaDescription: localeDescription ?? undefined,
      markdownContent: localeMarkdown,
      schemaMarkup:
        localeTitle && localeDescription
          ? buildSchema(spec, localeTitle, localeDescription)
          : undefined,
    };
  }

  if (problems.length) {
    throw new Error(
      `${spec.namespace} dil paritesi bozuk:\n  ${problems.join("\n  ")}`,
    );
  }

  return {
    spec,
    title,
    metaTitle: title,
    metaDescription: description,
    markdown,
    schema: buildSchema(spec, title, description),
    i18n,
    contentHash: hashPageContent(markdown),
  };
}

const UPSERT_SQL = `
  INSERT INTO pages
    (slug, full_path, kind, page_type, node_type, title, meta_title, title_absolute,
     meta_description, markdown_content, content_hash, keywords, status, is_indexable,
     source_type, canonical_url, schema_markup, content_i18n, published_at, sort_order)
  VALUES
    ($1, $2, 'page', 'page', 'page', $3, $3, TRUE,
     $4, $5, $6, '{}'::text[], 'published', TRUE,
     'manual', $7, $8::jsonb, $9::jsonb, NOW(), 0)
  ON CONFLICT (full_path)
    WHERE full_path IS NOT NULL AND is_deleted = FALSE
  DO UPDATE SET
    slug = EXCLUDED.slug,
    kind = 'page',
    page_type = 'page',
    node_type = 'page',
    title = EXCLUDED.title,
    meta_title = EXCLUDED.meta_title,
    title_absolute = TRUE,
    meta_description = EXCLUDED.meta_description,
    markdown_content = EXCLUDED.markdown_content,
    content_hash = EXCLUDED.content_hash,
    status = 'published',
    is_indexable = TRUE,
    is_deleted = FALSE,
    deleted_at = NULL,
    canonical_url = EXCLUDED.canonical_url,
    schema_markup = EXCLUDED.schema_markup,
    content_i18n = EXCLUDED.content_i18n,
    updated_at = NOW()
`;

async function preflight(rows: BuiltRow[], strict: boolean): Promise<boolean> {
  const paths = rows.map((r) => `${SITE_URL}/${r.spec.path}`);

  const { rows: redirects } = await pool.query<{
    source_path: string;
    target_path: string | null;
    status_code: number;
  }>(
    `SELECT source_path, target_path, status_code FROM seo_redirects
      WHERE source_path = ANY($1) OR target_path = ANY($1)`,
    [paths],
  );

  const { rows: existing } = await pool.query<{
    full_path: string;
    kind: string;
    status: string;
    source_type: string;
  }>(
    `SELECT full_path, kind, status, source_type FROM pages WHERE full_path = ANY($1)`,
    [rows.map((r) => r.spec.path)],
  );

  const { rows: columns } = await pool.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'pages' AND column_name IN ('content_i18n', 'title_absolute')`,
  );
  const missingColumns = ["content_i18n", "title_absolute"].filter(
    (c) => !columns.some((row) => row.column_name === c),
  );

  console.log("\n=== ÖN KONTROL (salt-okunur) ===");
  console.log(`  Gerekli kolonlar: ${missingColumns.length ? `EKSİK → ${missingColumns.join(", ")}` : "tam"}`);
  console.log(`  Hedef yollarda mevcut pages satırı: ${existing.length}`);
  for (const row of existing) {
    console.log(`    ${row.full_path} (kind=${row.kind}, status=${row.status}, ${row.source_type})`);
  }
  console.log(`  Bu yollara dokunan seo_redirects kuralı: ${redirects.length}`);
  for (const row of redirects) {
    console.log(`    ${row.source_path} → ${row.target_path ?? "∅"} (${row.status_code})`);
  }

  const blockers: string[] = [];
  if (missingColumns.length) {
    blockers.push(
      `kolon eksik: ${missingColumns.join(", ")} — önce ` +
        "`npm run db:pages-roof -- --apply` (ya da bir ağaç isteğinin `ensureContentTreeSchema()` çalıştırması)",
    );
  }
  const foreign = existing.filter((row) => row.source_type !== "manual");
  if (foreign.length) {
    blockers.push(
      `hedef yolu manuel olmayan satır işgal ediyor: ${foreign.map((r) => r.full_path).join(", ")}`,
    );
  }
  if (redirects.length) {
    blockers.push(
      "bu yollarda seo_redirects kuralı var; yayınlanmış ağaç satırı middleware'de kuralı ezer " +
        "(bkz. redirect-handler treeLookup) — kuralı önce kapatın",
    );
  }

  if (blockers.length === 0) return true;
  for (const blocker of blockers) console.error(`  ENGEL: ${blocker}`);
  // Dry-run yalnızca bilgi verir; --apply bloker varsa hiçbir şey yazmaz.
  return !strict;
}

function report(rows: BuiltRow[]): void {
  console.log("\n=== ÜRETİLEN SATIRLAR ===");
  for (const row of rows) {
    const words = row.markdown.split(/\s+/).filter(Boolean).length;
    const h2 = (row.markdown.match(/^## \S/gm) ?? []).length;
    const h3 = (row.markdown.match(/^### \S/gm) ?? []).length;
    const locales = Object.keys(row.i18n);
    const localeWords = locales.map((l) => {
      const md = String((row.i18n[l] as Dict).markdownContent ?? "");
      return `${l}:${md.split(/\s+/).filter(Boolean).length}`;
    });
    console.log(
      `\n  /${row.spec.path}  → kind=page, title_absolute=TRUE, ${h2}×h2, ${h3}×h3, ` +
        `TR ${words} kelime, schema=${row.schema.map((s) => String(s["@type"])).join("+")}`,
    );
    console.log(`    dil örtüşmeleri: ${localeWords.join(" ")}`);
    console.log(`    content_hash: ${row.contentHash.slice(0, 12)}…`);
  }

  const preview = rows[0]?.markdown.split("\n").slice(0, 14).join("\n") ?? "";
  console.log(`\n=== TR MARKDOWN ÖNİZLEME (${rows[0]?.spec.path}) ===\n${preview}\n…`);

  // Markdown özel karakterleri gövdeyi bozabilir (link/italik yorumlanır).
  const suspicious = rows.filter((row) => /[[\]*_`]/.test(row.markdown));
  console.log(
    `\nMarkdown özel karakteri içeren satır sayısı: ${rows.reduce(
      (sum, r) => sum + r.markdown.split("\n").filter((l) => /[[\]*_`]/.test(l)).length,
      0,
    )} (${suspicious.map((r) => r.spec.path).join(", ") || "temiz"})`,
  );
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL yok — havuz mock'a düşer. `--env-file=.env.local` ile çalıştırın.",
    );
    process.exitCode = 1;
    return;
  }

  const rows = SPECS.map(buildRow);
  report(rows);

  const ok = await preflight(rows, applyChanges);
  if (!ok) {
    process.exitCode = 1;
    return;
  }

  if (!applyChanges) {
    console.log("\n[dry-run] Hiçbir satır yazılmadı. Uygulamak için: --apply");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      await client.query(UPSERT_SQL, [
        row.spec.path,
        row.spec.path,
        row.title,
        row.metaDescription,
        row.markdown,
        row.contentHash,
        `${SITE_URL}/${row.spec.path}`,
        JSON.stringify(row.schema),
        JSON.stringify(row.i18n),
      ]);
      console.log(`  yazıldı: /${row.spec.path}`);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await invalidatePageCaches({
    slugs: SPECS.map((spec) => spec.path),
    sitemap: true,
  });

  console.log(
    "\nPolicy kayıtları `pages` üzerinden sunuluyor; policy kod rotaları kaldırıldı. " +
      "Görüntü paritesini yerel/üretim smoke testleriyle doğrulayın.",
  );
}

void main()
  .catch((error: unknown) => {
    console.error("seed başarısız:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
