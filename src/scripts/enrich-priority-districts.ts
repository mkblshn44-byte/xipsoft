/**
 * ─────────────────────────────────────────────────────────────────────────────
 * enrich-priority-districts.ts — ÖNCELİKLİ İL / İLÇE SAYFALARI İÇİN SEED SCRIPT'İ
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * AMAÇ
 *   `src/scripts/data/priority-{district,province}-{profiles,extras}.ts` içindeki
 *   ELLE YAZILMIŞ özgün içeriği, tek gerçek kaynak olan `pages` tablosuna
 *   UPSERT eder. Böylece:
 *     • İçerik VERİTABANINDA yaşar; frontend (`/hizmetler/[hizmet]/[konum]`)
 *       zaten `getPublishedPageBySlug()` ile DB'den okur (kodda ilçe metni YOK).
 *     • `data/*.ts` dosyaları runtime bağımlılığı değil, yalnızca İLK YÜKLEME
 *       (seed) aracıdır. Yeni ilçe eklemek = diziye kayıt ekleyip bu script'i
 *       çalıştırmak; kod/rota değişikliği gerekmez.
 *
 * NASIL ÇALIŞIR
 *   Yazma, kanonik ingest çekirdeği `pageIngestCore` üzerinden yapılır; böylece
 *   slug çözümü, doğrulama ve `ON CONFLICT (service_id, location_id)` UPSERT
 *   mantığı tek yerde (admin + /api/content ile aynı) kalır. `{ revalidate:false }`
 *   ile Next.js request bağlamı dışında olduğumuz için cache çağrıları atlanır;
 *   yazma bittikten SONRA cache, `/api/revalidate/locations` uç noktasıyla
 *   tazelenir (bkz. o rotanın "bulk içerik zenginleştirme script'i" notu).
 *
 * KULLANIM
 *   npm run seo:enrich-districts              # DRY-RUN (varsayılan): doğrular + önizler
 *   npm run seo:enrich-districts -- --apply   # DB'ye yazar + cache tazeler
 *   npm run seo:enrich-districts -- --apply --force   # kalite uyarılarına rağmen yaz
 *
 * ORTAM
 *   DATABASE_URL       (zorunlu) — pages/services/locations'ın bulunduğu NeonDB
 *   SEO_CONTENT_API_URL, BOT_API_KEY (opsiyonel) — yazma sonrası cache tazeleme
 */

import { pageIngestCore } from "@/lib/content/handlers/page";
import {
  PRIORITY_DISTRICT_KEYS,
  TOP_PRIORITY_PROVINCES,
} from "@/config/priority-locations";
import {
  PRIORITY_DISTRICT_PROFILES,
  type PriorityDistrictProfile,
} from "./data/priority-district-profiles";
import {
  PRIORITY_DISTRICT_EXTRAS,
  type DistrictExtra,
} from "./data/priority-district-extras";
import {
  PRIORITY_PROVINCE_PROFILES,
  type PriorityProvinceProfile,
} from "./data/priority-province-profiles";
import {
  PRIORITY_PROVINCE_EXTRAS,
  type ProvinceExtra,
} from "./data/priority-province-extras";

/** Zenginleştirme yapılan hizmet — pilot kapsam (SEO-AKSIYON-PLANI.md). */
const SERVICE_SLUG = "web-yazilim-tasarim";
const STATUS = "published";
const SOURCE_TYPE = "manual";

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

/** SEO-AKSIYON-PLANI ile uyumlu kelime/SSS hedefleri (uyarı amaçlı). */
const WORD_TARGET = {
  district: { min: 300, max: 400 },
  province: { min: 500, max: 600 },
} as const;
const FAQ_MIN = { district: 3, province: 4 } as const;

interface LocalFaq {
  question: string;
  answer: string;
}

