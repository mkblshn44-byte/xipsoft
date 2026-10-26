import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";
import { NextRequest } from "next/server";
import { checkRateLimit, getRateLimitBucket } from "@/lib/rate-limit";
import { checkRateLimit as middlewareCheckRateLimit } from "@/middleware-utils/rate-limiter";
import { isRedisAvailable, recordRedisSuccess } from "@/lib/redis/breaker";

/**
 * Sahte Upstash REST sunucusu. SDK tek komutu bile `POST /pipeline`'e JSON
 * komut dizisi olarak gönderiyor ve yanıtı dizi bekliyor (`res.map`), o yüzden
 * başarılı cevap `{ result: N }` nesnelerinin dizisidir. Kaç HTTP isteği
 * geldiğini saymak, testin asıl amacı: komuta maliyeti burada ölçülür.
 */
let server: Server;
let hits: number[] = [];
let nextResult = 1;
let failWith: { status: number; error: string } | null = null;

function requestFor(pathname: string, ip: string): NextRequest {
  return new NextRequest(`https://xipsoft.dev${pathname}`, {
    headers: { "x-forwarded-for": ip },
  });
}

before(async () => {
  await new Promise<void>((resolve) => {
    server = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        hits.push(1);
        if (failWith) {
          res.writeHead(failWith.status, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: failWith.error }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify([{ result: nextResult }]));
      });
    });
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${address && typeof address === "object" ? address.port : 0}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
});

after(() => {
  server.close();
});

function reset(fixture: { result?: number; fail?: { status: number; error: string } } = {}) {
  hits = [];
  nextResult = fixture.result ?? 1;
  failWith = fixture.fail ?? null;
  recordRedisSuccess();
}

test("kova kararı: varsayılan limit IP başına tek kovada, özel limit kendi kovasında", () => {
  const page = getRateLimitBucket("/hizmetler/web-yazilim-tasarim/kocaeli-izmit");
  assert.equal(page.endpointSpecific, false);
  assert.equal(page.keyPrefix, "middleware");

  const otherPage = getRateLimitBucket("/blog/edge-ai-on-device-machine-learning");
  assert.equal(otherPage.keyPrefix, page.keyPrefix, "aynı IP iki yolda artık iki kova değil");

  const admin = getRateLimitBucket("/admin/kullanicilar");
  assert.equal(admin.endpointSpecific, true);
  assert.equal(admin.keyPrefix, "middleware:admin");
  assert.equal(admin.config.maxRequests, 100);

  const teklif = getRateLimitBucket("/api/teklif");
  assert.equal(teklif.keyPrefix, "middleware:apiteklif");
  assert.equal(teklif.config.maxRequests, 5);
});

test("sıradan ziyaretçi Redis'e hiç ulaşmaz (yerel ön-eşik)", async () => {
  reset();
  const ip = "198.51.100.11";

  // freeLocalRequests = max(10, 200*0.1) = 20
  for (let i = 0; i < 20; i++) {
    const response = await middlewareCheckRateLimit(requestFor("/blog", ip), "/blog");
    assert.equal(response, null);
  }
  assert.equal(hits.length, 0, "eşik altı trafiğin Redis maliyeti sıfır olmalı");

  await middlewareCheckRateLimit(requestFor("/blog", ip), "/blog");
  assert.equal(hits.length, 1, "eşiği aşan IP tek komutla paylaşımlı sayaçtan geçer");
});

test("/api/track middleware rate limitini tüketmez", async () => {
  reset();

  const response = await middlewareCheckRateLimit(requestFor("/api/track", "198.51.100.13"), "/api/track");
  assert.equal(response, null);
  assert.equal(hits.length, 0);
});

test("/api/track flood'u süreç içi eşikle düşer, Redis kovası açmaz", async () => {
  reset();
  const ip = "198.51.100.15";

  for (let i = 1; i <= 30; i++) {
    assert.equal(await middlewareCheckRateLimit(requestFor("/api/track", ip), "/api/track"), null, `${i}. beacon geçmeli`);
  }

  const dropped = await middlewareCheckRateLimit(requestFor("/api/track", ip), "/api/track");
  assert.equal(dropped?.status, 204, "31. beacon sessiz düşmeli");
  assert.equal(hits.length, 0, "telemetri yolu paylaşımlı sayaça hiç dokunmamalı");
});

test("middleware API yolunda Redis hatası fail-open geçer", async () => {
  reset({ fail: { status: 500, error: "Redis unavailable" } });
  // Next 15 `process.env`'i tipli biçimde readonly kaplıyor; test ortamı
  // değiştirmek için dar bir cast yeterli.
  const env = process.env as Record<string, string | undefined>;
  const previousNodeEnv = env.NODE_ENV;
  const originalError = console.error;
  env.NODE_ENV = "production";
  console.error = () => undefined;

  try {
    const ip = "198.51.100.14";
    for (let i = 0; i < 20; i++) {
      assert.equal(await middlewareCheckRateLimit(requestFor("/api/other", ip), "/api/other"), null);
    }

    const response = await middlewareCheckRateLimit(requestFor("/api/other", ip), "/api/other");
    assert.equal(response, null);
    assert.equal(hits.length, 1, "yalnızca yerel ön-eşik sonrası Redis denenmeli");
  } finally {
    env.NODE_ENV = previousNodeEnv;
    console.error = originalError;
  }
});

test("özel limitli yol ön-eşiği atlar, her istek paylaşımlı sayaca gider", async () => {
  reset({ result: 3 });
  const ip = "198.51.100.12";

  for (let i = 0; i < 3; i++) {
    await middlewareCheckRateLimit(requestFor("/admin/login", ip), "/admin/login");
  }
  assert.equal(hits.length, 3);
});

test("sayaç limitte ise 429, altında ise geçiş", async () => {
  reset({ result: 201 });
  const result = await checkRateLimit("203.0.113.9", { windowMs: 600_000, maxRequests: 200 });
  assert.equal(result.success, false);
  assert.equal(result.remaining, 0);
  assert.ok(result.retryAfter !== undefined && result.retryAfter > 0);
  assert.ok(result.retryAfter! <= 600_000, "retry-after pencereyi aşamaz");

  reset({ result: 5 });
  const under = await checkRateLimit("203.0.113.9", { windowMs: 600_000, maxRequests: 200 });
  assert.equal(under.success, true);
  assert.equal(under.remaining, 195);
});

test("kota doluysa devre açılır ve istekler Redis'e hiç gitmeden akar", async () => {
  reset({ fail: { status: 429, error: "ERR max requests limit exceeded. Limit: 500000, Usage: 500000." } });

  const originalError = console.error;
  console.error = () => undefined;
  try {
    const blocked = await checkRateLimit("203.0.113.10", { windowMs: 600_000, maxRequests: 200 });
    assert.equal(blocked.success, true, "Redis'sız sayfalar fail-open geçer");
    assert.equal(isRedisAvailable(), false, "kota hatası devreyi tek denemede açar");

    const hitsAfterOpen = hits.length;
    for (let i = 0; i < 50; i++) {
      await checkRateLimit(`203.0.113.${i}`, { windowMs: 600_000, maxRequests: 200 });
    }
    assert.equal(hits.length, hitsAfterOpen, "devre açıkken tek bir HTTP isteği bile gitmemeli");
  } finally {
    console.error = originalError;
    recordRedisSuccess();
  }
});
