/**
 * ServiceMaster — /hizmetler/[...slug] (catch-all TEK şablon)
 *
 * Bu dosya YALNIZCA bir sarma (wrapper)dır: URL segmentlerini alıp hizmet/
 * konum zincirinin TEK kaynağı olan `@/lib/service-content/ServiceContentPage`
 * modülüne geçirir. Çözümleme, metadata, JSON-LD, alias 308'leri ve render
 * kararlarının HEPSİ o modüldedir — kök catch-all `[...slug]/page.tsx` de
 * AYNI modülü kullanır.
 *
 * Neden bu kadar ince: hedef mimaride (`MIMARI.md` §11) bu klasör silinecek ve
 * `/hizmetler/...` adreslerini kök catch-all sunacak. Zincir bu dosyanın
 * içinde dursaydı silme anında içerik/SEO davranışı da kaybolurdu; şimdi
 * silinecek olan yalnızca bu sarmadır.
 *
 * URL biçimi (modülün doc'unda ayrıntılı):
 *   /hizmetler/[slug]         → 1 segment → hizmet detay sayfası
 *   /hizmetler/[slug]/[sehir] → 2 segment → il/ilçe (yerel SEO) sayfası
 *   3+ segment                → hizmet zinciri YOK (yalnızca ağaç sayfası)
 *
 * KURAL: Bu rota tek bir şablon dosyasıdır. Her hizmet, il veya ilçe için
 * ayrı ayrı page.tsx veya sabit bileşen AÇMAK KESİNLİKLE YASAKTIR.
 */
import type { Metadata } from "next";
import {
  renderServiceContent,
  serviceContentMetadata,
} from "@/lib/service-content/ServiceContentPage";
import { serviceContentRequestFromRoute } from "@/lib/service-content/request";

// Vercel 500 hatasını önlemek için generateStaticParams/dynamicParams kaldırıldı.
// Tüm hizmet/konum sayfaları tamamen dinamik (ƒ) render edilir; veri katmanı
// unstable_cache ile önbelleklendiğinden Neon yükü artmaz.
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSegments } = await params;
  return serviceContentMetadata(serviceContentRequestFromRoute(rawSegments));
}

export default async function ServiceMaster({ params }: Props) {
  const { slug: rawSegments } = await params;
  return renderServiceContent(serviceContentRequestFromRoute(rawSegments));
}
