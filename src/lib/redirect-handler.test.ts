import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import {
  createRedirectResponse,
  handleRedirect,
  recordBlogPostSlugChange,
  type RedirectEntry,
} from "@/lib/redirect-handler";

test("blog slug changes create and flatten a permanent redirect", async () => {
  type TestRedirect = {
    source_path: string;
    target_path: string;
    status_code: number;
    is_active: boolean;
  };
  const redirects = new Map<string, TestRedirect>([
    ["/blog/older", {
      source_path: "/blog/older",
      target_path: "/blog/old",
      status_code: 301,
      is_active: true,
    }],
  ]);

  const client = {
    async query(sql: string, values: any[] = []) {
      if (sql.includes("UPDATE seo_redirects")) {
        for (const redirect of redirects.values()) {
          if (redirect.target_path === values[0] && redirect.source_path !== values[1]) {
            redirect.target_path = String(values[1]);
          }
        }
        return { rows: [] };
      }
      if (sql.includes("DELETE FROM seo_redirects")) {
        redirects.delete(String(values[0]));
        return { rows: [] };
      }
      if (sql.includes("INSERT INTO seo_redirects")) {
        redirects.set(String(values[0]), {
          source_path: String(values[0]),
          target_path: String(values[1]),
          status_code: 301,
          is_active: true,
        });
        return { rows: [] };
      }
      throw new Error(`Unexpected redirect query: ${sql}`);
    },
  };

  await recordBlogPostSlugChange(client, "old", "new");

  assert.deepEqual(redirects.get("/blog/old"), {
    source_path: "/blog/old",
    target_path: "/blog/new",
    status_code: 301,
    is_active: true,
  });
  assert.equal(redirects.get("/blog/older")?.target_path, "/blog/new");
});

test("redirect response preserves the permanent status and destination", () => {
  const request = new NextRequest("https://xipsoft.test/blog/old");
  const entry: RedirectEntry = {
    target_path: "/blog/new",
    status_code: 301,
  };

  const response = createRedirectResponse(request, entry);

  assert.ok(response);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://xipsoft.test/blog/new");
});

test("redirect handler resolves a stored entry and returns a permanent redirect", async () => {
  const request = new NextRequest("https://xipsoft.test/blog/old");
  const response = await handleRedirect(request, async (pathname) => {
    assert.equal(pathname, "/blog/old");
    return { target_path: "/blog/new", status_code: 301 };
  });

  assert.ok(response);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://xipsoft.test/blog/new");
});
