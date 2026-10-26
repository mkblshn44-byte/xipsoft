/**
 * schema-markup.ts — `pages.schema_markup` / `services.schema_markup` (JSONB)
 * değerini `JsonLd` bileşeninin beklediği şema dizisine indirger.
 *
 * NEDEN NORMALİZASYON? Kolon iki biçimde dolu gelebilir: gerçek JSONB
 * nesne/dizi ya da panel textarea'sından yazılıp çift kodlanmış JSON string'i.
 * Şemayı elle doğrulamak yerine burada tek yerde süzeriz: bozuk/düz metin
 * değer `<head>`'e hiç basılmaz, sayfa da bu yüzden 500 dönmez.
 */

/** JSONB değerinden `JsonLd`'nin aldığı şema listesini üretir (geçersiz → null). */
export function toSchemaMarkup(value: unknown): Record<string, unknown>[] | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  const schemas = list.filter(
    (item): item is Record<string, unknown> =>
      item !== null &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      ("@type" in item || "@graph" in item),
  );
  return schemas.length > 0 ? schemas : null;
}

/**
 * Panel textarea'sındaki ham JSON-LD metnini `::jsonb` parametresine çevirir.
 * Boş → NULL (kolon temizlenir); geçersiz JSON ya da nesne olmayan değer →
 * kayıt OLMADAN hata, böylece panelden bozuk şema yazılamaz. Tek nesne her
 * zaman diziye sarılır — okuma tarafı tek biçim görür.
 */
export function parseSchemaMarkupInput(raw?: string | null): string | null {
  const text = raw?.trim();
  if (!text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Schema markup geçerli JSON değil.");
  }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  if (!list.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    throw new Error("Schema markup nesne ya da nesne dizisi olmalıdır.");
  }
  return JSON.stringify(list);
}
