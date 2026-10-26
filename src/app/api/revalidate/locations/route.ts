/**
 * POST /api/revalidate/locations
 *
 * Öncelikli il/ilçe (`pages`, `location_type IN ('province','district')`)
 * içerikleri DB'de güncellendikten sonra Next.js ISR önbelleğini ve ilgili
 * sitemap kayıtlarını elle tazelemek için kullanılır. İçerik-yazma dışındaki
 * veri güncellemelerinin (ör. bulk içerik zenginleştirme script'i) cache'i
 * 1 saat beklemeden tazelemesini sağlar.
 *
 * Kimlik doğrulama: /api/content ve /api/bot ile aynı `X-Bot-Key` (BOT_API_KEY).
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { guardContentApiRequest } from "@/lib/content/request-guard";
import { invalidateAllPageCaches } from "@/lib/redis/page-cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const guard = await guardContentApiRequest(req, {
    endpoint: "/api/revalidate/locations",
    rateKeyPrefix: "revalidate-locations",
  });
  if (guard.response) return guard.response;

  // Veri katmanı tag'leri.
  revalidateTag("local-pages");
  revalidateTag("sitemap");
  revalidateTag("locations");

  // Redis katmanı: toplu içerik işleminde hangi slug'ların değiştiği bilinmediği
  // için sayfa + sitemap önbelleği komple düşürülür (bir sonraki istek DB'den
  // tek sefer yüklenip yeniden yazılır).
  await invalidateAllPageCaches();

  // Bileşen/rota seviyesinde cache (tek catch-all şablon: hizmet detay + konum).
  revalidatePath("/hizmetler/[...slug]", "page");
  revalidatePath("/hizmetler");
  revalidatePath("/sitemap.xml");

  return NextResponse.json({
    success: true,
    revalidated: {
      tags: ["local-pages", "sitemap", "locations"],
      paths: ["/hizmetler/[...slug]", "/hizmetler", "/sitemap.xml"],
    },
    now: Date.now(),
  });
}
