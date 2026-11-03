/**
 * XipSoft İç Bağlantı (Internal Linking) Motoru
 *
 * Görev:
 * 1. Anahtar Kelime Sözlüğü (Keyword Map): Hedef anahtar kelimeleri ilgili hizmet
 *    ve blog yazılarına eşler.
 * 2. In-Text Parser: Blog veya sayfa içeriklerindeki hedef kelimeleri tespit edip
 *    SEO standartlarına uygun <a> etiketine dönüştürür.
 *
 * Kurallar:
 * - Başlıklar (h1-h6), kod blokları (pre/code), mevcut linkler (a) ve görseller linklenmez.
 * - Sayfa başına aynı anahtar kelimeye en fazla 1 kez bağlantı verilir.
 * - Yazının kendi URL'sine (self-referencing) link verilmez.
 * - Toplam otomatik bağlantı sayısı sınırlandırılır (over-optimization önleme).
 */

import { servicePath } from "@/lib/content-path";

export interface KeywordLinkItem {
  keyword: string;
  url: string;
  category: "service" | "blog";
  description?: string;
}

export const INTERNAL_KEYWORD_MAP: KeywordLinkItem[] = [
  // ── Hizmetler (Pillar Landing Pages) ──────────────────────────────────────────
  // Hedefler `servicePath()` ile üretilir: kanonik uzantı politikası tek kaynakta
  // tutulsun. Eski adlar (web-yazilim-tasarim, bulut-bilisim-devops …) DB'de
  // artık yok; bunlar 1.607 yayında noindex iskelet/404 hedefi üretiyordu.
  {
    keyword: "özel web yazılım",
    url: servicePath("web-yazilim-tasarim1"),
    category: "service",
    description: "Özel Web Yazılım & Tasarım Hizmetleri",
  },
  {
    keyword: "kurumsal web tasarım",
    url: servicePath("web-yazilim-tasarim1"),
    category: "service",
  },
  {
    keyword: "web yazılım",
    url: servicePath("web-yazilim-tasarim1"),
    category: "service",
  },
  {
    keyword: "mobil uygulama geliştirme",
    url: servicePath("mobil-uygulama"),
    category: "service",
  },
  {
    keyword: "mobil uygulama",
    url: servicePath("mobil-uygulama"),
    category: "service",
  },
  {
    keyword: "siber güvenlik",
    url: servicePath("siber-guvenlik"),
    category: "service",
  },
  {
    keyword: "sızma testi",
    url: servicePath("siber-guvenlik"),
    category: "service",
  },
  {
    keyword: "teknik seo",
    url: servicePath("seo-dijital-pazarlama"),
    category: "service",
  },
  {
    keyword: "core web vitals",
    url: servicePath("seo-dijital-pazarlama"),
    category: "service",
  },
  {
    keyword: "arama motoru optimizasyonu",
    url: servicePath("seo-dijital-pazarlama"),
    category: "service",
  },
  {
    keyword: "masaüstü yazılım",
    url: servicePath("masaustu-yazilim"),
    category: "service",
  },
  {
    keyword: "yapay zeka entegrasyonu",
    url: servicePath("yapay-zeka-ml"),
    category: "service",
  },
  {
    keyword: "bulut bilişim",
    url: servicePath("bulut-bilisim"),
    category: "service",
  },
  {
    keyword: "devops",
    url: servicePath("devops-sre"),
    category: "service",
  },
  {
    keyword: "e-ticaret yazılımları",
    url: servicePath("e-ticaret-platformlari"),
    category: "service",
  },
  {
    keyword: "blokzincir geliştirme",
    url: servicePath("blockchain-web3"),
    category: "service",
  },

  // ── Teknik Terimler & Blog Rehberleri (Pillar Cluster Bağlantıları) ──────────
  {
    keyword: "mikroservis mimarisi",
    url: "/blog/mikroservis-mimarisi-distributed-systems-ve-scalability-1776392319324-729",
    category: "blog",
  },
  {
    keyword: "distributed systems",
    url: "/blog/mikroservis-mimarisi-distributed-systems-ve-scalability-1776392319324-729",
    category: "blog",
  },
  {
    keyword: "htmx",
    url: "/blog/htmx-ve-htmlin-donusu-neden-her-yerde-kullaniliyor-1776251997246-4509",
    category: "blog",
  },
  {
    keyword: "owasp top 10",
    url: "/blog/yazilim-guvenligi-owasp-top-10-guncellemesi-2026-surumu-1776200570209-994",
    category: "blog",
  },
  {
    keyword: "yazılım güvenliği",
    url: "/blog/yazilim-guvenligi-owasp-top-10-guncellemesi-2026-surumu-1776200570209-994",
    category: "blog",
  },
  {
    keyword: "test otomasyonu",
    url: "/blog/software-testing-automated-testing-ve-quality-assurance-1776391075100-1010",
    category: "blog",
  },
  {
    keyword: "quality assurance",
    url: "/blog/software-testing-automated-testing-ve-quality-assurance-1776391075100-1010",
    category: "blog",
  },
  {
    keyword: "tehdit istihbaratı",
    url: "/blog/cybersecurity-defense-threat-intelligence-ve-incident-response-1776391077195-6195",
    category: "blog",
  },
  {
    keyword: "incident response",
    url: "/blog/cybersecurity-defense-threat-intelligence-ve-incident-response-1776391077195-6195",
    category: "blog",
  },
  {
    keyword: "uluslararası seo",
    url: "/blog/uluslararasi-seo-cok-dilli-ve-cok-ulke-stratejileri-1776388868840-8109",
    category: "blog",
  },
  {
    keyword: "çok dilli seo",
    url: "/blog/uluslararasi-seo-cok-dilli-ve-cok-ulke-stratejileri-1776388868840-8109",
    category: "blog",
  },
  {
    keyword: "threat hunting",
    url: "/blog/cybersecurity-operations-soc-ve-threat-hunting-1776391078593-5991",
    category: "blog",
  },
  {
    keyword: "edge ai",
    url: "/blog/mobile-technologies-5g-ve-edge-ai-integration-1776391079012-7628",
    category: "blog",
  },
  {
    keyword: "smart contracts",
    url: "/blog/blockchain-technology-smart-contracts-ve-decentralized-applications-1776391074681-5128",
    category: "blog",
  },
  {
    keyword: "yazılım mimarisi",
    url: "/blog/software-architecture-patterns-scalable-systems-tasarimi-1776390233729-76",
    category: "blog",
  },
];

