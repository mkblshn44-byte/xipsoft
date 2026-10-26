import assert from "node:assert/strict";
import { test } from "node:test";

import { parseSchemaMarkupInput, toSchemaMarkup } from "./schema-markup";

test("toSchemaMarkup JSONB nesne/dizi değerlerini şema listesine indirger", () => {
  const a = { "@context": "https://schema.org", "@type": "Service" };
  assert.deepEqual(toSchemaMarkup(a), [a]);
  assert.deepEqual(toSchemaMarkup([a, a]), [a, a]);
});

test("toSchemaMarkup çift kodlanmış JSON string'ini de okur", () => {
  assert.deepEqual(toSchemaMarkup('[{"@type":"FAQPage"}]'), [{ "@type": "FAQPage" }]);
});

test("toSchemaMarkup bozuk ya da şema olmayan değeri düşürür", () => {
  assert.equal(toSchemaMarkup(null), null);
  assert.equal(toSchemaMarkup(""), null);
  assert.equal(toSchemaMarkup("{bozuk"), null);
  assert.equal(toSchemaMarkup("düz metin"), null);
  assert.equal(toSchemaMarkup([{ description: "@type yok" }]), null);
  assert.equal(toSchemaMarkup([["@type", "Service"]]), null);
});

test("parseSchemaMarkupInput tek nesneyi diziye sarar, boş alanı NULL yapar", () => {
  assert.equal(parseSchemaMarkupInput(""), null);
  assert.equal(parseSchemaMarkupInput("   "), null);
  assert.equal(parseSchemaMarkupInput('{"@type":"Service"}'), '[{"@type":"Service"}]');
  assert.equal(parseSchemaMarkupInput('[{"@type":"Service"}]'), '[{"@type":"Service"}]');
});

test("parseSchemaMarkupInput geçersiz JSON'da kayıt öncesi hata fırlatır", () => {
  assert.throws(() => parseSchemaMarkupInput("{bozuk"), /geçerli JSON değil/);
  assert.throws(() => parseSchemaMarkupInput('"metin"'), /olmalıdır/);
  assert.throws(() => parseSchemaMarkupInput('[["nested"]]'), /olmalıdır/);
});
