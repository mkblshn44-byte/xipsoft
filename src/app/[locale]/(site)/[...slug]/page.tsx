/**
 * ContentTree route — /[locale]/[...slug] (KÖK catch-all, SON ÇARE).
 *
 * AMAÇ (Aşama 6): WordPress benzeri SINIRSIZ kategori/sayfa hiyerarşisi.
 * Gelen tüm slug segmentleri birleştirip `pages.full_path` olarak aranır.
 *   /haberler/gundem.html               → category → alt sayfa listesi
 *   /haberler/gundem/aksamcilar-nerde.html → page  → içerik
 *
 * KANONİK URL: `kind`'e göre ikiye ayrılır (`canonicalPathForNode`):
 *   - `kind='custom'` (admin'in ağaçtan yarattığı içerik) → `.html`; uzantısız
 *     adresler tek adımda 308 ile kanoniğe yönlendirilir.
 *   - `kind='service' | 'location'` (konsolide hizmet/konum satırları) →
 *     UZANTISIZ; canlıda ölçülen kanonik biçim budur.
 *
 * ÖNCELİK: Next.js statik/daha spesifik segmentleri DAİMA öne alır. Bu yüzden
 * `/hizmetler/...`, `/blog/...`, `/urunler/...`, `/hakkimizda` vb. mevcut
 * rotalar buraya DÜŞMEZ; bu rota yalnızca hiçbir özel rotaya uymayan yolları
 * karşılar. Eşleşme yoksa 404 (önceki davranış korunur).
 *
 * HİZMET/KONUM DELEGASYONU: `hizmetler/[...slug]` var olduğu sürece bu rotaya
 * hiç `/hizmetler/...` isteği gelmez; ancak `kind='service' | 'location'`
 * düğümleri YİNE o modüle (`ServiceContentPage`) devredilir. Böylece özel rota
 * silindiğinde (MIMARI.md §11 B8) hizmet/konum sayfaları ServicePageClient /
 * PageTemplate + JSON-LD zincirini kaybetmeden burada açılır — iki rota
 * arasında davranış farkı üretmek yapısal olarak imkânsızdır.
 *
 * MİMARİ NOT: Görünüm ve metadata `@/components/ContentTree/ContentTreeViews`
 * içindedir — `/hizmetler/[...slug]` fallback'i de AYNI bileşenleri kullanır,
 * böylece aynı DB satırı iki rotada farklı SEO çıktısı üretemez.
 *
 * İçerik `pages` (kind='custom' | 'service' | 'location') tablosundan gelir;
 * kodda sabit içerik yok.
 */
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  resolveContentPath,
  canonicalPathForNode,
  type ContentTreeResult,
  type ContentTreeNode,
} from "@/lib/content-tree";
import {
  buildContentTreeMetadata,
  renderContentTree,
} from "@/components/ContentTree/ContentTreeViews";
import {
  renderServiceContent,
  serviceContentMetadata,
} from "@/lib/service-content/ServiceContentPage";
import {
  isServiceContentNode,
  serviceContentRequestFromTreePath,
} from "@/lib/service-content/request";
import { NOINDEX_NOFOLLOW } from "@/lib/seo-helpers";

type Props = {
  params: Promise<{ locale: string; slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * ISR: 1 saat. Next bu değerle yanıt başlığına `s-maxage=3600` +
 * `stale-while-revalidate` yazar, böylece Cloudflare/CloudFront sayfa HTML'ini
 * kenarda statik tutar. Panel değişikliği `revalidatePath` + Redis
 * invalidasyonuyla (bkz. admin-content-tree-actions) TTL beklemeden düşer.
 */
export const revalidate = 3600;

/** Bir düğümün kanonik adresiyle istenen yol birebir mi? */
function isCanonicalRequest(raw: string[], node: ContentTreeNode): boolean {
  return `/${raw.join("/")}` === canonicalPathForNode(node);
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const raw = slug ?? [];
  const result = await resolveContentPath(raw);
  if (!result) return { robots: NOINDEX_NOFOLLOW };

  const metadata = isServiceContentNode(result.node, raw)
    ? serviceContentMetadata(serviceContentRequestFromTreePath(raw, result))
    : buildContentTreeMetadata(result.node);

  // Filtreli/parametreli istek (`?s=…&page=2`) aynı içeriğin kopya sürümüdür →
  // varsayılan noindex, nofollow. Panel `robots` alanına karar yazdıysa o kazanır.
  const query = await searchParams;
  if (Object.keys(query ?? {}).length === 0 || result.node.robots?.trim()) return metadata;
  return { ...metadata, robots: NOINDEX_NOFOLLOW };
}

export default async function ContentTreePage({ params }: Props) {
  const { slug } = await params;
  const raw = slug ?? [];
  const result: ContentTreeResult | null = await resolveContentPath(raw);
  if (!result) notFound();

  if (isServiceContentNode(result.node, raw)) {
    return renderServiceContent(serviceContentRequestFromTreePath(raw, result));
  }

  // Kanonik biçim: `custom` düğümlerinde `.html` ile biter. Uzantısız/eski
  // adres → 308 kalıcı yönlendirme.
  if (!isCanonicalRequest(raw, result.node)) {
    permanentRedirect(canonicalPathForNode(result.node));
  }

  return renderContentTree(result);
}
