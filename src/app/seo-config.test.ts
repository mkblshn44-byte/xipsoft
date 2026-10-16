import assert from "node:assert/strict";
import { test } from "node:test";

import { toSitemapEntry } from "./sitemap";
import { TRACKING_QUERY_PARAMS } from "./robots";

test("sitemap entries keep URL + lastModified only", () => {
  const entry = toSitemapEntry("https://example.com/blog/demo", new Date("2026-01-01T12:00:00.000Z"));

  assert.deepEqual(entry, {
    url: "https://example.com/blog/demo",
    lastModified: new Date("2026-01-01T12:00:00.000Z"),
  });
  assert.ok(!("priority" in entry) || entry.priority === undefined);
  assert.ok(!("changeFrequency" in entry) || entry.changeFrequency === undefined);
});

test("robots query params are centralized and deduplicated", () => {
  assert.ok(TRACKING_QUERY_PARAMS.includes("utm_source"));
  assert.ok(TRACKING_QUERY_PARAMS.includes("fbclid"));
  assert.ok(TRACKING_QUERY_PARAMS.includes("gclid"));
  assert.equal(new Set(TRACKING_QUERY_PARAMS).size, TRACKING_QUERY_PARAMS.length);
});
