/**
 * schema/website.ts — `WebSite` JSON-LD üreticisi (site geneli varlık).
 *
 * Organization düğümüne `publisher` ile bağlanır; böylece Google site ile
 * marka arasındaki ilişkiyi tek bir grafiğin parçası olarak okur.
 */

import { SITE_URL } from "@/lib/site-url";
import { APP_CONFIG, BRAND } from "@/config/brand.config";
import { SCHEMA_CONTEXT } from "./shared";

export function websiteSchema() {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: BRAND.name,
    url: SITE_URL,
    description: APP_CONFIG.description,
    // Yalnızca TR yayında (/en route yok) — hreflang ve inLanguage tek dil.
    inLanguage: "tr-TR",
    publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization` },
  };
}
