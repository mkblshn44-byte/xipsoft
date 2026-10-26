import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bumpLocalWindow,
  isLocallyBlocked,
  noteLocalBlock,
  shouldProbe,
} from "@/lib/security/local-window";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("sabit pencere sayacı aynı pencerede artar, sonraki pencerede sıfırlanır", async () => {
  const key = `t:win:${Date.now()}`;

  assert.equal(bumpLocalWindow(key, 60_000).count, 1);
  assert.equal(bumpLocalWindow(key, 60_000).count, 2);
  assert.equal(bumpLocalWindow(key, 60_000).count, 3);

  // 1ms'lik pencerede her çağrı kendi kutusuna düşer.
  assert.equal(bumpLocalWindow(`${key}:fast`, 1).count, 1);
  await sleep(3);
  assert.equal(bumpLocalWindow(`${key}:fast`, 1).count, 1);
});

test("pencereler anahtar bazında izole", () => {
  const stamp = Date.now();
  assert.equal(bumpLocalWindow(`t:a:${stamp}`, 60_000).count, 1);
  assert.equal(bumpLocalWindow(`t:a:${stamp}`, 60_000).count, 2);
  assert.equal(bumpLocalWindow(`t:b:${stamp}`, 60_000).count, 1);
});

test("shouldProbe interval başına tek yoklama verir", async () => {
  const key = `t:probe:${Date.now()}`;
  assert.equal(shouldProbe(key, 30), true);
  assert.equal(shouldProbe(key, 30), false);
  assert.equal(shouldProbe(key, 30), false);
  await sleep(35);
  assert.equal(shouldProbe(key, 30), true);
});

test("yerel engel ttl boyunca doğru, süresi dolunca yanlış döner", async () => {
  const ip = `203.0.113.${Date.now() % 250}`;
  assert.equal(isLocallyBlocked(ip), false);

  noteLocalBlock(ip, 40);
  assert.equal(isLocallyBlocked(ip), true);

  await sleep(50);
  assert.equal(isLocallyBlocked(ip), false);
});

test("LRU sınırı: kapasiteyi aşan anahtar kümesi en eskisini düşürür", () => {
  const first = "t:lru:first";
  noteLocalBlock(first, 60_000);
  assert.equal(isLocallyBlocked(first), true);

  // MAX_KEYS (20_000) üzerinde yeni anahtar: en eski giriş yerini devretmiş olmalı.
  for (let i = 0; i < 20_250; i++) {
    noteLocalBlock(`t:lru:${i}`, 60_000);
  }
  assert.equal(isLocallyBlocked(first), false);
});
