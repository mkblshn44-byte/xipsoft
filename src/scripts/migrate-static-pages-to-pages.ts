import { readFileSync } from "node:fs";
import { join } from "node:path";
import pool from "@/lib/db/pool";
import { invalidateAllPageCaches } from "@/lib/redis/page-cache";
import { SITE_URL } from "@/lib/site-url";

type JsonRecord = Record<string, unknown>;

interface PageMetaRow {
  category: string;
  title: string;
  metadata: JsonRecord | null;
  updated_at: Date;
}

interface StaticPageSpec {
  path: string;
  metaKey: string;
  localeKey: string | null;
  slug?: string;
  kind?: "page" | "category";
  faqCategory?: string;
}

const ROOT = process.cwd();
const LOCALES = ["tr", "en", "de", "fr", "es", "ru"] as const;
const STATIC_PAGES: StaticPageSpec[] = [
  { path: "anasayfa", metaKey: "home", localeKey: "home" },
  { path: "hizmetler", metaKey: "hizmetler", localeKey: null, kind: "category" },
  { path: "hakkimizda", metaKey: "hakkimizda", localeKey: "about" },
  { path: "contact-us", metaKey: "contact", localeKey: "contact", faqCategory: "contact" },
  { path: "references", metaKey: "references", localeKey: "references" },
  {
    path: "istanbul-yazilim-sirketi",
    metaKey: "istanbul-yazilim-sirketi",
    localeKey: "istanbul",
    faqCategory: "istanbul",
  },
];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function markdownFromValue(value: unknown, level = 2): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const text = markdownFromValue(item, level + 1);
        return text ? `- ${text.replace(/\n/g, "\n  ")}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (!isRecord(value)) return "";

  return Object.entries(value)
    .map(([key, child]) => {
      if (key === "title" && typeof child === "string") {
        const nested = Object.fromEntries(
          Object.entries(value).filter(([nestedKey]) => nestedKey !== "title"),
        );
        const body = markdownFromValue(nested, level + 1);
        return [`${"#".repeat(Math.min(level, 6))} ${child}`, body]
          .filter(Boolean)
          .join("\n\n");
      }

      const body = markdownFromValue(child, level + 1);
      if (!body) return "";
      if (key === "sections" || key === "items") return body;

      const heading = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ");
      return `${"#".repeat(Math.min(level, 6))} ${heading}\n\n${body}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

interface LocalizedContent extends JsonRecord {
  title: string;
  h1Title: string;
  metaTitle: string;
  metaDescription: string;
  markdownContent: string;
}

function localizedContent(
  localeKey: string,
  fallbackTitle: string,
  fallbackDescription: string,
): Record<string, LocalizedContent> {
  const translations: Record<string, LocalizedContent> = {};
  for (const locale of LOCALES) {
    const messages = JSON.parse(
      readFileSync(join(ROOT, "messages", `${locale}.json`), "utf8"),
    ) as JsonRecord;
    const source = messages[localeKey];
    const sourceRecord = isRecord(source) ? source : {};
    const title = typeof sourceRecord.title === "string" ? sourceRecord.title : fallbackTitle;
    const description =
      typeof sourceRecord.description === "string"
        ? sourceRecord.description
        : fallbackDescription;
    const markdownContent = isRecord(source)
      ? markdownFromValue(source)
      : [`# ${title}`, description].filter(Boolean).join("\n\n");
    if (!markdownContent) {
      throw new Error(`Empty "${localeKey}" page content in ${locale}.json`);
    }
    translations[locale] = {
      title,
      h1Title: title,
      metaTitle: title,
      metaDescription: description,
      markdownContent,
      ...(isRecord(sourceRecord.hero) ? { hero: sourceRecord.hero } : {}),
    };
  }
  return translations;
}

function servicesHubMarkdown(description: string): string {
  return description.trim();
}

