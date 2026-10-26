export function normalizeBlogTag(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const tag = raw?.trim().replace(/,\d{4}-\d{2}-\d{2}$/, "").trim();
  return tag ? tag.slice(0, 100) : null;
}
