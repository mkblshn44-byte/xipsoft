/**
 * Bot API — Tek endpoint
 * POST /api/bot
 *
 * Header: X-Bot-Key: <BOT_API_KEY>
 *
 * Body type'a göre işlem:
 *   { type: "Blog",
 *     title: string,           // 5-500 karakter
 *     content: string,         // min 200 kelime, max 100000 karakter (HTML veya düz metin)
 *     description?: string,    // max 500 karakter (SEO meta description)
 *     tags?: string[],         // max 10 tag
 *     cover_image_url?: string,// HTTPS URL
 *     publish?: boolean,       // true = published, false = draft (varsayılan: false)
 *     slug?: string,           // özel slug (yoksa title'dan üretilir)
 *     published_at?: string,   // ISO 8601 tarih (publish=true ise geçerli)
 *   }
 *
 * NOT: Forum kaldırıldı; "Forum"/"ForumReply" tipleri artık kabul edilmez.
 *
 * İş mantığı `@/lib/content/handlers/*` içinde tek kaynaktan yönetilir; `/api/content`
 * rotası aynı handler'ları paylaşır (DRY).
 */

import { NextRequest, NextResponse } from "next/server";
import { handleBlogIngest } from "@/lib/content/handlers/blog";
import { handleRedirectIngest } from "@/lib/content/handlers/redirect";
import { guardContentApiRead, guardContentApiRequest } from "@/lib/content/request-guard";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["Blog", "Redirect"]);

// ── Route Handlers ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const guard = await guardContentApiRequest(req, {
    endpoint: "/api/bot",
    rateKeyPrefix: "bot",
    withBody: true,
  });
  if (guard.response) return guard.response;
  const body = guard.body;

  if (!body?.type || !ALLOWED_TYPES.has(body.type as string)) {
    return NextResponse.json(
      {
        success: false,
        error: "VALIDATION_ERROR",
        message: 'type: "Blog" veya "Redirect" olmalıdır',
      },
      { status: 422 },
    );
  }

  try {
    switch (body.type) {
      case "Blog":
        return await handleBlogIngest(body);
      case "Redirect":
        return await handleRedirectIngest(body);
      default:
        return NextResponse.json(
          { success: false, error: "VALIDATION_ERROR", message: "Geçersiz type" },
          { status: 422 },
        );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[BotAPI] error:", msg);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "Sunucu hatası" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const unauthorized = await guardContentApiRead(req, {
    endpoint: "/api/bot",
    rateKeyPrefix: "bot",
  });
  if (unauthorized) return unauthorized;

  return NextResponse.json({
    success: true,
    endpoints: {
      "POST /api/bot": {
        headers: { "X-Bot-Key": "<BOT_API_KEY>" },
        types: {
          Blog: {
            required: ["title (5-500 karakter)", "content (min 200 kelime)"],
            optional: [
              "description (max 500 karakter)",
              "tags (max 10)",
              "cover_image_url",
              "publish (boolean)",
              "slug",
              "published_at (ISO 8601)",
            ],
          },
          Redirect: {
            required: ["sourcePath (ör. /eski-sayfa)", "targetPath (ör. /yeni-sayfa veya https://...)"],
            optional: [
              "statusCode (301 | 302 | 307 | 308; varsayılan 301)",
              "isActive (boolean; varsayılan true)",
            ],
          },
        },
      },
    },
  });
}
