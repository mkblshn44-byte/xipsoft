import { readFile } from "node:fs/promises";
import path from "node:path";
import pool from "@/lib/database";
import { PRIORITY_DISTRICTS } from "@/config/priority-locations";

/**
 * Dry-run is the default. For writes, configure SEO_CONTENT_API_URL and
 * BOT_API_KEY privately, then pass --apply. The API URL must target the same
 * deployment/database as DATABASE_URL so page and sitemap caches are invalidated.
 *
 * Usage:
 *   npm run seo:publish-local-content -- --dry-run
 *   npm run seo:publish-local-content -- --file src/scripts/data/verified-province-pages.json --allow-partial --dry-run
 *   npm run seo:publish-local-content -- --apply
 */
interface LocalSeoFaq {
  question: string;
  answer: string;
}

interface LocalSeoSource {
  title: string;
  url: string;
  claim: string;
}

interface LocalSeoPage {
  serviceSlug: string;
  locationSlug: string;
  locationType: "province" | "district";
  provinceSlug?: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  ozelMetaDesc: string;
  lokalAciklama: string;
  content: string;
  lokalSss: LocalSeoFaq[];
  sources: LocalSeoSource[];
}

interface PageBatchResult {
  index: number;
  success: boolean;
  slug?: string;
  error?: string;
}

const isApply = process.argv.includes("--apply");
const allowPartial = process.argv.includes("--allow-partial");
const inputIndex = process.argv.indexOf("--file");
const inputFile = inputIndex >= 0
  ? process.argv[inputIndex + 1] || "src/scripts/data/local-seo-pages.json"
  : "src/scripts/data/local-seo-pages.json";
const EXPECTED_DISTRICTS = 30;
const EXPECTED_PROVINCES = 81;
const BATCH_SIZE = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function wordCount(text: string): number {
  return text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}

