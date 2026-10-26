import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeBlogTag } from "./blog-tag";

test("removes the crawl date appended to a tag query value", () => {
  assert.equal(normalizeBlogTag("javascript,2026-10-13"), "javascript");
});

test("preserves commas that are not a trailing date", () => {
  assert.equal(normalizeBlogTag("site, architecture"), "site, architecture");
});

test("uses the first value when the tag query is repeated", () => {
  assert.equal(normalizeBlogTag(["javascript", "cloud"]), "javascript");
});