function istanbulMarkdown(title: string, description: string): string {
  return [
    description,
    "## İstanbul firmalarına özel teknoloji altyapımız",
    "### Next.js 16+",
    "SSR, ISR ve Edge Runtime ile yüksek performanslı web uygulamaları. Core Web Vitals odaklı geliştirme.",
    "### PostgreSQL & NeonDB",
    "Serverless veritabanı optimizasyonu; sorgu planı analizi ve index stratejisi.",
    "### Tailwind CSS",
    "Responsive, mobil öncelikli ve erişilebilir arayüzler.",
    "### React Native / Swift / Kotlin",
    "iOS ve Android için native performanslı mobil uygulamalar.",
    "### Siber güvenlik",
    "Güvenlik denetimi, OWASP Top 10 uyumluluğu ve güvenli kod danışmanlığı.",
    "### SEO & Dijital Pazarlama",
    "Teknik SEO, içerik stratejisi ve Core Web Vitals iyileştirmeleri.",
    "## İstanbul'da hizmet verdiğimiz ilçeler",
    "Şişli, Beşiktaş, Kadıköy, Levent, Maslak, Ataşehir, Ümraniye, Maltepe, Bakırköy ve Sarıyer.",
    "## Projenizi birlikte planlayalım",
    "[İletişime geçin](/contact-us) veya [hizmetlerimizi inceleyin](/hizmetler).",
  ].join("\n\n");
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required; run with --env-file=.env.local.");
  }

  const { rows: metaRows } = await pool.query<PageMetaRow>(
    `SELECT category, title, metadata, MAX(updated_at) OVER (PARTITION BY category) AS updated_at
       FROM xip_dynamic_content
      WHERE content_type = 'page_meta'
        AND is_active = TRUE
        AND deleted_at IS NULL`,
  );
  const metadataByCategory = new Map(
    metaRows.map((row) => [row.category, { ...row, metadata: row.metadata ?? {} }]),
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "ALTER TABLE pages ADD COLUMN IF NOT EXISTS content_i18n jsonb",
    );

    const rootHome = await client.query<{ id: string }>(
      `SELECT id::text
         FROM pages
        WHERE full_path = ''
          AND source_type = 'static-page-migration'
          AND is_deleted = FALSE
        LIMIT 1`,
    );
    if (rootHome.rows[0]) {
      const homePath = await client.query<{ id: string }>(
        `SELECT id::text FROM pages
          WHERE full_path = 'anasayfa' AND is_deleted = FALSE
          LIMIT 1`,
      );
      if (homePath.rows[0] && homePath.rows[0].id !== rootHome.rows[0].id) {
        throw new Error("Both an empty-path homepage and /anasayfa exist; resolve the URL conflict first.");
      }
      await client.query(
        `UPDATE pages SET slug = 'anasayfa', full_path = 'anasayfa', updated_at = NOW()
          WHERE id = $1::uuid`,
        [rootHome.rows[0].id],
      );
    }

    const existingPaths = await client.query<{ full_path: string; source_type: string | null }>(
      `SELECT full_path, source_type FROM pages
        WHERE is_deleted = FALSE AND full_path = ANY($1::text[])`,
      [STATIC_PAGES.map((page) => page.path)],
    );
    const conflicting = existingPaths.rows.filter(
      (row) => row.source_type !== "static-page-migration",
    );
    if (conflicting.length) {
      throw new Error(
        `Existing non-migration pages would be overwritten: ${conflicting.map((row) => row.full_path).join(", ")}`,
      );
    }

    let migrated = 0;
    for (const page of STATIC_PAGES) {
      const meta = metadataByCategory.get(page.metaKey);
      const metadata = meta?.metadata ?? {};
      const translationMessages = JSON.parse(
        readFileSync(join(ROOT, "messages", "tr.json"), "utf8"),
      ) as JsonRecord;
      const translation =
        page.localeKey && isRecord(translationMessages[page.localeKey])
          ? translationMessages[page.localeKey] as JsonRecord
          : {};
      const title =
        meta?.title?.trim() ||
        (typeof translation.title === "string" ? translation.title : page.path);
      const description =
        typeof metadata.description === "string"
          ? metadata.description
          : typeof translation.description === "string"
            ? translation.description
            : "";
      const keywords = Array.isArray(metadata.keywords)
        ? metadata.keywords.map(String)
        : [];
      const jsonLd = isRecord(metadata.jsonLd) ? metadata.jsonLd : {};
      const translations = page.localeKey
        ? localizedContent(page.localeKey, title, description)
        : Object.fromEntries(
            LOCALES.map((locale) => [
              locale,
              {
                title,
                h1Title: title,
                metaTitle: title,
                metaDescription: description,
                markdownContent: servicesHubMarkdown(description),
              },
            ]),
          );
      if (page.path === "istanbul-yazilim-sirketi") {
        const markdownContent = istanbulMarkdown(title, description);
        for (const translation of Object.values(translations)) {
          translation.markdownContent = markdownContent;
        }
      }
      const trContent = translations.tr.markdownContent;
      const contentI18n: Record<string, JsonRecord> = Object.fromEntries(
        Object.entries(translations).filter(([locale]) => locale !== "tr"),
      );
      contentI18n.tr = {
        ...translations.tr,
        title,
        h1Title: typeof metadata.h1Title === "string" ? metadata.h1Title : title,
        metaTitle: meta?.title || title,
        metaDescription: description,
        hero: metadata.hero,
        sections: metadata.sections,
        jsonLd,
        ogTitle: metadata.ogTitle,
        ogDescription: metadata.ogDescription,
      };
      if ("faqCategory" in page) {
        const { rows: faqs } = await client.query<{ question: string; answer: string }>(
          `SELECT title AS question, metadata->>'answer' AS answer
             FROM xip_dynamic_content
            WHERE content_type = 'page_faq'
              AND category = $1
              AND is_active = TRUE
              AND deleted_at IS NULL
            ORDER BY order_index, id`,
          [page.faqCategory],
        );
        contentI18n.tr.faqs = faqs;
      }
      const renderedSchema = Object.keys(jsonLd).length
        ? JSON.stringify([jsonLd])
        : null;

      await client.query(
        `INSERT INTO pages
           (kind, node_type, page_type, slug, full_path, title, h1_title,
            meta_title, meta_description, markdown_content, keywords,
            og_title, og_description, content_i18n, schema_markup,
            canonical_url, source_type, status, is_deleted, is_indexable,
            published_at, updated_at)
         VALUES
           ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
            $12, $13, $14::jsonb, $15::jsonb, $16, 'static-page-migration',
            'published', FALSE, TRUE, NOW(), NOW())
         ON CONFLICT (full_path)
           WHERE full_path IS NOT NULL AND is_deleted = FALSE
         DO UPDATE SET
           kind = EXCLUDED.kind,
           node_type = EXCLUDED.node_type,
           page_type = EXCLUDED.page_type,
           slug = EXCLUDED.slug,
           title = EXCLUDED.title,
           h1_title = EXCLUDED.h1_title,
           meta_title = EXCLUDED.meta_title,
           meta_description = EXCLUDED.meta_description,
           markdown_content = EXCLUDED.markdown_content,
           keywords = EXCLUDED.keywords,
           og_title = EXCLUDED.og_title,
           og_description = EXCLUDED.og_description,
           content_i18n = EXCLUDED.content_i18n,
           schema_markup = EXCLUDED.schema_markup,
           canonical_url = EXCLUDED.canonical_url,
           status = 'published',
           is_deleted = FALSE,
           deleted_at = NULL,
           is_indexable = TRUE,
           published_at = COALESCE(pages.published_at, NOW()),
           updated_at = NOW()
         WHERE pages.source_type = 'static-page-migration'`,
        [
          page.kind ?? "page",
          page.kind === "category" ? "category" : "page",
          page.kind ?? "page",
          page.slug ?? page.path.split("/").at(-1),
          page.path,
          title,
          typeof metadata.h1Title === "string" ? metadata.h1Title : title,
          meta?.title || title,
          description,
          trContent,
          keywords,
          typeof metadata.ogTitle === "string" ? metadata.ogTitle : null,
          typeof metadata.ogDescription === "string" ? metadata.ogDescription : null,
          JSON.stringify(contentI18n),
          renderedSchema,
          page.metaKey === "home" ? `${SITE_URL}/` : `${SITE_URL}/${page.path}`,
        ],
      );
      migrated++;
    }

    const hub = await client.query<{ id: string }>(
      "SELECT id::text FROM pages WHERE full_path = 'hizmetler' AND is_deleted = FALSE LIMIT 1",
    );
    if (hub.rows[0]) {
      await client.query(
        `UPDATE pages
            SET parent_id = $1::uuid
          WHERE kind = 'service'
            AND is_deleted = FALSE
            AND full_path LIKE 'hizmetler/%'
            AND length(full_path) - length(replace(full_path, '/', '')) = 1`,
        [hub.rows[0].id],
      );
    }

    await client.query("COMMIT");
    await invalidateAllPageCaches();
    console.log(`Migrated ${migrated} static pages to pages.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

void main()
  .catch((error: unknown) => {
    console.error(
      "Static pages migration failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => pool.end());