function requireString(
  record: Record<string, unknown>,
  field: string,
  label: string,
): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}: ${field} boş olamaz`);
  }
  return value.trim();
}

function parsePage(value: unknown, index: number): LocalSeoPage {
  if (!isRecord(value)) throw new Error(`Kayıt ${index + 1}: nesne biçiminde olmalıdır`);
  const label = `Kayıt ${index + 1}`;
  const serviceSlug = requireString(value, "serviceSlug", label);
  const locationSlug = requireString(value, "locationSlug", label);
  const rawLocationType = requireString(value, "locationType", label);
  const title = requireString(value, "title", label);
  const metaTitle = requireString(value, "metaTitle", label);
  const metaDescription = requireString(value, "metaDescription", label);
  const ozelMetaDesc = requireString(value, "ozelMetaDesc", label);
  const lokalAciklama = requireString(value, "lokalAciklama", label);
  const content = requireString(value, "content", label);
  if (rawLocationType !== "province" && rawLocationType !== "district") {
    throw new Error(`Kayıt ${index + 1}: locationType province veya district olmalıdır`);
  }
  const locationType = rawLocationType;
  const provinceSlug = value.provinceSlug;
  if (locationType === "district" && (typeof provinceSlug !== "string" || !provinceSlug.trim())) {
    throw new Error(`Kayıt ${index + 1}: ilçeler için provinceSlug zorunludur`);
  }
  if (!Array.isArray(value.lokalSss)) {
    throw new Error(`Kayıt ${index + 1}: lokalSss soru/cevap dizisi olmalıdır`);
  }
  const lokalSss = value.lokalSss.map((faq, faqIndex): LocalSeoFaq => {
    if (!isRecord(faq)) throw new Error(`${label}: SSS ${faqIndex + 1} nesne olmalıdır`);
    return {
      question: requireString(faq, "question", `${label} SSS ${faqIndex + 1}`),
      answer: requireString(faq, "answer", `${label} SSS ${faqIndex + 1}`),
    };
  });
  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    throw new Error(`Kayıt ${index + 1}: doğrulanmış https kaynakları zorunludur`);
  }
  const sources = value.sources.map((source, sourceIndex): LocalSeoSource => {
    if (!isRecord(source)) throw new Error(`${label}: kaynak ${sourceIndex + 1} nesne olmalıdır`);
    const url = requireString(source, "url", `${label} kaynak ${sourceIndex + 1}`);
    if (new URL(url).protocol !== "https:") {
      throw new Error(`${label}: kaynak URL'si HTTPS olmalıdır`);
    }
    return {
      title: requireString(source, "title", `${label} kaynak ${sourceIndex + 1}`),
      url,
      claim: requireString(source, "claim", `${label} kaynak ${sourceIndex + 1}`),
    };
  });

  const page: LocalSeoPage = {
    serviceSlug,
    locationSlug,
    locationType,
    provinceSlug: typeof provinceSlug === "string" ? provinceSlug.trim() : undefined,
    title,
    metaTitle,
    metaDescription,
    ozelMetaDesc,
    lokalAciklama,
    content,
    lokalSss,
    sources,
  };
  const words = wordCount(page.content);
  const minWords = locationType === "province" ? 500 : 300;
  const maxWords = locationType === "province" ? 600 : 400;
  const minFaqs = locationType === "province" ? 4 : 3;
  const maxFaqs = page.locationType === "province" ? 5 : 5;
  if (words < minWords || words > maxWords) {
    throw new Error(`Kayıt ${index + 1} (${page.locationSlug}): Markdown ${words} kelime; aralık ${minWords}–${maxWords}`);
  }
  if (page.lokalSss.length < minFaqs || page.lokalSss.length > maxFaqs) {
    throw new Error(`Kayıt ${index + 1} (${page.locationSlug}): SSS sayısı ${minFaqs}–${maxFaqs} olmalıdır`);
  }
  if (page.lokalSss.some((faq) => faq.question.length > 300 || faq.answer.length > 3000)) {
    throw new Error(`Kayıt ${index + 1} (${page.locationSlug}): SSS metni API uzunluk sınırını aşıyor`);
  }
  for (const source of page.sources) {
    if (!page.content.includes(source.url)) {
      throw new Error(`Kayıt ${index + 1} (${page.locationSlug}): kaynak URL'si Markdown içinde bulunamadı`);
    }
  }
  return page;
}

async function loadPages(): Promise<LocalSeoPage[]> {
  const resolvedPath = path.resolve(process.cwd(), inputFile);
  const raw: unknown = JSON.parse(await readFile(resolvedPath, "utf8"));
  if (!Array.isArray(raw)) throw new Error("Girdi dosyasının kökü bir JSON dizisi olmalıdır");

  const pages = raw.map(parsePage);
  const keys = new Set<string>();
  for (const page of pages) {
    const key = `${page.serviceSlug}/${page.locationType}/${page.provinceSlug ?? ""}/${page.locationSlug}`;
    if (keys.has(key)) throw new Error(`Yinelenen hedef sayfa: ${key}`);
    keys.add(key);
  }

  const districtCount = pages.filter((page) => page.locationType === "district").length;
  const provinceCount = pages.filter((page) => page.locationType === "province").length;
  if (allowPartial) {
    if (pages.length === 0) throw new Error("Kısmi içerik partisi boş olamaz");
  } else if (districtCount !== EXPECTED_DISTRICTS || provinceCount !== EXPECTED_PROVINCES) {
    throw new Error(
      `İçerik kapsamı hatalı: ${districtCount} ilçe (beklenen ${EXPECTED_DISTRICTS}), ` +
      `${provinceCount} il (beklenen ${EXPECTED_PROVINCES})`,
    );
  }
  if (pages.some((page) => page.serviceSlug !== "web-yazilim-tasarim")) {
    throw new Error("Bu içerik partisi yalnızca web-yazilim-tasarim hizmetini kapsar");
  }
  const uniqueMetaTitles = new Set(pages.map((page) => page.metaTitle));
  const uniqueMetaDescriptions = new Set(pages.map((page) => page.metaDescription));
  if (uniqueMetaTitles.size !== pages.length || uniqueMetaDescriptions.size !== pages.length) {
    throw new Error("Her sayfanın meta başlığı ve açıklaması benzersiz olmalıdır");
  }
  return pages;
}

