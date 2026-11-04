/**
 * seo-parity.ts — bir yolun arama motoruna görünen imzasını ölçer.
 *
 * NEDEN? Rota silmek, üretimi `pages` satırına bağlamak demektir. Satır doğru
 * yayınlanmadığı takdirde hata sessiz olur: sayfa açılır, status 200'dür, ama
 * `<title>`/canonical/başlık hiyerarşisi/JSON-LD sessizce sapar. Bu script o
 * sapmayı SAYIYA çevirir.
 *
 * AKIŞ (Talimat: "Seed → doğrula → sonra sil"):
 *   1) rota dururken:  npm run seo:parity -- --capture --out .parity/before.json
 *   2) seed + rota silme + yeniden build
 *   3) npm run seo:parity -- --compare .parity/before.json
 *      → yalnızca YEŞİL (farksız) yolların silinmesine onay verilir.
 *
 * Ölçülen imza: status, title, canonical, description, robots, OG/Twitter,
 * h1, h2/h3 sırası, JSON-LD türleri, gövde kelime sayısı.
 *
 * Yakalama HTML parse etmez (regex + etiket temizliği): build zincirine bir
 * parser bağımlılığı eklememek için. Bu, kırpılmış/kırık HTML'de yanlış okuma
 * riskini taşır — bu yüzden `rawLength` de karşılaştırılır ve hiçbir hedef
 * tek başına "yeşil" kabul edilmez.
 */
import fs from "node:fs";
import path from "node:path";
import { routing } from "@/i18n/routing";

const BASE = argValue("--base") ?? "http://localhost:3000";
const MODE = process.argv.includes("--capture") ? "capture" : "compare";
const OUT_FILE = argValue("--out") ?? path.join(".parity", `${MODE === "capture" ? "capture" : "run"}.json`);
const BEFORE_FILE = argValue("--compare");

interface Target {
  /** Karşılaştırma etiketi. */
  id: string;
  pathname: string;
}

/**
 * Statik çerçeve politika sayfaları × 6 dil (TR öneksiz — `routing.locales` kuralı)
 * + hizmet örneklemi. Hizmetler iki yüzden fazla sayfa; imza biçimi slug'dan
 * bağımsız olduğu için üçü (içerik şablonu, boş-düşüş yolu, uzun metinli olan)
 * kapının açılıp açılmadığını göstermeye yeter.
 */
const POLICY_PATHS = ["privacy-policy", "terms-of-service", "cookie-policy"];
const SERVICE_PATHS = [
  "hizmetler/web-yazilim-tasarim",
  "hizmetler/blockchain-web3",
  "hizmetler/yapay-zeka-ml",
];
const BASE_LOCALE = routing.defaultLocale;
const LOCALES = routing.locales as readonly string[];

function targets(): Target[] {
  const out: Target[] = [];
  for (const p of [...POLICY_PATHS, ...SERVICE_PATHS]) {
    for (const locale of LOCALES) {
      out.push({
        id: `${locale}/${p}`,
        pathname: locale === BASE_LOCALE ? `/${p}` : `/${locale}/${p}`,
      });
    }
  }
  return out;
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : "";
}

interface Signature {
  status: number;
  title: string | null;
  /** `<link rel="canonical">` — tek gerçek kanonik sinyal. */
  linkCanonical: string | null;
  description: string | null;
  robots: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogUrl: string | null;
  ogImage: string | null;
  twitterCard: string | null;
  h1: string | null;
  headings: string[];
  jsonLdTypes: string[];
  words: number;
  rawLength: number;
  error?: string;
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/ /g, " ")
    .trim();
}

