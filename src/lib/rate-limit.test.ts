import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { timingSafeEqual } from "@/lib/api-guard";
import { checkRateLimit, getClientIp, getEndpointRateLimit } from "@/lib/rate-limit";

test("content ingestion endpoints have a finite production rate limit", () => {
  for (const pathname of ["/api/bot", "/api/content"]) {
    const config = getEndpointRateLimit(pathname);
    assert.equal(config.maxRequests, 60);
    assert.equal(config.failClosed, true);
  }
});

test("rate limit path matching does not treat similarly named paths as protected endpoints", () => {
  assert.equal(getEndpointRateLimit("/api/bot-unknown").maxRequests, 200);
});

test("client IP resolution prefers the proxy-provided address over forwarded input", () => {
  const request = new NextRequest("https://xipsoft.test/api/bot", {
    headers: {
      "cf-connecting-ip": "192.0.2.10",
      "x-real-ip": "192.0.2.11",
      "x-forwarded-for": "198.51.100.1, 203.0.113.5",
    },
  });
  assert.equal(getClientIp(request), "192.0.2.10");

  const fallbackRequest = new NextRequest("https://xipsoft.test/api/bot", {
    headers: { "x-forwarded-for": "198.51.100.1, 203.0.113.5" },
  });
  assert.equal(getClientIp(fallbackRequest), "203.0.113.5");
});

test("protected endpoints fail closed in production when Redis is unavailable", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  Reflect.set(process.env, "NODE_ENV", "production");
  Reflect.deleteProperty(process.env, "UPSTASH_REDIS_REST_URL");
  Reflect.deleteProperty(process.env, "UPSTASH_REDIS_REST_TOKEN");

  try {
    const result = await checkRateLimit("test", getEndpointRateLimit("/api/bot"));
    assert.equal(result.success, false);
    assert.equal(result.unavailable, true);
  } finally {
    if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", originalNodeEnv);
    if (originalRedisUrl === undefined) Reflect.deleteProperty(process.env, "UPSTASH_REDIS_REST_URL");
    else Reflect.set(process.env, "UPSTASH_REDIS_REST_URL", originalRedisUrl);
    if (originalRedisToken === undefined) Reflect.deleteProperty(process.env, "UPSTASH_REDIS_REST_TOKEN");
    else Reflect.set(process.env, "UPSTASH_REDIS_REST_TOKEN", originalRedisToken);
  }
});

test("API key comparison accepts only exact matches", () => {
  assert.equal(timingSafeEqual("valid-secret", "valid-secret"), true);
  assert.equal(timingSafeEqual("valid-secret", "valid-secret-extra"), false);
  assert.equal(timingSafeEqual("valid-secret", "invalid-secret"), false);
});
