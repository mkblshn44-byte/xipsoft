/**
 * schema/collection.ts — Liste/koleksiyon sayfaları için JSON-LD üreticileri.
 *
 * TEK KAYNAK: `/hizmetler`, `/urunler`, `/references` gibi liste sayfaları
 * CollectionPage + ItemList yapısını buradan alır.
 */

import { SITE_URL } from "@/lib/site-url";
import { SCHEMA_CONTEXT } from "./shared";

export function collectionPageSchema(opts: {
  name: string;
  description: string;
  /** Göreli (`/hizmetler`) veya mutlak URL. */
  url: string;
}) {
  const url = opts.url.startsWith("http") ? opts.url : `${SITE_URL}${opts.url}`;
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url,
    inLanguage: "tr-TR",
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
    publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization` },
  };
}

export function itemListSchema(opts: {
  name: string;
  description: string;
  items: Array<{ name: string; url: string; description?: string }>;
}) {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "ItemList",
    name: opts.name,
    description: opts.description,
    numberOfItems: opts.items.length,
    itemListElement: opts.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}
