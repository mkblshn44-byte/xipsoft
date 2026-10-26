import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { GUARD_MESSAGE, xipGuardCheck } from "@/lib/security/xip-guard";

type Command = (string | number)[];

const URL = "https://upstash.example.test";
const TOKEN = "test-token";

let calls: Command[] = [];

function request(headers: Record<string, string>, pathname = "/blog/yazı"): NextRequest {
  return new NextRequest(`https://xipsoft.test${pathname}`, { headers });
}

function installFetch(reply: (cmd: Command) => unknown): void {
  calls = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const cmd = JSON.parse(String(init?.body)) as Command;
    calls.push(cmd);
    return new Response(JSON.stringify({ result: reply(cmd) }), {
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

function enableUpstash(): void {
  Reflect.set(process.env, "UPSTASH_REDIS_REST_URL", URL);
  Reflect.set(process.env, "UPSTASH_REDIS_REST_TOKEN", TOKEN);
}

function disableUpstash(): void {
  Reflect.deleteProperty(process.env, "UPSTASH_REDIS_REST_URL");
  Reflect.deleteProperty(process.env, "UPSTASH_REDIS_REST_TOKEN");
}

const clean = (cmd: Command) => String(cmd[0]);

test("Upstash env tanımsızsa guard no-op ve Redis'e hiç gitmiyor", async () => {
  disableUpstash();
  installFetch(() => 1);

  const response = await xipGuardCheck(request({ "cf-connecting-ip": "203.0.113.7" }));
  assert.equal(response, null);
  assert.equal(calls.length, 0);
});

test("/api/track ve statik dosyalar XipGuard kontrolünü tüketmez", async () => {
  enableUpstash();
  installFetch(() => 1);

  assert.equal(await xipGuardCheck(request({ "cf-connecting-ip": "203.0.113.8" }, "/api/track")), null);
  assert.equal(await xipGuardCheck(request({ "cf-connecting-ip": "203.0.113.8" }, "/assets/logo.svg")), null);
  assert.equal(await xipGuardCheck(request({ "cf-connecting-ip": "203.0.113.8" }, "/_next/other")), null);
  assert.equal(calls.length, 0);
  disableUpstash();
});

test("bloklanmış IP 403 + düz metin ile kesiliyor, sayaç okunmuyor", async () => {
  enableUpstash();
  installFetch(() => 1);

  const response = await xipGuardCheck(request({ "cf-connecting-ip": "203.0.113.7" }));
  assert.equal(response?.status, 403);
  assert.equal(await response?.text(), GUARD_MESSAGE);
  assert.deepEqual(calls, [["EXISTS", "xip:block:203.0.113.7"]]);
  assert.equal(response?.headers.get("content-type"), "text/plain; charset=utf-8");
});

test("pencere aşımında geçici blok yazılıyor ve 429 dönüyor", async () => {
  enableUpstash();
  installFetch((cmd) => (clean(cmd) === "INCR" ? 36 : "OK"));

  const response = await xipGuardCheck(request({ "cf-connecting-ip": "198.51.100.9" }));
  assert.equal(response?.status, 429);
  assert.equal(await response?.text(), GUARD_MESSAGE);
  assert.equal(response?.headers.get("retry-after"), "3600");
  assert.deepEqual(calls, [
    ["EXISTS", "xip:block:198.51.100.9"],
    ["INCR", "xip:ratelimit:198.51.100.9"],
    ["SET", "xip:block:198.51.100.9", "1", "EX", 3600],
  ]);
});

test("TTL yalnızca pencerenin ilk vuruşunda set ediliyor", async () => {
  enableUpstash();
  installFetch((cmd) => (clean(cmd) === "INCR" ? 12 : "OK"));

  const response = await xipGuardCheck(request({ "cf-connecting-ip": "198.51.100.10" }));
  assert.equal(response, null);
  assert.deepEqual(calls, [["EXISTS", "xip:block:198.51.100.10"], ["INCR", "xip:ratelimit:198.51.100.10"]]);

  installFetch((cmd) => (clean(cmd) === "INCR" ? 1 : "OK"));
  await xipGuardCheck(request({ "cf-connecting-ip": "198.51.100.11" }));
  assert.deepEqual(calls.map(clean), ["EXISTS", "INCR", "EXPIRE"]);
});

test("loopback ve arama motoru botları guard dışında", async () => {
  enableUpstash();
  installFetch(() => 1);

  assert.equal(await xipGuardCheck(request({ "cf-connecting-ip": "127.0.0.1" })), null);
  assert.equal(
    await xipGuardCheck(
      request({ "cf-connecting-ip": "203.0.113.7", "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" }),
    ),
    null,
  );
  assert.equal(calls.length, 0);
});

test("istemcinin yazdığı X-Forwarded-For girdisi kimlik kararı vermez", async () => {
  enableUpstash();
  installFetch(() => 0);

  await xipGuardCheck(request({ "x-forwarded-for": "8.8.8.8, 203.0.113.7" }));
  assert.deepEqual(calls, [["EXISTS", "xip:block:203.0.113.7"], ["INCR", "xip:ratelimit:203.0.113.7"]]);
});

test("Redis hatası akışı bloklamıyor (fail-open)", async () => {
  enableUpstash();
  globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;

  assert.equal(await xipGuardCheck(request({ "cf-connecting-ip": "203.0.113.7" })), null);
  disableUpstash();
});
