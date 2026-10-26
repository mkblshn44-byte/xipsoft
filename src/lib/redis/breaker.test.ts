import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isQuotaError,
  isRedisAvailable,
  recordRedisFailure,
  recordRedisSuccess,
} from "@/lib/redis/breaker";

/** Log satırlarını toplayarak "olay başına tek satır" iddiasını ölç. */
function captureLogs(fn: () => void): { errors: unknown[]; logs: unknown[] } {
  const errors: unknown[] = [];
  const logs: unknown[] = [];
  const originalError = console.error;
  const originalLog = console.log;
  console.error = (...args: unknown[]) => errors.push(args);
  console.log = (...args: unknown[]) => logs.push(args);
  try {
    fn();
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
  return { errors, logs };
}

// Kota mesajı gerçek prodüksiyon logosundan (UpstashError.message).
const QUOTA_ERROR = new Error(
  "Command failed: ERR max requests limit exceeded. Limit: 500000, Usage: 500000. See https://upstash.com/docs/redis/troubleshooting/max_requests_limit for details",
);

test("kota hatası sınıflandırması", () => {
  assert.equal(isQuotaError(QUOTA_ERROR), true);
  assert.equal(isQuotaError(new Error("Connection reset by peer")), false);
  assert.equal(isQuotaError(undefined), false);
});

test("kota hatası tek denemede devreyi açar", () => {
  recordRedisSuccess();
  assert.equal(isRedisAvailable(), true);

  const { errors } = captureLogs(() => recordRedisFailure(QUOTA_ERROR));
  assert.equal(isRedisAvailable(), false);
  assert.equal(errors.length, 2); // ham hata + devre açılışı
});

test("geçici hata üç ardışıkta devreyi açar", () => {
  recordRedisSuccess();
  const transient = new Error("Upstash REST 502: Bad gateway");

  const first = captureLogs(() => {
    recordRedisFailure(transient);
    recordRedisFailure(transient);
  });
  assert.equal(isRedisAvailable(), true, "iki hata devreyi açmamalı");
  assert.equal(first.errors.length, 1, "hata logu olay başına bir satır");

  captureLogs(() => recordRedisFailure(transient));
  assert.equal(isRedisAvailable(), false);
});

test("yüz başarısız deneme yüz log satırı üretmez", () => {
  recordRedisSuccess();
  const { errors } = captureLogs(() => {
    for (let i = 0; i < 100; i++) recordRedisFailure(QUOTA_ERROR);
  });
  assert.equal(errors.length, 2);
});

test("başarılı komut devreyi kapatır ve tek bir kapanış satırı yazar", () => {
  recordRedisSuccess();
  captureLogs(() => recordRedisFailure(QUOTA_ERROR));
  assert.equal(isRedisAvailable(), false);

  const { logs } = captureLogs(() => recordRedisSuccess());
  assert.equal(isRedisAvailable(), true);
  assert.equal(logs.length, 1);

  // Kapandıktan sonra tekrar tekrar "kapanış" loglanmaz.
  const again = captureLogs(() => recordRedisSuccess());
  assert.equal(again.logs.length, 0);
});

test("ardışık sayacı başarı ile sıfırlanır", () => {
  recordRedisSuccess();
  const transient = new Error("timeout");
  captureLogs(() => {
    recordRedisFailure(transient);
    recordRedisFailure(transient);
    recordRedisSuccess();
    recordRedisFailure(transient);
    recordRedisFailure(transient);
  });
  assert.equal(isRedisAvailable(), true, "başarı araya girdiği için eşik sıfırlandı");
});