interface InjectOptions {
  currentSlug?: string;
  maxLinks?: number;
  customMap?: KeywordLinkItem[];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Uzun ifadeler önce eşleşsin ("özel web yazılım" > "web yazılım"). */
function byKeywordLengthDesc(list: KeywordLinkItem[]): KeywordLinkItem[] {
  return [...list].sort((a, b) => b.keyword.length - a.keyword.length);
}

const SORTED_INTERNAL_KEYWORDS = byKeywordLengthDesc(INTERNAL_KEYWORD_MAP);

// Kelime başına bir kez derlenir; her enjekte çağrısında regex kurma maliyeti
// kaldırıldı (REFACTOR.md §9.1 Adım 4 / P3).
const linkPatternCache = new Map<string, RegExp>();

function getLinkPattern(keyword: string): RegExp {
  const cached = linkPatternCache.get(keyword);
  if (cached) return cached;

  // Türkçe karakter ve kelime sınırlarına uyumlu regex
  const pattern = new RegExp(
    `(?<=^|[\\s.,!?;:()"\\[\\]])(${escapeRegex(keyword)})(?=[\\s.,!?;:()"\\[\\]]|$)`,
    "i",
  );
  linkPatternCache.set(keyword, pattern);
  return pattern;
}

/**
 * Verilen HTML metni içerisindeki anahtar kelimeleri tespit edip
 * SEO standartlarına uygun iç bağlantılar (internal links) enjekte eder.
 */
export function injectInternalLinks(
  html: string,
  options: InjectOptions = {}
): string {
  if (!html || typeof html !== "string") return html;

  const currentSlug = (options.currentSlug || "").trim();
  const maxLinks = options.maxLinks ?? 5;
  const keywordList = options.customMap
    ? byKeywordLengthDesc(options.customMap)
    : SORTED_INTERNAL_KEYWORDS;

  // Kendi sayfasına link vermemesi için filtrele
  const validKeywords = keywordList.filter((item) => {
    if (!currentSlug) return true;
    const cleanUrl = item.url.replace(/^\/+/, "");
    return !cleanUrl.endsWith(currentSlug) && !cleanUrl.includes(`/${currentSlug}`);
  });

  if (validKeywords.length === 0) return html;

  // HTML tag'lerini korumak için token'lara böl (a, h1-h6, pre, code, script, style, img, svg hariç tutulur)
  // Protected tags: bu tag'ler ve içerikleri tamamen pas geçilir.
  const protectedTagRegex = /<(a|h[1-6]|pre|code|script|style|button|input|figure|svg)[\s\S]*?<\/\1>|<(img|input|hr|br)[^>]*\/?>/gi;

  const tokens: Array<{ isProtected: boolean; text: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = protectedTagRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ isProtected: false, text: html.slice(lastIndex, match.index) });
    }
    tokens.push({ isProtected: true, text: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < html.length) {
    tokens.push({ isProtected: false, text: html.slice(lastIndex) });
  }

  let totalInjected = 0;
  const linkedKeywords = new Set<string>();
  const linkedUrls = new Set<string>();

  const processedTokens = tokens.map((token) => {
    if (token.isProtected || totalInjected >= maxLinks) {
      return token.text;
    }

    let tokenText = token.text;

    for (const item of validKeywords) {
      if (totalInjected >= maxLinks) break;
      if (linkedKeywords.has(item.keyword) || linkedUrls.has(item.url)) continue;

      const m = getLinkPattern(item.keyword).exec(tokenText);
      if (m && m.index !== undefined) {
        const matchedText = m[1];
        const replacement = `<a href="${item.url}" class="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4 transition-colors" title="${item.description || matchedText}">${matchedText}</a>`;

        // Yalnızca İLK eşleşmeyi değiştir
        tokenText =
          tokenText.slice(0, m.index) +
          replacement +
          tokenText.slice(m.index + matchedText.length);

        linkedKeywords.add(item.keyword);
        linkedUrls.add(item.url);
        totalInjected++;
      }
    }

    return tokenText;
  });

  return processedTokens.join("");
}
