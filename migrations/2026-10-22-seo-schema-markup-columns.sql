-- 2026-10-22 — Veritabanı odaklı SEO: ham JSON-LD alanı
--
-- Talimat §2 "Dinamik Metadata" listesindeki tek eksik alandı: slug, title, h1,
-- meta_description, meta_keywords, canonical_url, og:* kolonları `pages` ve
-- `services` tablolarında zaten vardı; `schema_markup` yoktu.
--
-- Ekleyicidir: mevcut satırlar/veriler dokunmaz, kolon NULL kalır. Kod tarafı
-- NULL'ı "şema yok" sayar (bkz. src/lib/schema-markup.ts → toSchemaMarkup).
-- 301 slug geçmişi bu işten bağımsız olarak zaten `seo_redirects` üzerinden
-- çalışıyordu (src/lib/redirect-handler.ts), yeni tablo gerekmedi.

ALTER TABLE pages    ADD COLUMN IF NOT EXISTS schema_markup JSONB;
ALTER TABLE services ADD COLUMN IF NOT EXISTS schema_markup JSONB;

COMMENT ON COLUMN pages.schema_markup IS
  'Sayfaya özel ham JSON-LD şemaları (dizi). Kodun tür bazında ürettiği Service/FAQ/Breadcrumb şemalarına EKLENİR.';
COMMENT ON COLUMN services.schema_markup IS
  'Hizmet detay sayfasına özel ham JSON-LD şemaları (dizi).';
