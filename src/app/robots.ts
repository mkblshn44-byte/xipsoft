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

const BLOCKED_BOTS = ["AhrefsBot", "SemrushBot", "DotBot", "MJ12bot", "BLEXBot"] as const;
const AI_BOTS = [
  "GPTBot",
  "CCBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "FacebookBot",
  "Bytespider",
] as const;

const BLOCKED_PATHS = [
  "/admin",
  "/api",
  "/auth",
  "/teklif",
  "/odeme",
  "/login",
  "/register",
  "/x/edit",
  "/blog/write",
  "/blog/edit",
  "/blog/my-posts",
  "/maintenance",
  ...TRACKING_QUERY_PARAMS.map((param) => `/*?${param}=`),
] as const;

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
        userAgent: AI_BOTS,
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
