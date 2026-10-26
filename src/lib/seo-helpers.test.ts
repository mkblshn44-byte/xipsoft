import assert from "node:assert/strict";
import { test } from "node:test";

import { buildPageMetadata, parseRobotsDirective } from "./seo-helpers";

test("parseRobotsDirective boş/tanısız değerlerde undefined döner", () => {
  assert.equal(parseRobotsDirective(null), undefined);
  assert.equal(parseRobotsDirective("   "), undefined);
});

test("parseRobotsDirective bilinen direktifleri çevirir", () => {
  assert.deepEqual(parseRobotsDirective("noindex, nofollow"), { index: false, follow: false });
  assert.deepEqual(parseRobotsDirective("noindex"), { index: false });
  assert.deepEqual(parseRobotsDirective("all"), { index: true, follow: true });
  assert.deepEqual(parseRobotsDirective("none"), { index: false, follow: false });
});

test("parseRobotsDirective ek direktifleri googleBot üzerinden iletir", () => {
  const robots = parseRobotsDirective("noindex, noarchive, max-snippet:-1");
  assert.equal(robots?.index, false);
  const googleBot = (robots as { googleBot: Record<string, unknown> }).googleBot;
  assert.equal(googleBot.noarchive, true);
  assert.equal(googleBot["max-snippet"], -1);
});

test("DB'deki robots kararı indexable bayrağını ezer", () => {
  const metadata = buildPageMetadata({
    title: "Deneme",
    description: "Açıklama",
    canonicalPath: "/deneme",
    indexable: true,
    robotsOverride: "noindex, nofollow",
  });
  assert.deepEqual(metadata.robots, { index: false, follow: false });
});

test("robots boşsa indexable kararına göre standart çıktı üretilir", () => {
  const metadata = buildPageMetadata({
    title: "Deneme",
    description: "Açıklama",
    canonicalPath: "/deneme",
    indexable: false,
  });
  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.match(String(metadata.alternates?.canonical), /^https:\/\//);
});
