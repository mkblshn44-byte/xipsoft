import assert from "node:assert/strict";
import { test } from "node:test";

import {
  invalidatePageCaches,
  pageCacheKey,
  pageKeysForCategory,
  pageKeysForSlug,
  withPageCache,
} from "./page-cache";

// Bu testler Redis'siz ortamda koşar: `UPSTASH_REDIS_REST_URL` tanımsızken
// katmanın DB'ye düşmesi (graceful degradation) beklenen davranıştır.

test("pageCacheKey normalize edilmiş girdi için stabil üretilir", () => {
  assert.equal(pageCacheKey("slug", "/Hizmetler/Web-Yazilim/"), pageCacheKey("slug", "hizmetler/web-yazilim"));
  assert.notEqual(pageCacheKey("slug", "a"), pageCacheKey("tree", "a"));
  assert.match(pageCacheKey("slug", "a"), /^page:slug:[0-9a-f]{40}$/);
});

test("Redis yoksa withPageCache doğrudan yükleyiciye düşer", async () => {
  let calls = 0;
  const load = async () => {
    calls += 1;
    return { slug: "deneme" };
  };
  const first = await withPageCache(pageCacheKey("slug", "deneme"), load);
  const second = await withPageCache(pageCacheKey("slug", "deneme"), load);

  assert.deepEqual(first, { slug: "deneme" });
  assert.deepEqual(second, { slug: "deneme" });
  assert.equal(calls, 2, "Redis yoksa her okuma DB'ye inmelidir");
});

test("Redis yoksa invalidation sessizce no-op olur", async () => {
  await assert.doesNotReject(() =>
    invalidatePageCaches({ slugs: ["a/b"], categories: ["home"], sitemap: true }),
  );
});

test("slug ve kategori invalidasyonu doğru anahtar kümelerini hedefler", () => {
  const slugKeys = pageKeysForSlug("hizmetler/web");
  assert.equal(slugKeys.length, 4);
  assert.ok(slugKeys.every((key) => key.startsWith("page:")));
  assert.ok(slugKeys.includes(pageCacheKey("svc", "hizmetler/web")));

  const catKeys = pageKeysForCategory("home");
  assert.ok(catKeys.includes(pageCacheKey("cat", "home")));
  assert.ok(catKeys.includes(pageCacheKey("cat", "faq:home")));
  assert.ok(catKeys.includes(pageCacheKey("cat", "meta:home")));
});
