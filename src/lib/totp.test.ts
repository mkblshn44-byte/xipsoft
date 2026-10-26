import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BASE32_ALPHABET,
  computeTotp,
  decodeBase32,
  encodeBase32,
  generateTotpSecret,
  verifyTotp,
} from "@/lib/totp";

// RFC 4648 vektörü: ASCII "12345678901234567890"
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("alfabe RFC 4648'dir: küçültülmüş karakter yok, 32 benzersiz simge", () => {
  assert.equal(BASE32_ALPHABET, "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567");
  assert.equal(new Set(BASE32_ALPHABET).size, 32);
  assert.equal(BASE32_ALPHABET.toLowerCase() === BASE32_ALPHABET, false);
  assert.ok(!BASE32_ALPHABET.includes("g"));
  assert.ok(BASE32_ALPHABET.includes("G"));
});

test("encode/decode base32 RFC 4648 vektöründe buluşur", () => {
  assert.equal(encodeBase32(Buffer.from("12345678901234567890")), RFC_SECRET);
  assert.deepEqual([...decodeBase32(RFC_SECRET)!], [...Buffer.from("12345678901234567890")]);
});

test("computeTotp RFC 4226/6238 referans kodlarını üretir", () => {
  const key = decodeBase32(RFC_SECRET)!;
  assert.equal(computeTotp(key, 0), "755224");
  assert.equal(computeTotp(key, 1), "287082");
  assert.equal(computeTotp(key, 2), "359152");
});

test("verifyTotp pencere içindeki kodu kabul eder, dışındakini reddeder", () => {
  const now = 59_000; // adım 1 → 287082
  assert.equal(verifyTotp(RFC_SECRET, "287082", { now }), true);
  assert.equal(verifyTotp(RFC_SECRET, "755224", { now }), true); // -1 adım
  assert.equal(verifyTotp(RFC_SECRET, "359152", { now }), true); // +1 adım
  assert.equal(verifyTotp(RFC_SECRET, "000000", { now }), false);
});

test("üretilen secret 'G' içerirse doğrulama yine geçer (bozuk alfabe regresyonu)", () => {
  // Eski alfabe 7. simgeyi 'g' olarak üretiyordu; uppercase decode onu atlayıp
  // HMAC anahtarını kısaltıyordu ve kurulum %64 olasılıkla asla doğrulanamıyordu.
  let withG: string | null = null;
  for (let i = 0; i < 2000 && !withG; i++) {
    const candidate = generateTotpSecret();
    if (candidate.includes("G")) withG = candidate;
  }
  assert.ok(withG, "G içeren secret örneklenemedi");

  const bytes = decodeBase32(withG!);
  assert.ok(bytes && bytes.length === 20, "G içeren secret kısaltılmamalı");
  const code = computeTotp(bytes!, 1);
  assert.equal(verifyTotp(withG!.toLowerCase(), code, { now: 30_000 }), true);
});

test("decodeBase32 tanısız karakteri sessiz atlamak yerine reddeder", () => {
  assert.equal(decodeBase32("GEZDG!NBVGY"), null);
  assert.equal(decodeBase32("===="), null);
  assert.equal(decodeBase32(""), null);
});
