/**
 * service-content/request.ts — hizmet/konum isteğinin SAF (DB'siz) tanımı.
 *
 * `ServiceContentPage` modülü iki farklı rota tarafından çağrılıyor:
 *   - `/hizmetler/[...slug]` → route parametreleri `hizmetler` kökünün
 *     ALTINDAKİ segmentlerdir (`["web-yazilim", "adana.html"]`).
 *   - kök catch-all `[...slug]` → segmentler `hizmetler` kökünü İÇERİR
 *     (`["hizmetler", "web-yazilim", "adana.html"]`).
 *
 * Bu iki biçim farkı YALNIZCA burada kapatılır; zincirin geri kalanı her zaman
 * `SERVICE_CONTENT_ROOT` kökü DAHİL segmentlerle çalışır. Böylece bir adres
 * hangi rotadan gelirse gelsin aynı segmentlere, aynı kanonik karşılaştırmaya
 * ve aynı 308 kararına ulaşır — iki rota arasında davranış farkı üretecek tek
 * yer burasıdır, o da test edilmiştir (`request.test.ts`).
 *
 * Modül SAF kalmak zorundadır (sunucu bağımlılığı yok): kararlar DB'siz
 * doğrulanabilsin diye `ServiceContentPage`'ten ayrıldı.
 */
import type { ContentTreeNode, ContentTreeResult } from "@/lib/content-tree";
import { stripContentExtension } from "@/lib/content-path";

/** Hizmet/konum içerik ağacının kök segmenti. */
export const SERVICE_CONTENT_ROOT = "hizmetler";

export interface ServiceContentRequest {
  /**
   * İsteğin locale'siz, UZANTISI SÖKÜLMEMİŞ ham yolu
   * (`/hizmetler/<slug>` veya `/hizmetler/<slug>.html`). Kanonik hedefle
   * karşılaştırılıp gerekiyorsa TEK 308 atılır — alias slug'ı ve yanlış
   * uzantılı adres aynı adımda kapanır, yönlendirme zinciri oluşmaz.
   */
  readonly requestPath: string;
  /** `SERVICE_CONTENT_ROOT` kökü DAHİL, uzantısı sökülmüş segmentler. */
  readonly pathSegments: readonly string[];
  /**
   * Kök catch-all'ın `full_path` üzerinden ZATEN çözdüğü düğüm. Hizmet zinciri
   * bu adresi çözemezse bu düğüm açılır (404 yerine DB'deki içerik).
   */
  readonly resolvedTree?: ContentTreeResult;
}

/** `/hizmetler/[...slug]` route parametrelerinden istek üretir. */
export function serviceContentRequestFromRoute(
  rawSegments: readonly string[],
): ServiceContentRequest {
  return {
    requestPath: `/${SERVICE_CONTENT_ROOT}/${rawSegments.join("/")}`,
    pathSegments: [
      SERVICE_CONTENT_ROOT,
      ...rawSegments.map((segment) => stripContentExtension(segment)),
    ],
  };
}

/** Kök catch-all segmentlerinden (`hizmetler` kökü dahil) istek üretir. */
export function serviceContentRequestFromTreePath(
  rawSegments: readonly string[],
  resolvedTree?: ContentTreeResult,
): ServiceContentRequest {
  return {
    requestPath: `/${rawSegments.join("/")}`,
    pathSegments: rawSegments.map((segment) => stripContentExtension(segment)),
    resolvedTree,
  };
}

/** Kök dahil segmentleri hizmet/konum segmentlerine çevirir (`[]` → kök/hub). */
export function contentSegmentsOf(req: ServiceContentRequest): string[] {
  return req.pathSegments.length > 1 ? [...req.pathSegments.slice(1)] : [];
}

/**
 * Kök catch-all bir `pages` düğümünü hizmet/konum zincirine mi devretmeli?
 *
 * Yalnızca UZANTISIZ kanonik taşıyan hizmet/konum İÇERİK satırları (1-2 segment)
 * devredilir: `node_type='category'` (ör. `hizmetler` hub'ı) ve 3+ segmentli
 * derin yollar ağaç şablonunda kalır — hizmet zincirinde karşılıkları yoktur.
 */
export function isServiceContentNode(
  node: Pick<ContentTreeNode, "kind" | "nodeType">,
  rawSegments: readonly string[],
): boolean {
  if (node.nodeType !== "page") return false;
  if (node.kind !== "service" && node.kind !== "location") return false;
  if (rawSegments[0] !== SERVICE_CONTENT_ROOT) return false;
  const depth = rawSegments.length - 1;
  return depth === 1 || depth === 2;
}
