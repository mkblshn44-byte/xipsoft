/**
 * slug-candidates.ts — WordPress uyumlu slug çözümleme yardımcıları.
 *
 * Eski WordPress forum/blog URL'leri slug'a bir veya daha fazla `-<sayı>`
 * soneki ekleyebilir (ör. `konu-1777971761503-9498`). Bu yardımcı, URL
 * slug'ından sondaki sayı gruplarını kademeli olarak soyup aday slug'lar
 * üretir; böylece hem `-<sayı>` ekli hem de temiz DB slug'ı eşleşebilir.
 *
 * Bağımlılıksızdır (middleware ve sunucu katmanında güvenle kullanılabilir).
 */
export function blogSlugCandidates(slug: string, minBaseLength = 5): string[] {
  const candidates: string[] = [];
  if (!slug) return candidates;

  candidates.push(slug);

  let current = slug;
  while (/-\d+$/.test(current)) {
    current = current.replace(/-\d+$/, "");
    if (current.length < minBaseLength) break;
    candidates.push(current);
  }

  return candidates;
}

/**
 * Aday slug'lardan herhangi biri verilen kümede (birebir) varsa ya da kümedeki
 * bir slug `aday-<...>` biçiminde bu adayla başlıyorsa, kümede bulunan GERÇEK
 * slug'ı döner. İkinci durum, URL temizken DB'de `slug-<sayı>` bulunmasını
 * yakalar; 301 hedefinin doğru kanonik slug olması için eşleşen kayıt döndürülür.
 */
export function resolveSlugFromSet(set: Set<string>, slug: string): string | null {
  for (const candidate of blogSlugCandidates(slug)) {
    if (set.has(candidate)) return candidate;
    const prefix = `${candidate}-`;
    for (const existing of set) {
      if (existing.startsWith(prefix)) return existing;
    }
  }
  return null;
}