interface SeedPage {
  kind: "district" | "province";
  /** Log/özet için okunur etiket (ör. "İstanbul/Ataşehir"). */
  label: string;
  /** Üst il slug'ı yalnızca ilçeler için (slug çakışmasını çözer). */
  province?: string;
  /** `locations.slug` (ilçe için düz ilçe slug'ı, ör. "atasehir"). */
  location: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  ozelMetaDesc: string;
  /** Hero altındaki özgün giriş paneli (PageTemplate `lokal_aciklama`). */
  lokalAciklama: string;
  /** Gövde markdown'ı (`pages.markdown_content`). Intro burada TEKRARLANMAZ. */
  markdown: string;
  /** Sayfaya özel SSS (`pages.lokal_sss`). */
  lokalSss: LocalFaq[];
}

function cloneFaq(faq: { question: string; answer: string }): LocalFaq {
  return { question: faq.question.trim(), answer: faq.answer.trim() };
}

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item.trim()}`).join("\n");
}

/**
 * İlçe gövdesi: ihtiyaç paragrafı → ek paragraf → öne çıkan çözümler →
 * sektör notları → yakın bölgeler → kapanış. (Intro `lokal_aciklama`'da.)
 */
function buildDistrictMarkdown(
  profile: PriorityDistrictProfile,
  extra?: DistrictExtra,
): string {
  const blocks: string[] = [profile.needParagraph.trim()];
  if (extra?.paragraph) blocks.push(extra.paragraph.trim());
  blocks.push(
    `### ${profile.locative} Öne Çıkan Çözümler\n\n${bulletList(profile.focusBullets)}`,
  );
  blocks.push(
    `### ${profile.locative} Sektör Notları\n\n${bulletList(profile.sectorNotes)}`,
  );
  if (profile.areas.length > 0) {
    blocks.push(
      `### Hizmet Verdiğimiz Yakın Bölgeler\n\n${profile.areas.join(", ")}.`,
    );
  }
  blocks.push(profile.closing.trim());
  return blocks.filter(Boolean).join("\n\n");
}

/**
 * İl gövdesi: ekonomi paragrafı → ek paragraflar → öne çıkan çözümler →
 * sektör notları → çalışma biçimi → pilot ilçe iç bağlantıları → kapanış.
 */
function buildProvinceMarkdown(
  profile: PriorityProvinceProfile,
  extra?: ProvinceExtra,
): string {
  const blocks: string[] = [profile.economyParagraph.trim()];
  if (extra?.paragraphs?.length) {
    blocks.push(...extra.paragraphs.map((p) => p.trim()));
  }
  blocks.push(
    `### ${profile.locative} Öne Çıkan Çözümler\n\n${bulletList(profile.focusBullets)}`,
  );
  blocks.push(
    `### ${profile.locative} Sektör Notları\n\n${bulletList(profile.sectorNotes)}`,
  );
  blocks.push(`### Çalışma Biçimimiz\n\n${profile.serviceApproach.trim()}`);
  if (profile.keyDistricts.length > 0) {
    const links = profile.keyDistricts
      .map((d) => `- [${d.name}](/hizmetler/${SERVICE_SLUG}/${d.slug})`)
      .join("\n");
    blocks.push(
      `### ${profile.locative} Hizmet Verdiğimiz İlçeler\n\n${links}`,
    );
  }
  blocks.push(profile.closing.trim());
  return blocks.filter(Boolean).join("\n\n");
}

/** Profil + ekstra verisini birleştirip yazıma hazır sayfa listesi üretir. */
function buildSeedPages(): SeedPage[] {
  const pages: SeedPage[] = [];

  for (const profile of PRIORITY_DISTRICT_PROFILES) {
    const key = `${profile.provinceSlug}/${profile.districtSlug}`;
    const extra = PRIORITY_DISTRICT_EXTRAS[key];
    const lokalSss = profile.faqs.map(cloneFaq);
    if (extra?.faq) lokalSss.push(cloneFaq(extra.faq));

    pages.push({
      kind: "district",
      label: `${profile.provinceName}/${profile.districtName}`,
      province: profile.provinceSlug,
      location: profile.districtSlug,
      title: profile.title,
      metaTitle: profile.metaTitle,
      metaDescription: profile.metaDescription,
      ozelMetaDesc: profile.ozelMetaDesc,
      lokalAciklama: profile.intro,
      markdown: buildDistrictMarkdown(profile, extra),
      lokalSss,
    });
  }

  for (const profile of PRIORITY_PROVINCE_PROFILES) {
    const extra = PRIORITY_PROVINCE_EXTRAS[profile.provinceSlug];
    const lokalSss = profile.faqs.map(cloneFaq);
    if (extra?.faqs?.length) lokalSss.push(...extra.faqs.map(cloneFaq));

    pages.push({
      kind: "province",
      label: profile.provinceName,
      location: profile.provinceSlug,
      title: profile.title,
      metaTitle: profile.metaTitle,
      metaDescription: profile.metaDescription,
      ozelMetaDesc: profile.ozelMetaDesc,
      lokalAciklama: profile.intro,
      markdown: buildProvinceMarkdown(profile, extra),
      lokalSss,
    });
  }

  return pages;
}