async function verifyScope(pages: LocalSeoPage[]): Promise<void> {
  const requestedDistricts = new Set(
    pages
      .filter((page) => page.locationType === "district")
      .map((page) => `${page.provinceSlug}/${page.locationSlug}`),
  );
  const selectedDistricts = new Set(PRIORITY_DISTRICTS.map(([province, district]) => `${province}/${district}`));
  if (allowPartial) {
    if ([...requestedDistricts].some((district) => !selectedDistricts.has(district))) {
      throw new Error("Kısmi ilçe içerik listesinde allowlist dışında hedef var");
    }
  } else if (
    requestedDistricts.size !== selectedDistricts.size ||
    [...selectedDistricts].some((district) => !requestedDistricts.has(district))
  ) {
    throw new Error("İlçe içerik listesi PRIORITY_DISTRICTS allowlist'iyle tam eşleşmiyor");
  }

  const { rows } = await pool.query<{ slug: string }>(
    `SELECT slug
       FROM locations
      WHERE location_type = 'province'
        AND is_active = TRUE`,
  );
  const requestedProvinces = new Set(
    pages.filter((page) => page.locationType === "province").map((page) => page.locationSlug),
  );
  const activeProvinces = new Set(rows.map((row) => row.slug));
  if (allowPartial) {
    if ([...requestedProvinces].some((province) => !activeProvinces.has(province))) {
      throw new Error("Kısmi il içerik listesinde DB'de aktif olmayan il hedefi var");
    }
  } else if (
    requestedProvinces.size !== activeProvinces.size ||
    [...activeProvinces].some((province) => !requestedProvinces.has(province))
  ) {
    throw new Error("İl içerik listesi DB'deki 81 aktif il ile tam eşleşmiyor");
  }
}

async function verifyLocations(pages: LocalSeoPage[]): Promise<void> {
  const targets = JSON.stringify(pages.map((page) => ({
    serviceSlug: page.serviceSlug,
    locationSlug: page.locationSlug,
    locationType: page.locationType,
    provinceSlug: page.provinceSlug ?? null,
  })));
  const result = await pool.query<{ missing: number }>(
    `WITH targets AS (
       SELECT *
         FROM jsonb_to_recordset($1::jsonb) AS t(
           "serviceSlug" text,
           "locationSlug" text,
           "locationType" text,
           "provinceSlug" text
         )
     )
     SELECT COUNT(*)::int AS missing
       FROM targets t
      WHERE NOT EXISTS (
        SELECT 1
          FROM services s
          JOIN locations l
            ON l.slug = t."locationSlug"
           AND l.location_type = t."locationType"
           AND l.is_active = TRUE
          LEFT JOIN locations parent
            ON parent.id = l.parent_id
           AND parent.is_active = TRUE
         WHERE s.slug = t."serviceSlug"
           AND s.is_active = TRUE
           AND (
             t."locationType" = 'province'
             OR parent.slug = t."provinceSlug"
           )
      )`,
    [targets],
  );
  const missing = result.rows[0]?.missing ?? pages.length;
  if (missing > 0) throw new Error(`DB ön kontrolünde eşleşmeyen hizmet/konum sayısı: ${missing}`);
}

function getApiUrl(): URL {
  const value = process.env.SEO_CONTENT_API_URL;
  if (!value) throw new Error("Uygulama için SEO_CONTENT_API_URL ortam değişkeni zorunludur");
  const url = new URL(value);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("SEO_CONTENT_API_URL HTTPS olmalı (yalnızca localhost için HTTP kabul edilir)");
  }
  url.pathname = "/api/content";
  url.search = "";
  url.hash = "";
  return url;
}