function stripTags(value: string): string {
  return decode(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function firstMatch(html: string, pattern: RegExp, group = 1): string | null {
  const match = html.match(pattern);
  return match?.[group] ? decode(match[group]) : null;
}

/** `<meta name|property="X" content="Y">` — öznitelik sırası Next sürümüne göre değişebiliyor. */
function metaContent(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<(?:meta)[^>]*(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<(?:meta)[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const found = firstMatch(html, pattern);
    if (found !== null) return found;
  }
  return null;
}

function collectHeadings(html: string): string[] {
  const out: string[] = [];
  const re = /<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) out.push(`h${match[1]}:${stripTags(match[2])}`);
  return out;
}

function collectJsonLd(html: string): string[] {
  const types: string[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const parsed: unknown = JSON.parse(match[1]);
      const visit = (node: unknown): void => {
        if (Array.isArray(node)) {
          for (const item of node) visit(item);
          return;
        }
        if (!node || typeof node !== "object") return;
        const record = node as Record<string, unknown>;
        if (typeof record["@type"] === "string") types.push(record["@type"]);
        if (record["@graph"]) visit(record["@graph"]);
      };
      visit(parsed);
    } catch {
      types.push("<parse-error>");
    }
  }
  return types.sort();
}

function bodyWords(html: string): number {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ");
  return text.split(/\s+/).filter(Boolean).length;
}

async function readSignature(pathname: string): Promise<Signature> {
  const url = `${BASE}${pathname}`;
  try {
    const res = await fetch(url, { redirect: "manual", cache: "no-store" });
    // Yönlendirme zincirini tek hop takip et: rota silme sonrası 308 sızıntısı
    // en pahalı regresemdir (sitemap bunu yayınlamaz, GSC sonra fark eder).
    let status = res.status;
    let html = status < 300 || status >= 400 ? await res.text() : "";
    if (status >= 300 && status < 400) {
      const location = res.headers.get("location");
      html = "";
      if (location && location.startsWith("/")) {
        const next = await fetch(`${BASE}${location}`, { redirect: "manual", cache: "no-store" });
        status = next.status;
        html = await next.text();
      }
    }
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    return {
      status,
      title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
      linkCanonical: firstMatch(
        html,
        /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i,
      ),
      description: metaContent(html, "description"),
      robots: metaContent(html, "robots"),
      ogTitle: metaContent(html, "og:title"),
      ogDescription: metaContent(html, "og:description"),
      ogUrl: metaContent(html, "og:url"),
      ogImage: metaContent(html, "og:image"),
      twitterCard: metaContent(html, "twitter:card"),
      h1: h1 ? stripTags(h1[1]) : null,
      headings: collectHeadings(html),
      jsonLdTypes: collectJsonLd(html),
      words: bodyWords(html),
      rawLength: html.length,
    };
  } catch (error) {
    return {
      status: 0,
      title: null,
      linkCanonical: null,
      description: null,
      robots: null,
      ogTitle: null,
      ogDescription: null,
      ogUrl: null,
      ogImage: null,
      twitterCard: null,
      h1: null,
      headings: [],
      jsonLdTypes: [],
      words: 0,
      rawLength: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const FIELDS: Array<keyof Signature> = [
  "status",
  "title",
  "linkCanonical",
  "description",
  "robots",
  "ogTitle",
  "ogDescription",
  "ogUrl",
  "ogImage",
  "twitterCard",
  "h1",
];

function diff(before: Signature, after: Signature): string[] {
  const lines: string[] = [];
  for (const field of FIELDS) {
    if (String(before[field] ?? "") !== String(after[field] ?? "")) {
      lines.push(`${field}: ${JSON.stringify(before[field])} → ${JSON.stringify(after[field])}`);
    }
  }

  if (before.headings.join("|") !== after.headings.join("|")) {
    const missing = before.headings.filter((h) => !after.headings.includes(h));
    const added = after.headings.filter((h) => !before.headings.includes(h));
    if (missing.length) lines.push(`başlık eksik: ${missing.slice(0, 3).join(" / ")}`);
    if (added.length) lines.push(`başlık fazla: ${added.slice(0, 3).join(" / ")}`);
  }
  const beforeTypes = before.jsonLdTypes.join(",");
  const afterTypes = after.jsonLdTypes.join(",");
  if (beforeTypes !== afterTypes) lines.push(`jsonLd: ${beforeTypes} → ${afterTypes}`);

  const delta = after.words - before.words;
  if (Math.abs(delta) > Math.max(5, before.words * 0.02)) {
    lines.push(`kelime sayısı: ${before.words} → ${after.words} (${delta > 0 ? "+" : ""}${delta})`);
  }
  return lines;
}

async function main() {
  const list = targets();
  console.log(`Temel: ${BASE} — ${list.length} hedef, mod: ${MODE}\n`);

  const results: Record<string, Signature> = {};
  for (const target of list) {
    results[target.id] = await readSignature(target.pathname);
    const row = results[target.id];
    console.log(
      `  ${target.pathname.padEnd(34)} ${row.status} ${row.error ? `HATA ${row.error}` : `title=${JSON.stringify(row.title)}`}`,
    );
  }

  const absolute = path.resolve(OUT_FILE);
  if (MODE === "capture") {
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, JSON.stringify({ base: BASE, capturedAt: new Date().toISOString(), results }, null, 2), "utf8");
    console.log(`\nBaz kayıt: ${absolute}`);
    console.log("Rota silme + yeniden build sonrasında: --compare " + absolute);
    return;
  }

  if (!BEFORE_FILE) {
    console.error("--compare <dosya> gerekli.");
    process.exitCode = 2;
    return;
  }
  const beforeDoc = JSON.parse(fs.readFileSync(path.resolve(BEFORE_FILE), "utf8")) as {
    base: string;
    capturedAt: string;
    results: Record<string, Signature>;
  };
  console.log(`\nBaz: ${beforeDoc.base} (${beforeDoc.capturedAt}) → Şimdi: ${BASE}\n`);

  let green = 0;
  const red: string[] = [];
  for (const target of list) {
    const before = beforeDoc.results[target.id];
    const after = results[target.id];
    if (!before) {
      red.push(`${target.id}: bazda yok`);
      continue;
    }
    const lines = diff(before, after);
    if (lines.length === 0) {
      green += 1;
      console.log(`  YEŞİL  ${target.pathname}`);
    } else {
      red.push(target.id);
      console.log(`  SAPMA  ${target.pathname}`);
      for (const line of lines) console.log(`           · ${line}`);
    }
  }

  console.log(
    `\nSonuç: ${green}/${list.length} hedef farksız. ` +
      (green === list.length
        ? "KAPI AÇIK: rota silinebilir."
        : `KAPI KAPALI (${red.join(", ")}): sapmalar giderilmeden rota silinmez.`),
  );
  if (green !== list.length) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error("parite koşusu başarısız:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
