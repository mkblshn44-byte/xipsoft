/**
 * İçerik API'sinin paylaşılan doğrulama yardımcıları.
 */

/**
 * `tags` alanını doğrular ve normalize eder (küçük harf, trim, ≤10 tag,
 * tag başına ≤8 kelime ve ≤80 karakter).
 */
export function validateTags(
  tags: unknown,
): { ok: true; tags: string[] } | { ok: false; msg: string } {
  if (tags === undefined) return { ok: true, tags: [] };
  if (!Array.isArray(tags)) return { ok: false, msg: "tags bir dizi olmalıdır" };
  if (tags.length > 10) return { ok: false, msg: "En fazla 10 tag eklenebilir" };
  for (const t of tags) {
    if (typeof t !== "string") return { ok: false, msg: "Her tag string olmalıdır" };
    const wordCount = t.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 8) return { ok: false, msg: "Her tag max 8 kelime olabilir" };
    if (t.length > 80) return { ok: false, msg: "Her tag max 80 karakter olabilir" };
  }
  return {
    ok: true,
    tags: tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean),
  };
}

/**
 * Düz JSON nesnesi mi? (null ve dizi hariç).
 * Kısıtlı güncelleme ve batch handler'larının ortak girdi kontrolü (D4).
 */
export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