async function publishBatch(apiUrl: URL, apiKey: string, pages: LocalSeoPage[]) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bot-Key": apiKey,
    },
    body: JSON.stringify({
      type: "pageBatch",
      pages: pages.map((page) => ({
        service: page.serviceSlug,
        location: page.locationSlug,
        province: page.provinceSlug,
        title: page.title,
        content: page.content,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        lokalAciklama: page.lokalAciklama,
        ozelMetaDesc: page.ozelMetaDesc,
        lokalSss: page.lokalSss,
        status: "published",
        sourceType: "manual",
      })),
    }),
  });
  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new Error(`Content API geçersiz yanıt verdi (HTTP ${response.status})`);
  }

  const results: PageBatchResult[] = [];
  for (const [index, result] of payload.results.entries()) {
    if (!isRecord(result) || typeof result.index !== "number" || typeof result.success !== "boolean") {
      throw new Error(`Content API batch sonucu ${index + 1} geçersiz`);
    }
    results.push({
      index: result.index,
      success: result.success,
      slug: typeof result.slug === "string" ? result.slug : undefined,
      error: typeof result.error === "string" ? result.error : undefined,
    });
  }
  if (results.length !== pages.length) {
    throw new Error(`Content API eksik sonuç verdi: ${results.length}/${pages.length}`);
  }
  const failures = results.filter((result) => result.success !== true);
  if (!response.ok || payload.success !== true || failures.length > 0) {
    const successes = results.filter((result) => result.success);
    console.error("Toplu içerik API kısmi sonucu:", { successes, failures });
    throw new Error(`Toplu kayıt başarısız: ${failures.length} / ${pages.length} sayfa`);
  }
  return results;
}

