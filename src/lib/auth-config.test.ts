import assert from "node:assert/strict";
import { test } from "node:test";
import { getCsrfSecret, getJwtSecret } from "@/lib/auth-config";

const jwtText = () => Buffer.from(getJwtSecret()).toString("utf8");

test("ortak kök JWT ve CSRF için AYNI anahtarı üretmez (domain separation)", () => {
  const saved = { jwt: process.env.JWT_SECRET, csrf: process.env.CSRF_SECRET, db: process.env.DB_ENCRYPTION_KEY };
  delete process.env.JWT_SECRET;
  delete process.env.CSRF_SECRET;
  process.env.DB_ENCRYPTION_KEY = "shared-root-value";
  try {
    const jwt = jwtText();
    const csrf = getCsrfSecret();

    assert.notEqual(jwt, "shared-root-value", "kök doğrudan imza anahtarı olmamalı");
    assert.notEqual(csrf, "shared-root-value");
    assert.notEqual(jwt, csrf, "aynı kökten aynı anahtar türememeli");
    assert.equal(getCsrfSecret(), csrf, "türetme deterministik olmalı");
  } finally {
    for (const [key, value] of Object.entries({ JWT_SECRET: saved.jwt, CSRF_SECRET: saved.csrf, DB_ENCRYPTION_KEY: saved.db })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("amaç-bazlı secret ayrı tanımlıysa ham değeri kullanılır", () => {
  const saved = { jwt: process.env.JWT_SECRET, csrf: process.env.CSRF_SECRET };
  process.env.JWT_SECRET = "dedicated-jwt";
  process.env.CSRF_SECRET = "dedicated-csrf";
  try {
    assert.equal(jwtText(), "dedicated-jwt");
    assert.equal(getCsrfSecret(), "dedicated-csrf");
  } finally {
    for (const [key, value] of Object.entries({ JWT_SECRET: saved.jwt, CSRF_SECRET: saved.csrf })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
