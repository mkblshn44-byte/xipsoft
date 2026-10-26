"use client";
/**
 * TechMarquee — "Teknolojiler & Uzmanlıklar" bölümü: kartların sitenin
 * sağından soluna doğru sonsuz aktığı tam genişlikte (full-bleed) şerit.
 *
 * Veri: `services.tech_stack` + `services.services_tag` (JSONB, `{name,color}`).
 * Kodda sabit teknoloik listesi YOK — içerik admin panelinden gelir (Aşama 5).
 *
 * Animasyon saf CSS (`animate-tech-marquee`): JS kuyruğu/timer yok, bu yüzden
 * ana thread'i bloke etmez ve içerik JS kapalıyken de akar. Track iki kez
 * basılır ve `-50%` kaydırılır → dikişsiz döngü.
 *
 * Erişilebilirlik: `prefers-reduced-motion` açıkken akış durur, şerit sarılı
 * (flex-wrap) statik ızgaraya döner ve kopya gizlenir — aynı içerik, sıfır hareket.
 */
import XipIcon from "@/components/Ui/Icon";
import {
  SiAndroid, SiApple, SiApache, SiApacheairflow, SiAstro, SiBootstrap,
  SiBurpsuite, SiCheckmarx, SiCloudflare, SiCypress, SiDatadog, SiDjango,
  SiDocker, SiDotnet, SiDrizzle, SiElasticsearch, SiElectron, SiEthereum,
  SiExpo, SiExpress, SiFigma, SiFirebase, SiFlask, SiGatsby, SiGit, SiGithubactions,
  SiGo, SiGoogleanalytics, SiGooglecloud, SiGooglesearchconsole,
  SiGoogletagmanager, SiGrafana, SiGraphql, SiHtml5, SiHuggingface, SiIpfs,
  SiJenkins, SiJest, SiJavascript, SiKalilinux, SiKeras, SiKibana, SiKotlin,
  SiKubernetes, SiLangchain, SiLaravel, SiLighthouse, SiLinux, SiMacos,
  SiMetabase, SiMetasploit, SiMongodb, SiNestjs, SiNetlify, SiNextdotjs,
  SiNginx, SiNumpy, SiOllama, SiOpencv, SiOwasp, SiPandas, SiPostgresql,
  SiPrisma, SiPrometheus, SiPuppeteer, SiPytorch, SiPython, SiQt, SiQualys,
  SiReact, SiRedis, SiRemix, SiRust, SiSass, SiScikitlearn, SiSelenium,
  SiSemrush, SiSentry, SiShopify, SiSnyk, SiSolana, SiSolidity, SiStorybook,
  SiStripe, SiSupabase, SiSvelte, SiSwift, SiTailwindcss, SiTauri,
  SiTensorflow, SiTerraform, SiTypescript, SiVercel, SiVuedotjs, SiVite,
  SiWebpack, SiWireshark, SiAngular, SiCss,
} from "react-icons/si";
import type { IconType } from "react-icons";

export interface TechMarqueeItem {
  name: string;
  color: string;
  /** `tech` = tech_stack, `expertise` = services_tag (rozet etiketi bundan türer). */
  group: "tech" | "expertise";
}