/** `publish-local-seo-content.ts` ile aynı kelime sayımı. */
function wordCount(text: string): number {
  return text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}

interface Audit {
  words: number;
  faqs: number;
  warnings: string[];
  blocking: string[];
}

function auditPage(page: SeedPage, duplicateLabels: Set<string>): Audit {
  const warnings: string[] = [];
  const blocking: string[] = [];
  const words = wordCount(page.markdown);
  const faqs = page.lokalSss.length;
  const target = WORD_TARGET[page.kind];

  if (words < target.min || words > target.max) {
    warnings.push(`markdown ${words} kelime (hedef ${target.min}–${target.max})`);
  }
  if (faqs < FAQ_MIN[page.kind]) {
    warnings.push(`SSS ${faqs} adet (min ${FAQ_MIN[page.kind]})`);
  }
  if (page.lokalSss.some((f) => f.question.length > 300 || f.answer.length > 3000)) {
    blocking.push("SSS question>300 veya answer>3000 karakter");
  }
  if (!page.markdown.trim() || !page.title.trim() || !page.metaTitle.trim()) {
    blocking.push("boş başlık/markdown/metaTitle");
  }
  if (duplicateLabels.has(page.label)) {
    blocking.push(`yinelenen etiket: ${page.label}`);
  }
  if (page.kind === "district" && !PRIORITY_DISTRICT_KEYS.has(`${page.province}/${page.location}`)) {
    warnings.push(`allowlist'te yok: ${page.province}/${page.location}`);
  }
  if (page.kind === "province" && !TOP_PRIORITY_PROVINCES.has(page.location)) {
    warnings.push(`öncelikli il listesinde yok: ${page.location}`);
  }

  return { words, faqs, warnings, blocking };
}

function printReport(pages: SeedPage[], audits: Audit[]): void {
  const districts = audits.filter((_, i) => pages[i].kind === "district").length;
  const provinces = audits.length - districts;
  const minWords = Math.min(...audits.map((a) => a.words));
  const maxWords = Math.max(...audits.map((a) => a.words));
  const minFaqs = Math.min(...audits.map((a) => a.faqs));
  const maxFaqs = Math.max(...audits.map((a) => a.faqs));

  console.log("");
  console.log("┌─ Enrich kapsamı ────────────────────────────────────────────");
  console.log(`│ Hizmet      : ${SERVICE_SLUG}`);
  console.log(`│ Toplam sayfa: ${pages.length} (${districts} ilçe, ${provinces} il)`);
  console.log(`│ Kelime      : ${minWords}–${maxWords}`);
  console.log(`│ SSS         : ${minFaqs}–${maxFaqs} adet/sayfa`);
  console.log("└─────────────────────────────────────────────────────────────");

  const warned = pages
    .map((page, i) => ({ page, audit: audits[i] }))
    .filter(({ audit }) => audit.warnings.length > 0 || audit.blocking.length > 0);

  if (warned.length === 0) {
    console.log("✓ Tüm sayfalar hedef aralıkta, engelleyici sorun yok.");
  } else {
    console.log("");
    console.log(`⚠ ${warned.length}/${pages.length} sayfada uyarı/engel:`);
    for (const { page, audit } of warned) {
      const parts = [...audit.blocking.map((b) => `ENGEL: ${b}`), ...audit.warnings];
      console.log(`  • ${page.label} — ${parts.join("; ")}`);
    }
  }
}

