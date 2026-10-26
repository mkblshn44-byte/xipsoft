import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeBlogSlug } from "@/lib/blog-slug";

test("normalizes legacy blog slugs with a trailing date suffix", () => {
  assert.equal(
    normalizeBlogSlug(
      "mobil-seo-mobile-first-indexing-ve-responsive-design-1776190173612,2026-05-04"
    ),
    "mobil-seo-mobile-first-indexing-ve-responsive-design-1776190173612"
  );
});

test("keeps commas that are not followed by a date suffix", () => {
  assert.equal(normalizeBlogSlug("blog/post,legacy"), "post,legacy");
});

test("removes random ID sequences (format: -longNumber-shortNumber)", () => {
  assert.equal(
    normalizeBlogSlug("hec-kodu-nedir-1788902519527-6440"),
    "hec-kodu-nedir"
  );
});

test("removes single trailing numbers", () => {
  assert.equal(
    normalizeBlogSlug("some-blog-post-12345"),
    "some-blog-post"
  );
});

test("handles slug with multiple random ID patterns", () => {
  assert.equal(
    normalizeBlogSlug("android-trojan-1788902519527-6440,2026-05-04"),
    "android-trojan"
  );
});