// ── İkon seçimi: addaki anahtar kelimeye göre ────────────────────────────────
// XipSoft özel ikon seti kullanılır (`ServicePageClient` ile aynı aile, fakat
// içe aktarma döngüsü olmasın diye burada bağımsız tanımlı). Eşleşme yoksa
// "Globe"a düşer — uydurma ikon üretilmez.
const TECH_ICON_RULES: Array<[RegExp, string]> = [
  [/search console|arama konsolu/i, "Search"],
  [/analytics|analitik|semrush|ahrefs|metric|ölçüm/i, "BarChart2"],
  [/pagespeed|page speed|lighthouse|speed|h[ıi]z|performans/i, "Zap"],
  [/schema|json-ld|structured|yap[ıi]land[ıi]r[ıi]lm/i, "Code2"],
  [/indexnow|index|backlink|link/i, "Link2"],
  [/frog|crawl|tara|audit|denetim/i, "Filter"],
  [/security|g[üu]venlik|owasp|firewall|pentest|waf/i, "Shield"],
  [/postgres|mysql|database|veritaban|redis|\bsql\b|mongo/i, "Database"],
  [/cloud|bulut|vercel|\baws\b|docker|kubernetes|devops|server/i, "Cloud"],
  [/\bai\b|yapay zeka|\bml\b|\bgpt\b|bot/i, "Brain"],
  [/react|next\.?js|typescript|javascript|tailwind|vue|angular|web/i, "Code"],
  [/mobile|mobil|\bapp\b|ios|android|flutter/i, "Smartphone"],
  [/local|yerel|haritalama|maps|\bseo\b/i, "MapPin"],
  [/design|tasar[ıi]m|palette|figma|\bui\b|\bux\b/i, "Palette"],
  [/e-?ticaret|ecommerce|ticaret|package|paket/i, "Package"],
  [/monitor|masa[üu]st[üu]|desktop|\bpc\b/i, "Monitor"],
  [/users|ekip|team|dan[ıi][sş]man|consult/i, "Users"],
  [/workflow|s[üu]re[çc]|process|automation|otomasyon/i, "Workflow"],
];

function pickTechIcon(name: string): string {
  return TECH_ICON_RULES.find(([pattern]) => pattern.test(name))?.[1] ?? "Globe";
}