async function applyPages(pages: SeedPage[]): Promise<number> {
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const page of pages) {
    const { status, payload } = await pageIngestCore(
      {
        service: SERVICE_SLUG,
        location: page.location,
        ...(page.province ? { province: page.province } : {}),
        title: page.title,
        content: page.markdown,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        lokalAciklama: page.lokalAciklama,
        ozelMetaDesc: page.ozelMetaDesc,
        lokalSss: page.lokalSss,
        status: STATUS,
        sourceType: SOURCE_TYPE,
      },
      { revalidate: false },
    );

    if (status >= 200 && status < 300 && payload.success === true) {
      if (payload.created === true) created++;
      else updated++;
      console.log(`  ✓ ${page.label} → /hizmetler/${payload.slug}`);
    } else {
      failed++;
      console.error(`  ✗ ${page.label}: ${status} ${payload.error ?? ""} ${payload.message ?? ""}`);
    }
  }

  console.log("");
  console.log(`Yazma özeti: ${created} oluşturuldu, ${updated} güncellendi, ${failed} hata.`);
  return failed;
}

/** Yazma sonrası ISR/sitemap cache'ini tazele (best-effort). */
async function revalidateLocations(): Promise<void> {
  const base = process.env.SEO_CONTENT_API_URL?.trim();
  const key = process.env.BOT_API_KEY?.trim();
  if (!base || !key) {
    console.log(
      "ℹ Cache tazeleme atlandı (SEO_CONTENT_API_URL / BOT_API_KEY tanımlı değil). " +
        "Elle: POST /api/revalidate/locations",
    );
    return;
  }
  try {
    const origin = new URL(base).origin;
    const res = await fetch(`${origin}/api/revalidate/locations`, {
      method: "POST",
      headers: { "X-Bot-Key": key },
    });
    console.log(
      res.ok
        ? "✓ Cache tazeleme isteği gönderildi (local-pages, sitemap)."
        : `✗ Cache tazeleme başarısız: HTTP ${res.status}`,
    );
  } catch (err) {
    console.warn(
      `⚠ Cache tazeleme isteği başarısız: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function main(): Promise<void> {
  const pages = buildSeedPages();
  const duplicateLabels = new Set<string>();
  const seen = new Set<string>();
  for (const page of pages) {
    const key = `${page.kind}:${page.label}`;
    if (seen.has(key)) duplicateLabels.add(page.label);
    seen.add(key);
  }

  const audits = pages.map((page) => auditPage(page, duplicateLabels));
  printReport(pages, audits);

  const blocking = pages
    .map((page, i) => ({ page, audit: audits[i] }))
    .filter(({ audit }) => audit.blocking.length > 0);

  if (!APPLY) {
    console.log("");
    console.log("─ Önizleme (ilk kayıt) ───────────────────────────────────────");
    const first = pages[0];
    console.log(`Başlık   : ${first.title}`);
    console.log(`Meta     : ${first.metaTitle}`);
    console.log(`Giriş    : ${first.lokalAciklama.slice(0, 160)}…`);
    console.log("");
    console.log(first.markdown.slice(0, 900));
    console.log("──────────────────────────────────────────────────────────────");
    console.log("");
    console.log("DRY-RUN: hiçbir şey yazılmadı.");
    console.log("Yazmak için: npm run seo:enrich-districts -- --apply");
    return;
  }

  if (blocking.length > 0 && !FORCE) {
    console.error("");
    console.error(`✗ ${blocking.length} sayfada engelleyici sorun var. Yazma iptal edildi.`);
    console.error("  Düzeltin veya bilinçli geçmek için --force ekleyin.");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log(`▶ ${pages.length} sayfa DB'ye yazılıyor (UPSERT, ${STATUS}/${SOURCE_TYPE})…`);
  const failed = await applyPages(pages);

  if (failed === 0) {
    await revalidateLocations();
  } else {
    console.warn("⚠ Bazı kayıtlar başarısız; cache tazeleme atlandı. Hataları giderip tekrar çalıştırın.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Beklenmeyen hata:", err instanceof Error ? err.stack ?? err.message : err);
  process.exitCode = 1;
});
