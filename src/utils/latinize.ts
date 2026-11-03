/**
 * turkishToLatin — Turkce ozel karakterleri Latin karsiliklarina cevirir.
 * glass font Turkce icermedigi icin navbar/baslik metinlerinde kullanilir.
 */
export function turkishToLatin(text: string): string {
  return text
    .replace(/İ/g, "I")
    .replace(/I/g, "I")
    .replace(/Ğ/g, "g")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

/** Hem latinize hem uppercase — navbar etiketleri icin */
export function navLabel(text: string): string {
  return turkishToLatin(text).toUpperCase();
}
