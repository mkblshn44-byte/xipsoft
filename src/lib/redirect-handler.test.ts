import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import {
  canonicalizeTargetPath,
  createRedirectResponse,
  handleRedirect,
  recordBlogPostSlugChange,
  targetPathPolicy,
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

test("stored uzantısız hedef, ağaç sahibi ise tek hop'ta .html kanoniğine çözülür", () => {
  const request = new NextRequest("https://xipsoft.test/hizmetler/web-yazilim-tasarim");
  const response = createRedirectResponse(
    request,
    { target_path: "/hizmetler/web-yazilim-tasarim1", status_code: 301 },
    { isTreeOwned: () => true },
  );

  assert.ok(response);
  assert.equal(
    response.headers.get("location"),
    "https://xipsoft.test/hizmetler/web-yazilim-tasarim1.html",
  );
});

test("stored uzantısız hedef, ağaca ait değilse uzantısız kalır (döngü yok)", () => {
  const request = new NextRequest("https://xipsoft.test/hizmetler/web-yazilim-tasarim");
  const response = createRedirectResponse(
    request,
    { target_path: "/hizmetler/web-yazilim-tasarim1", status_code: 301 },
    { isTreeOwned: () => false },
  );

  assert.ok(response);
  assert.equal(
    response.headers.get("location"),
    "https://xipsoft.test/hizmetler/web-yazilim-tasarim1",
  );
});

test("handleRedirect sahiplik kararını VERİDEN okuyup hedefi tek hop'ta çözer", async () => {
  const request = new NextRequest("https://xipsoft.test/hizmetler/eski-hizmet");
  const asked: string[] = [];

  const owned = await handleRedirect(
    request,
    async () => ({ target_path: "/hizmetler/yeni-hizmet", status_code: 301 }),
    async (path) => {
      asked.push(path);
      return true;
    },
  );

  assert.ok(owned);
  assert.equal(owned.headers.get("location"), "https://xipsoft.test/hizmetler/yeni-hizmet.html");
  assert.deepEqual(asked, ["/hizmetler/yeni-hizmet"]);
});

test("handleRedirect EXACT kod rotasi hedefi için ağaca hiç sormaz", async () => {
  const request = new NextRequest("https://xipsoft.test/eski-hakkimizda");
  let treeCalls = 0;

  const response = await handleRedirect(
    request,
    async () => ({ target_path: "/hakkimizda", status_code: 301 }),
    async () => {
      treeCalls++;
      return true;
    },
  );

  assert.ok(response);
  assert.equal(response.headers.get("location"), "https://xipsoft.test/hakkimizda");
  assert.equal(treeCalls, 0, "EXACT rotada sahiplik sorgusu gereksiz");
});

test("canonicalizeTargetPath uzantısız kanonik rotalara ve sorgu kuyruğuna dokunmaz", () => {
  assert.equal(canonicalizeTargetPath("/blog/yazi"), "/blog/yazi");
  assert.equal(canonicalizeTargetPath("/hizmetler"), "/hizmetler");
  assert.equal(canonicalizeTargetPath("/"), "/");
  assert.equal(canonicalizeTargetPath("/urunler/telefon"), "/urunler/telefon");
  assert.equal(canonicalizeTargetPath("/iletisim?utm=1"), "/iletisim.html?utm=1");
  assert.equal(
    canonicalizeTargetPath("https://xipsoft.test/hizmetler/x"),
    "https://xipsoft.test/hizmetler/x",
  );
});

test("targetPathPolicy yalnızca veriden değişebilen yollarda sorgu atar", async () => {
  let calls = 0;
  const treeLookup = async () => {
    calls++;
    return true;
  };

  assert.equal(await targetPathPolicy("/hakkimizda", treeLookup), undefined);
  assert.equal(await targetPathPolicy("/iletisim.html", treeLookup), undefined);
  assert.equal(await targetPathPolicy("/hizmetler", treeLookup), undefined);
  assert.equal(calls, 0, "EXACT ve önek-listesi-dışı hedefler ağaca sorulmaz");

  const policy = await targetPathPolicy("/hizmetler/web-yazilim?utm=1", treeLookup);
  assert.equal(calls, 1);
  assert.equal(policy?.isTreeOwned?.("/hizmetler/web-yazilim"), true);
  assert.equal(
    canonicalizeTargetPath("/hizmetler/web-yazilim?utm=1", policy),
    "/hizmetler/web-yazilim.html?utm=1",
  );
});