// ── Marka logoları: Simple Icons (`react-icons/si`) ──────────────────────────
// Basit Icons seti MONOKROM (`fill="currentColor"`), kartın DB'den gelen rengi
// logoya otomatik uygulanır. Sıra ÖNEMLİ: en spesifik desen önce gelmeli
// ("github actions" → SiGithubactions, sonra gelen /\bgit\b/ onu yutmasın).
// Bu listede olmayan bir ad jenerik lucide ikonuna düşer — uydurma logo yok.
const BRAND_LOGO_RULES: Array<[RegExp, IconType]> = [
  // DevOps & altyapı (özel → genel sıra: "github actions" → "git", "apache airflow" → "apache")
  [/github\s*actions/i, SiGithubactions],
  [/\bgit\b(?!hub)/i, SiGit],
  [/airflow/i, SiApacheairflow],
  [/\bapache\b/i, SiApache],
  [/\bkali\b/i, SiKalilinux],
  [/\blinux\b/i, SiLinux],
  [/\bmac\s*os\b/i, SiMacos],
  [/\bios\b|apple/i, SiApple],
  [/android/i, SiAndroid],
  [/\bswift\b/i, SiSwift],
  [/kotlin/i, SiKotlin],
  [/\bnest\.?js\b/i, SiNestjs],
  [/\bnginx\b/i, SiNginx],
  [/jenkins/i, SiJenkins],
  [/docker/i, SiDocker],
  [/kubernetes|\bk8s\b/i, SiKubernetes],
  [/terraform/i, SiTerraform],
  [/datadog/i, SiDatadog],
  [/sentry/i, SiSentry],
  [/grafana/i, SiGrafana],
  [/prometheus/i, SiPrometheus],
  [/metabase/i, SiMetabase],

  // Web / frontend ("tailwind" → "css"den ÖNCE gelmeli: "Tailwind CSS" ikisini de içerir)
  [/next\.?js/i, SiNextdotjs],
  [/react/i, SiReact],
  [/expo/i, SiExpo],
  [/tailwind/i, SiTailwindcss],
  [/typescript/i, SiTypescript],
  [/javascript/i, SiJavascript],
  [/\bhtml/i, SiHtml5],
  [/\bcss\b(?! ?modules)/i, SiCss],
  [/\bsass\b|\bscss\b/i, SiSass],
  [/bootstrap/i, SiBootstrap],
  [/vue/i, SiVuedotjs],
  [/angular/i, SiAngular],
  [/svelte/i, SiSvelte],
  [/\bastro\b/i, SiAstro],
  [/gatsby/i, SiGatsby],
  [/\bremix\b/i, SiRemix],
  [/express/i, SiExpress],
  [/graphql/i, SiGraphql],
  [/\bvite\b(?!press)/i, SiVite],
  [/webpack/i, SiWebpack],
  [/storybook/i, SiStorybook],

  // Backend / masaüstü
  [/django/i, SiDjango],
  [/flask/i, SiFlask],
  [/laravel/i, SiLaravel],
  [/\.net|\bdot\s?net\b|\bwpf\b|blazor/i, SiDotnet],
  [/\brust\b/i, SiRust],
  [/\bqt\b/i, SiQt],
  [/electron/i, SiElectron],
  [/tauri/i, SiTauri],

  // Veri
  [/postgres/i, SiPostgresql],
  [/mongo/i, SiMongodb],
  [/redis/i, SiRedis],
  [/kibana|logstash/i, SiKibana],
  [/elasticsearch|\belastic\b/i, SiElasticsearch],
  [/supabase/i, SiSupabase],
  [/prisma/i, SiPrisma],
  [/drizzle/i, SiDrizzle],

  // Bulut & hosting
  [/vercel/i, SiVercel],
  [/netlify/i, SiNetlify],
  [/cloudflare/i, SiCloudflare],
  [/firebase/i, SiFirebase],
  [/google\s*cloud|\bgcp\b/i, SiGooglecloud],

  // Diller
  [/python/i, SiPython],
  [/\bgolang\b|\bgo\b/i, SiGo],

  // Test / kalite
  [/jest/i, SiJest],
  [/cypress/i, SiCypress],
  [/selenium/i, SiSelenium],
  [/puppeteer/i, SiPuppeteer],

  // AI / veri bilimi
  [/opencv/i, SiOpencv],
  [/scikit/i, SiScikitlearn],
  [/keras/i, SiKeras],
  [/pytorch/i, SiPytorch],
  [/tensorflow/i, SiTensorflow],
  [/numpy/i, SiNumpy],
  [/pandas/i, SiPandas],
  [/hugging\s*face/i, SiHuggingface],
  [/langchain/i, SiLangchain],
  [/ollama/i, SiOllama],

  // Web3
  [/solidity/i, SiSolidity],
  [/solana/i, SiSolana],
  [/ethereum/i, SiEthereum],
  [/ipfs/i, SiIpfs],

  // Ödeme / ticaret
  [/stripe/i, SiStripe],
  [/shopify/i, SiShopify],

  // Güvenlik
  [/burp/i, SiBurpsuite],
  [/metasploit/i, SiMetasploit],
  [/\bqualys\b/i, SiQualys],
  [/\bsnyk\b/i, SiSnyk],
  [/checkmarx/i, SiCheckmarx],
  [/owasp/i, SiOwasp],
  [/wireshark/i, SiWireshark],

  // SEO / analitik
  [/search console/i, SiGooglesearchconsole],
  [/tag manager/i, SiGoogletagmanager],
  [/analytics/i, SiGoogleanalytics],
  [/pagespeed|lighthouse/i, SiLighthouse],
  [/ahrefs|semrush/i, SiSemrush],

  // Tasarım
  [/figma/i, SiFigma],
];

function pickBrandLogo(name: string): IconType | null {
  return BRAND_LOGO_RULES.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}

/**
 * Rozet için addaki sürüm kuyruğu ayrılır: "Next.js 15" → başlık "Next.js" +
 * rozet "15". Sürüm yoksa rozet grup etiketini gösterir (uydurma veri üretilmez).
 */
const TRAILING_VERSION = /\s+(\d[\d.x]*(?:\s*LTS)?)$/i;

function splitTechLabel(item: TechMarqueeItem): { title: string; badge: string } {
  const match = TRAILING_VERSION.exec(item.name);
  if (match?.index) {
    return {
      title: item.name.slice(0, match.index).trim(),
      badge: match[1].trim(),
    };
  }
  return {
    title: item.name.trim(),
    badge: item.group === "tech" ? "Teknoloji" : "Uzmanlık",
  };
}