async function verifyPublishedPages(pages: LocalSeoPage[]): Promise<void> {
  const targets = JSON.stringify(pages.map((page) => ({
    serviceSlug: page.serviceSlug,
    locationSlug: page.locationSlug,
    locationType: page.locationType,
    provinceSlug: page.provinceSlug ?? null,
  })));
  const { rows } = await pool.query<{
    service_slug: string;
    location_slug: string;
    province_slug: string | null;
    location_type: "province" | "district";
    status: string;
    source_type: string;
    content: string;
    title: string;
    meta_title: string;
    meta_description: string;
    ozel_meta_desc: string | null;
    lokal_aciklama: string | null;
    lokal_sss: LocalSeoFaq[] | string | null;
  }>(
    `WITH targets AS (
       SELECT *
         FROM jsonb_to_recordset($1::jsonb) AS t(
           "serviceSlug" text,
           "locationSlug" text,
           "locationType" text,
           "provinceSlug" text
         )
     )
     SELECT s.slug AS service_slug,
            l.slug AS location_slug,
            parent.slug AS province_slug,
            l.location_type,
            p.status,
            p.source_type,
            p.markdown_content AS content,
            p.title,
            p.meta_title,
            p.meta_description,
            p.ozel_meta_desc,
            p.lokal_aciklama,
            p.lokal_sss
       FROM targets t
       JOIN services s ON s.slug = t."serviceSlug"
       JOIN locations l
         ON l.slug = t."locationSlug"
        AND l.location_type = t."locationType"
       LEFT JOIN locations parent ON parent.id = l.parent_id
       JOIN pages p
         ON p.service_id = s.id
        AND p.location_id = l.id
        AND p.is_deleted = FALSE
      WHERE t."locationType" = 'province'
         OR parent.slug = t."provinceSlug"`,
    [targets],
  );

  const expectedByKey = new Map(
    pages.map((page) => [
      `${page.serviceSlug}/${page.locationType}/${page.provinceSlug ?? ""}/${page.locationSlug}`,
      page,
    ]),
  );
  const problems: string[] = [];
  const verifiedKeys = new Set<string>();
  for (const row of rows) {
    const key = `${row.service_slug}/${row.location_type}/${row.province_slug ?? ""}/${row.location_slug}`;
    const expected = expectedByKey.get(key);
    if (!expected) continue;
    verifiedKeys.add(key);
    const faqs: unknown = typeof row.lokal_sss === "string" ? JSON.parse(row.lokal_sss) : row.lokal_sss;
    const count = wordCount(row.content);
    const minWords = row.location_type === "province" ? 500 : 300;
    const maxWords = row.location_type === "province" ? 600 : 400;
    if (row.status !== "published" || row.source_type !== "manual") {
      problems.push(`${row.location_slug}: status/source_type ${row.status}/${row.source_type}`);
    }
    if (
      row.title !== expected.title ||
      row.meta_title !== expected.metaTitle ||
      row.meta_description !== expected.metaDescription ||
      row.ozel_meta_desc !== expected.ozelMetaDesc ||
      row.lokal_aciklama !== expected.lokalAciklama ||
      row.content.trim() !== expected.content.trim()
    ) {
      problems.push(`${row.location_slug}: içerik veya meta alanları girdiyle eşleşmiyor`);
    }
    if (count < minWords || count > maxWords) problems.push(`${row.location_slug}: ${count} Markdown kelimesi`);
    if (!Array.isArray(faqs) || faqs.length < (row.location_type === "province" ? 4 : 3)) {
      problems.push(`${row.location_slug}: SSS sayısı eksik`);
    } else if (JSON.stringify(faqs) !== JSON.stringify(expected.lokalSss)) {
      problems.push(`${row.location_slug}: SSS veritabanındaki içerikle eşleşmiyor`);
    }
  }
  if (verifiedKeys.size !== pages.length) {
    problems.push(`${pages.length - verifiedKeys.size} hedef sayfa DB doğrulamasında bulunamadı`);
  }
  if (problems.length > 0) throw new Error(`DB doğrulama hataları:\n- ${problems.join("\n- ")}`);

  const counts = rows.reduce((result, row) => {
    const key = `${row.service_slug}/${row.location_type}/${row.province_slug ?? ""}/${row.location_slug}`;
    if (!expectedByKey.has(key)) return result;
    result[row.location_type] += 1;
    const count = wordCount(row.content);
    result.minWords = Math.min(result.minWords, count);
    result.maxWords = Math.max(result.maxWords, count);
    return result;
  }, { district: 0, province: 0, minWords: Number.POSITIVE_INFINITY, maxWords: 0 });
  console.log(
    `DB doğrulandı: ${counts.district} ilçe + ${counts.province} il; ` +
    `Markdown ${counts.minWords}–${counts.maxWords} kelime; tamamı manual/published.`,
  );
}

async function main() {
  const pages = await loadPages();
  await verifyScope(pages);
  await verifyLocations(pages);
  const scopeDescription = `${pages.filter((page) => page.locationType === "district").length} ilçe, ` +
    `${pages.filter((page) => page.locationType === "province").length} il`;
  console.log(
    `Ön kontrol başarılı: ${pages.length} sayfa (${scopeDescription})` +
    `${allowPartial ? " [kısmi kapsam]" : ""}.`,
  );

  if (!isApply) {
    console.log("[dry-run] DB değişmedi. Uygulama için --apply kullanın.");
    return;
  }

  const apiKey = process.env.BOT_API_KEY;
  if (!apiKey || apiKey.length < 16) throw new Error("BOT_API_KEY eksik veya geçersiz");
  const apiUrl = getApiUrl();
  let published = 0;
  for (let start = 0; start < pages.length; start += BATCH_SIZE) {
    const batch = pages.slice(start, start + BATCH_SIZE);
    const results = await publishBatch(apiUrl, apiKey, batch);
    published += results.filter((result) => result.success).length;
    console.log(`API kayıtları: ${published}/${pages.length}`);
  }

  await verifyPublishedPages(pages);
}

main()
  .catch((error) => {
    console.error("Yerel SEO içerikleri yayımlanamadı:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
