// Utility: temiz ve SEO-dostu slug uretimi
export function slugify(input: string): string {
  if (!input) return "";
  let s = decodeURIComponent(String(input));

  const map: Record<string, string> = {
    "ç": "c", "Ç": "c",
    "ğ": "g", "Ğ": "g",
    "ı": "i", "İ": "i",
    "ö": "o", "Ö": "o",
    "ş": "s", "Ş": "s",
    "ü": "u", "Ü": "u",
  };

  s = s.replace(/./g, (ch) => map[ch] ?? ch);

  s = s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

  s = s.toLowerCase();

  s = s.replace(/[_\s]+/g, "-");
  s = s.replace(/[^a-z0-9-]/g, "");

  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");

  return s;
}

export default slugify;
