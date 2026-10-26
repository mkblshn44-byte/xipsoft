import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptSecret, encryptSecret, isWrappedSecret } from "@/lib/secret-box";

const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("anahtar varken sır sarılıp geri çözülür", () => {
  process.env.SECRET_ENCRYPTION_KEY = "test-root-key-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  try {
    const wrapped = encryptSecret(SECRET);
    assert.equal(isWrappedSecret(wrapped), true);
    assert.equal(wrapped.includes(SECRET), false, "sır metni sarımda görünmemeli");
    assert.equal(decryptSecret(wrapped), SECRET);
  } finally {
    delete process.env.SECRET_ENCRYPTION_KEY;
  }
});

test("aynı sır iki kez sarıldığında farklı sarım üretir (rastgele IV)", () => {
  process.env.SECRET_ENCRYPTION_KEY = "test-root-key-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  try {
    assert.notEqual(encryptSecret(SECRET), encryptSecret(SECRET));
  } finally {
    delete process.env.SECRET_ENCRYPTION_KEY;
  }
});

test("önekli olmayan eski düz metin satırı olduğu gibi okunur", () => {
  assert.equal(decryptSecret(SECRET), SECRET);
  assert.equal(isWrappedSecret(SECRET), false);
});

test("bozuk veya yabancı anahtarla sarılmış değer sessizce çözülmez", () => {
  process.env.SECRET_ENCRYPTION_KEY = "test-root-key-cccccccccccccccccccccccccccccccc";
  try {
    const wrapped = encryptSecret(SECRET);
    const [prefix, iv, tag, data] = [wrapped.slice(0, 3), ...wrapped.slice(3).split(":")];
    assert.equal(prefix, "v1:");
    const tampered = `${prefix}${iv}:${tag}:${data.slice(0, -2)}AA`;
    assert.throws(() => decryptSecret(tampered));
    assert.throws(() => decryptSecret("v1:abc:def"));
  } finally {
    delete process.env.SECRET_ENCRYPTION_KEY;
  }
});

test("anahtarsız production sarımı reddeder, development düz metne düşer", () => {
  // Next'in tipleri process.env.NODE_ENV'i salt-okunur ilan ediyor; tanım
  // üzerinde yazmak yerine özelliği yeniden tanımlıyoruz.
  const setNodeEnv = (value: string | undefined) =>
    Object.defineProperty(process.env, "NODE_ENV", {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  const previous = process.env.NODE_ENV;
  delete process.env.SECRET_ENCRYPTION_KEY;
  delete process.env.DB_ENCRYPTION_KEY;
  try {
    setNodeEnv("production");
    assert.throws(() => encryptSecret(SECRET), /SECRET_ENCRYPTION_KEY/);
    setNodeEnv("development");
    assert.equal(encryptSecret(SECRET), SECRET);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else setNodeEnv(previous);
  }
});
