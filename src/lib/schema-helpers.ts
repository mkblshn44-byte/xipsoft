/**
 * schema-helpers.ts — GERİYE DÖNÜK UYUMLULUK (barrel)
 *
 * JSON-LD şema üreticileri sorumluluk bazında `src/lib/schema/*` altına
 * bölünmüştür. Dışarıya aynı genel yüzey (`@/lib/schema-helpers`) sunulur.
 *
 *   schema/blog.ts   → BlogSchemaFromDb
 *   schema/person.ts → personSchema, PersonSchemaInput
 *   schema/site.ts   → breadcrumbSchema, webPageSchema, organizationSchema,
 *                      faqSchema
 *   schema/service.ts→ serviceSchema, serviceBreadcrumbs (+ tipler)
 *   schema/local-business.ts → localBusinessSchema
 *   schema/website.ts→ websiteSchema
 *   schema/shared.ts → SCHEMA_CONTEXT (iç)
 *
 * Not: `howToSchema` artık üretilmez (hiçbir çağrısı yoktu).
 * Şema `<script>` render'ı için `@/components/seo/JsonLd` kullanılır.
 */

export { BlogSchemaFromDb, blogListSchema } from "./schema/blog";
export { personSchema } from "./schema/person";
export type { PersonSchemaInput } from "./schema/person";
export {
  breadcrumbSchema,
  webPageSchema,
  organizationSchema,
  faqSchema,
} from "./schema/site";
export { serviceSchema, serviceBreadcrumbs } from "./schema/service";
export type { ServiceSchemaInput, ServiceAreaServed } from "./schema/service";
export { localBusinessSchema } from "./schema/local-business";
export { websiteSchema } from "./schema/website";
export { corporatePageSchema } from "./schema/page";
export type { CorporatePageSchemaInput } from "./schema/page";
export { collectionPageSchema, itemListSchema } from "./schema/collection";
