import { MetadataRoute } from "next";
import { SITE_URL } from "@/config/brand.config";

export const TRACKING_QUERY_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ref",
  "source",
  "filter",
  "sort",
  "q",
  "private",
  "preview",
] as const;

const BLOCKED_BOTS = ["AhrefsBot", "SemrushBot", "DotBot", "MJ12bot", "BLEXBot"];
// Search & citation bots — fetch pages for user-requested answers and citations
export const AI_SEARCH_BOTS = [
  "GPTBot",
  "PerplexityBot",
  "OAI-SearchBot",
  "Claude-Web",
];

// Crawlers collecting data for training or large-scale datasets
export const AI_TRAINING_BOTS = [
  "CCBot",
  "Bytespider",
  "Google-Extended",
  "ClaudeBot",
  "anthropic-ai",
  "FacebookBot",
];

const BLOCKED_PATHS = [
  "/admin",
  "/api",
  "/auth",
  "/teklif",
  "/takip",
  "/odeme",
  "/login",
  "/register",
  "/x/edit",
  "/maintenance",
  ...TRACKING_QUERY_PARAMS.map((param) => `/*?${param}=`),
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: BLOCKED_PATHS,
      },
      {
        userAgent: BLOCKED_BOTS,
        disallow: "/",
      },
      {
        userAgent: AI_SEARCH_BOTS,
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      {
        userAgent: AI_TRAINING_BOTS,
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
