import type { ServicePageData } from "@/lib/db/services";

/**
 * İlgili hizmetleri SUNUCUDA seçer.
 *
 * NEDEN: `RelatedServices` bir client bileşeni ve eskiden tüm aktif hizmet
 * listesini (`getAllActiveServices()`) prop olarak alıyordu. Next, client
 * bileşen prop'larını RSC payload'ına serialize ettiği için blog sayfası
 * HTML'ine ~100 KB'lik bir hizmet dizisi gömülüyordu (ölçüm: 101.521 karakter)
 * — oysa yalnızca 3 kart gösteriliyor.
 *
 * Puanlama mantığı bileşendekinin aynısıdır; burada erken uygulanır ki
 * tarayıcıya yalnızca gösterilecek 3 kayıt gitsin.
 */
export function pickRelatedServices(
  services: ServicePageData[],
  {
    currentSlug,
    tags = [],
    limit = 3,
  }: { currentSlug?: string; tags?: string[]; limit?: number } = {},
): ServicePageData[] {
  const bag = (tags || []).map((t) => t.toLowerCase());

  return services
    .filter((s) => s.slug !== currentSlug)
    .map((s) => {
      let score = 0;
      const haystack = [
        s.slug,
        s.title,
        s.subtitle ?? "",
        ...(s.servicesTag ?? []).map((t) => t.name),
        ...(s.features ?? []).map((f) => f.title + " " + f.description),
        ...(s.techStack ?? []).map((t) => t.name),
      ]
        .join(" ")
        .toLowerCase();

      for (const t of bag) {
        if (haystack.includes(t)) score += 2;
      }
      if (score === 0) score = 1;
      return { service: s, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.service);
}