/**
 * Koyu temada kaybolan renkleri (#000000 "Vercel Edge" gibi) nötr tona çevirir;
 * aksi halde kartın ikonu ve rozeti arka planla aynı tonda kalıyor.
 */
const NEUTRAL_COLOR = "#94a3b8";

function readableColor(hex: string): string {
  const value = /^#?([\da-f]{6})$/i.exec(hex.trim())?.[1];
  if (!value) return hex || NEUTRAL_COLOR;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.22 ? NEUTRAL_COLOR : hex;
}

function TechCard({ item }: { item: TechMarqueeItem }) {
  const color = readableColor(item.color);
  const Logo = pickBrandLogo(item.name);
  const techIcon = pickTechIcon(item.name);
  const { title, badge } = splitTechLabel(item);

  return (
    <article
      className="flex w-[190px] shrink-0 flex-col items-center gap-3 rounded-2xl px-4 py-5 text-center transition-transform duration-300 hover:-translate-y-1"
      style={{
        background: `${color}0a`,
        border: `1px solid ${color}26`,
        boxShadow: `0 0 26px ${color}12`,
      }}
    >
      <span
        aria-hidden="true"
        className="grid h-11 w-11 place-items-center rounded-xl"
        style={{ background: `${color}14`, color }}
      >
        {Logo ? <Logo size={26} /> : <XipIcon name={techIcon} size={22} />}
      </span>
      <span className="text-sm font-semibold leading-snug text-zinc-100">{title}</span>
      <span
        className="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
        style={{ background: `${color}12`, border: `1px solid ${color}2e`, color }}
      >
        {badge}
      </span>
    </article>
  );
}

export default function TechMarquee({ items }: { items: TechMarqueeItem[] }) {
  if (items.length === 0) return null;

  // Hız sabit kalsın: kart başına ~4,5 sn, en yavaş 28 sn.
  const durationSeconds = Math.max(28, items.length * 4.5);

  return (
    /* max-w-6xl kapsayıcıdan taşarak tam genişlik (sitenin bir kenarından diğerine).
       `ml-[50%]` üst kutunun, `-translate-x-1/2` kendi genişliğinin yarısıdır →
       şerit viewport'a ortalanır. Gövdedeki `overflow-x:hidden` 100vw taşmasını
       yatay kaydırma çubuğuna dönüştürmez. */
    <div className="group relative ml-[50%] w-screen -translate-x-1/2 overflow-hidden">
      {/* Mobilde (globals.scss:574) `* { animation: none !important }` tüm animasyonları
          söndürür → akış durur ve taşan kartlar erişilmez kalırdı. Bu yüzden ≤768px'te
          (ve prefers-reduced-motion'da) şerit sarılı statik ızgaraya döner. */}
      <div
        className="flex w-max animate-tech-marquee gap-4 py-2 group-hover:[animation-play-state:paused] max-md:w-full max-md:flex-wrap max-md:justify-center motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:animate-none motion-reduce:justify-center"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {[false, true].map((isEcho) => (
          /* Kopya şerit yalnızca akış için: ekran okuyucu içeriği bir kez duyar,
             akışın kapalı olduğu (mobil / reduced-motion) hallerde gizlenir. */
          <div
            key={isEcho ? "echo" : "primary"}
            className="flex shrink-0 gap-4 pr-4 max-md:hidden motion-reduce:hidden"
            aria-hidden={isEcho || undefined}
          >
            {items.map((item) => (
              <TechCard key={`${isEcho ? "echo" : "base"}-${item.group}-${item.name}`} item={item} />
            ))}
          </div>
        ))}
      </div>

      {/* Kenar solmaları: mask-image yerine gradyan katman (Safari prefix derdi yok).
          Sarılı modda kenarlar içerik kestiği için kaldırılır. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 max-md:hidden"
        style={{ background: "linear-gradient(90deg, #050811 0%, rgba(5, 8, 17,0) 100%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 max-md:hidden"
        style={{ background: "linear-gradient(270deg, #050811 0%, rgba(5, 8, 17,0) 100%)" }}
      />
    </div>
  );
}
