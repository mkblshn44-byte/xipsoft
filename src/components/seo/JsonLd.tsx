/**
 * JsonLd — JSON-LD `<script>` etiketini render eden tek sunucu bileşeni.
 *
 * Her sayfa türü (BlogMaster, ServiceMaster, Ana Sayfa, kurumsal) şemasını
 * bu bileşenden geçirir: `dangerouslySetInnerHTML` sarmalayıcısı tek yerde
 * tanımlanır, `null` şemalar sessizce atlanır.
 *
 * Örnek:
 *   <JsonLd schemas={[serviceSchema(...), breadcrumbSchema(...), faqSchema(...)]} />
 */

import { ldJson } from "@/lib/ld-json";

type Schema = Record<string, unknown> | null | undefined;

function isSchema(value: Schema): value is Record<string, unknown> {
  return Boolean(value);
}export default function JsonLd({
  schemas,
  id,
}: {
  schemas: Schema | Schema[];
  /** React rekonstrüksiyonu için opsiyonel anahtar öneki. */
  id?: string;
}) {
  const list = (Array.isArray(schemas) ? schemas : [schemas]).filter(isSchema);
  if (list.length === 0) return null;

  return (
    <>
      {list.map((schema, index) => (
        <script
          key={id ? `${id}-${index}` : index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson(schema) }}
        />
      ))}
    </>
  );
}
