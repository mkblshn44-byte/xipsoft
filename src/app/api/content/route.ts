/**
 * Merkezi İçerik API — Tek endpoint
 * POST /api/content
 *
 * Header: X-Bot-Key: <BOT_API_KEY>   (bkz. /api/bot ile aynı anahtar)
 *
 * AMAÇ (MIMARI.md): Dışarıdan veya otomasyonlardan gelen içeriği MEVCUT
 * tablolara (blog_posts / pages) yazan tek merkezi uç nokta.
 * Yazma sonrası ilgili ISR cache tag'leri (revalidateTag) ve sitemap tazelenir;
 * rota/dosya eklenmez, catch-all kullanılmaz.
 *
 * Body type'a göre işlem (type büyük/küçük harf duyarsızdır):
 *   { type: "blog", ... }   // /api/bot ile aynı şema
 *   { type: "page",                                   // hizmet × şehir/ilçe
 *     service: string|number,   // hizmet slug'ı veya id (zorunlu)
 *     location: string|number,  // konum (il/ilçe) slug'ı veya id (zorunlu)
 *     province?: string,        // aynı slug'lı ilçeler için üst il slug'ı
 *     content: string,          // Markdown gövde (zorunlu)
 *     title?: string, metaTitle?: string, metaDescription?: string,
 *     lokalAciklama?: string, ozelMetaDesc?: string,
 *     lokalSss?: Array<{ question: string; answer: string }>,
 *     slug?: string,            // "<hizmet>/<konum>" biçiminde tam slug override
 *     status?: "draft"|"review"|"published"|"paused", // varsayılan: review
 *     publish?: boolean,        // true → published (status verilmediyse)
 *     sourceType?: "manual"|"template"|"ai", // varsayılan: manual
 *   }
 *
 * İş mantığı `@/lib/content/handlers/*` içinde tek kaynaktan yönetilir (DRY).
 */

import { NextRequest, NextResponse } from "next/server";
import { handleBlogIngest } from "@/lib/content/handlers/blog";
import { handlePageIngest } from "@/lib/content/handlers/page";
import { handlePageBatchIngest } from "@/lib/content/handlers/page-batch";
import { handleRedirectIngest } from "@/lib/content/handlers/redirect";
import { handleRestrictedPageUpdate } from "@/lib/content/handlers/restricted-page";
import { guardContentApiRead, guardContentApiRequest } from "@/lib/content/request-guard";

export const runtime = "nodejs";

// Tip adları büyük/küçük harf duyarsızdır (MIMARI.md §2.1.8 `type: "blog"`
// ve mevcut /api/bot `type: "Blog"` sözleşmelerinin ikisini de karşılar).
const ALLOWED_TYPES = new Set(["blog", "page", "pagebatch", "redirect"]);

export async function POST(req: NextRequest) {
  const guard = await guardContentApiRequest(req, {
    endpoint: "/api/content",
    rateKeyPrefix: "content",
    withBody: true,
  });
  if (guard.response) return guard.response;
  const body = guard.body;

  const rawType = typeof body?.type === "string" ? body.type.trim().toLowerCase() : "";

  // "type" içermeyen istekler → Kısıtlı İçerik Güncelleme (yalnızca mevcut sayfa
  // içeriği; INSERT/slug değişimi yasaktır). Mevcut ingest türleri (blog/
  // pageBatch/redirect vb.) tamamen aynı kalır.
  if (!rawType) {
    return await handleRestrictedPageUpdate(body);
  }

  if (!ALLOWED_TYPES.has(rawType)) {
    return NextResponse.json(
      {
        success: false,
        error: "VALIDATION_ERROR",
        message:
          'type: "blog", "page", "pageBatch" veya "redirect" olmalıdır (büyük/küçük harf duyarsız)',
      },
      { status: 422 },
    );
  }

  try {
    switch (rawType) {
      case "blog":
        return await handleBlogIngest(body);
      case "page":
        return await handlePageIngest(body);
      case "pagebatch":
        return await handlePageBatchIngest(body);
      case "redirect":
        return await handleRedirectIngest(body);
      default:
        return NextResponse.json(
          { success: false, error: "VALIDATION_ERROR", message: "Geçersiz type" },
          { status: 422 },
        );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[ContentAPI] error:", msg);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "Sunucu hatası" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/content — Kısıtlı İçerik Güncelleme (yalnızca mevcut sayfa içeriği).
 * Yeni sayfa açılamaz (INSERT yasak), slug değiştirilemez. Aynı güvenlik ve
 * kalite kurallarıyla POST /api/content/update ile birebir aynı işi yapar.
 */
export async function PUT(req: NextRequest) {
  const guard = await guardContentApiRequest(req, {
    endpoint: "/api/content",
    rateKeyPrefix: "content",
    withBody: true,
  });
  if (guard.response) return guard.response;

  return await handleRestrictedPageUpdate(guard.body);
}

export async function GET(req: NextRequest) {
  const unauthorized = await guardContentApiRead(req, {
    endpoint: "/api/content",
    rateKeyPrefix: "content",
  });
  if (unauthorized) return unauthorized;

  return NextResponse.json({
    success: true,
    endpoints: {
      "POST /api/content": {
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
          Page: {
            required: ["service (slug | id)", "location (slug | id)", "content (Markdown)"],
            optional: [
              "province (üst il slug'ı; aynı adlı ilçeler için)",
              "title",
              "metaTitle",
              "metaDescription",
              "lokalAciklama",
              "ozelMetaDesc",
              "lokalSss: [{ question, answer }]",
              "slug (\"<hizmet>/<konum>\")",
              "status (draft | review | published | paused; varsayılan review)",
              "publish (boolean; true → published)",
              "sourceType (manual | template | ai; varsayılan manual)",
            ],
          },
          PageBatch: {
            required: ["pages (1–20 page payloads; each page uses the Page schema)"],
          },
          Redirect: {
            required: ["sourcePath (ör. /eski-sayfa)", "targetPath (ör. /yeni-sayfa veya https://...)"],
            optional: [
              "statusCode (301 | 302 | 307 | 308; varsayılan 301)",
              "isActive (boolean; varsayılan true)",
              "aliaslar: source/from, target/to, status",
            ],
          },
        },
      },
      "POST /api/content/update  &  PUT /api/content": {
        description:
          "Kısıtlı İçerik Güncelleme — YALNIZCA mevcut yerel sayfaların içeriği güncellenir. Yeni sayfa açılamaz (404), slug değiştirilemez.",
        required: [
          "slug  (ör. web-yazilim-tasarim/kocaeli-izmit)",
          "content  (Markdown, ≥1000 karakter VEYA ≥250 kelime)",
          "summary  (Yerel giriş paragrafı, ≥50 karakter → lokal_aciklama)",
          "meta_title  (dolu, ≤160 karakter)",
          "meta_description  (dolu, ≤320 karakter)",
          "lokal_sss  (JSON: en az 3 dolu { question, answer })",
          "status  (draft | review | published | paused)",
        ],
        note: "Başka alan kabul edilmez. source_type her güncellemede 'manual' yapılır.",
      },
    },
  });
}
