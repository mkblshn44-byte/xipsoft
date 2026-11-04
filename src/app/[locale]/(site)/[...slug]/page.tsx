/**
 * ContentTree route — /[locale]/[...slug] (KÖK catch-all, SON ÇARE).
 *
 * AMAÇ (Aşama 6): WordPress benzeri SINIRSIZ kategori/sayfa hiyerarşisi.
 * Gelen tüm slug segmentleri birleştirip `pages.full_path` olarak aranır.
 *   /haberler/gundem.html               → category → alt sayfa listesi
 *   /haberler/gundem/aksamcilar-nerde.html → page  → içerik
 *
 * KANONİK URL: tüm içerik türleri için uzantısızdır; eski `.html` adresleri
 * middleware katmanında kalıcı olarak kanonik adrese yönlendirilir.
 *
 * ÖNCELİK: Next.js statik/daha spesifik segmentleri DAİMA öne alır. Bu nedenle
 * bu rota yalnızca eşleşen özel rotası olmayan yolları karşılar. Hizmet ve
 * konum sayfaları da artık bu rotadan sunulur; hizmetlere özel ikinci bir
 * catch-all yoktur. Eşleşme yoksa 404 döner.
 *
 * HİZMET/KONUM DELEGASYONU: `pages.kind='service' | 'location'` düğümleri
 * ServiceContentPage'e devredilir. Böylece sayfa, metadata ve canonical URL
 * için tek route ve tek render akışı kullanılır.
 *
 * MİMARİ NOT: İçerik ağacının görünüm ve metadata'sı
 * `@/components/ContentTree/ContentTreeViews` içindedir.
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
  const { slug, locale } = await params;
  const raw = slug ?? [];
  const result = await resolveContentPath(raw, locale);
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
  const { slug, locale } = await params;
  const raw = slug ?? [];
  const result: ContentTreeResult | null = await resolveContentPath(raw, locale);
  if (!result) notFound();

  if (isServiceContentNode(result.node, raw)) {
    return renderServiceContent(serviceContentRequestFromTreePath(raw, result));
  }

  // Kanonik biçim tüm düğümlerde uzantısızdır.
  if (!isCanonicalRequest(raw, result.node)) {
    permanentRedirect(canonicalPathForNode(result.node));
  }

  return renderContentTree(result);
}
