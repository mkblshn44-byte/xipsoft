/**
 * ldJson — JSON-LD'yi `<script type="application/ld+json">` içine güvenli gömer.
 *
 * Şema alanları DB/CMS içeriğinden besleniyor. Bir başlık veya açıklama
 * `</script>` içerirse etiket erken kapanır ve metin HTML olarak yürür (XSS).
 * `<` → `\u003c` kaçırmak JSON tarafında birebir aynı değeri üretir, yani veri
 * bozulmaz; sadece etiket kapanışı imkânsız hale gelir.
 */
export function ldJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
