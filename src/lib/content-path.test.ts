import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canonicalPathForNode,
  contentCanonicalPath,
  isExtensionlessRoute,
  normalizeContentPath,
  stripContentExtension,
  treeNodeCanonicalPath,
} from "./content-path";

test("stripContentExtension .html uzantısını söker", () => {
  assert.equal(stripContentExtension("gundem.html"), "gundem");
  assert.equal(stripContentExtension("a.html.html"), "a");
  assert.equal(stripContentExtension("haberler/gundem.html"), "haberler/gundem");
  assert.equal(stripContentExtension("gundem"), "gundem");
});

test("contentCanonicalPath .html kanoniği üretir (idempotent)", () => {
  assert.equal(contentCanonicalPath("haberler/gundem"), "/haberler/gundem.html");
  assert.equal(contentCanonicalPath("haberler/gundem.html"), "/haberler/gundem.html");
  assert.equal(contentCanonicalPath("/haberler/gundem/"), "/haberler/gundem.html");
  assert.equal(contentCanonicalPath("haberler/gundem/aksamcilar-nerde"), "/haberler/gundem/aksamcilar-nerde.html");
});

test("normalizeContentPath .html'i slugify'dan önce söker", () => {
  assert.equal(normalizeContentPath(["haberler", "gundem.html"]), "haberler/gundem");
  assert.equal(normalizeContentPath(["Haberler", "Gündem.HTML"]), "haberler/gundem");
  assert.equal(normalizeContentPath(["haberler", "gundem", "aksamcilar-nerde.html"]), "haberler/gundem/aksamcilar-nerde");
});

test("normalizeContentPath geçersiz girdide null döner", () => {
  assert.equal(normalizeContentPath([]), null);
  assert.equal(normalizeContentPath(["!!!"]), null);
  assert.equal(normalizeContentPath(["a", "", "b"]), null);
});

test("normalizeContentPath sınırsız derinliği destekler (güvenlik üst sınırı dâhilinde)", () => {
  const deep = Array.from({ length: 12 }, (_, index) => `seviye-${index}`);
  assert.equal(normalizeContentPath(deep), deep.join("/"));
});

// ── Veri odaklı `.html` kanoniği (Kırık Link → Sayfa Aç) ────────────────────

test("legacy kök listesi tek başına .html'i söker (eski davranış)", () => {
  assert.equal(isExtensionlessRoute("/forum/a/b"), true);
  assert.equal(contentCanonicalPath("forum/a/b"), "/forum/a/b");
});

test("ağaç sahipliği legacy kök listesini ezer → .html KANONİK kalır", () => {
  const owned = { isTreeOwned: (path: string) => path === "/forum/a/b" };
  assert.equal(isExtensionlessRoute("/forum/a/b", owned), false);
  assert.equal(contentCanonicalPath("forum/a/b", owned), "/forum/a/b.html");
  // Sahiplenilmeyen komşu yol eski davranışı korur.
  assert.equal(contentCanonicalPath("forum/a/c", owned), "/forum/a/c");
});

test("kod rotaları (EXACT) veri karşısında da uzantısız kalır", () => {
  const always = { isTreeOwned: () => true };
  assert.equal(isExtensionlessRoute("/blog", always), true);
  assert.equal(isExtensionlessRoute("/hizmetler", always), true);
  assert.equal(contentCanonicalPath("hizmetler", always), "/hizmetler");
  // Sahiplenme kararı prefix listesinden ÖNCE gelir: sahiplenilen alt yol
  // `.html` kalır (admin'in /hizmetler altına açtığı custom düğüm durumu).
  assert.equal(isExtensionlessRoute("/hizmetler/web-uygulama", always), false);
});

test("hizmet/konum adresleri canlı tasarımı korur: UZANTISIZ kanonik", () => {
  // Ölçülen canlı referans (xipsoft.net): canonical=https://xipsoft.net/hizmetler/blockchain-web3/adana
  assert.equal(isExtensionlessRoute("/hizmetler/blockchain-web3"), true);
  assert.equal(contentCanonicalPath("hizmetler/blockchain-web3"), "/hizmetler/blockchain-web3");
  assert.equal(
    contentCanonicalPath("hizmetler/blockchain-web3/adana-cukurova"),
    "/hizmetler/blockchain-web3/adana-cukurova",
  );
  // Sahiplenme filtresi (kind='custom') bu satırlara uygulanmadığı için
  // middleware de uzantıyı söker; iki taraf aynı adresi üretir → döngü yok.
  assert.equal(
    contentCanonicalPath("hizmetler/blockchain-web3/adana", { isTreeOwned: () => false }),
    "/hizmetler/blockchain-web3/adana",
  );
});

test("kind='custom' düğümü sahiplendiği yol için .html kanonik üretir", () => {
  // Aynı kökün altındaki admin içeriği uzantı KORUR (kırık link → sayfa aç).
  assert.equal(treeNodeCanonicalPath("hizmetler/kirik-test-hizmet"), "/hizmetler/kirik-test-hizmet.html");
  assert.equal(treeNodeCanonicalPath("forum/kirik-bir-sey"), "/forum/kirik-bir-sey.html");
});

test("treeNodeCanonicalPath yayınlanmış düğümün adresini üretir", () => {
  assert.equal(treeNodeCanonicalPath("haberler/gundem"), "/haberler/gundem.html");
  assert.equal(treeNodeCanonicalPath("forum/sdasd/sada"), "/forum/sdasd/sada.html");
  assert.equal(treeNodeCanonicalPath("hizmetler/mobil-uygulama"), "/hizmetler/mobil-uygulama.html");
  assert.equal(treeNodeCanonicalPath("hizmetler/mobil-uygulama/istanbul"), "/hizmetler/mobil-uygulama/istanbul.html");
});

test("canonicalPathForNode uzantı kararını kind'e göre ikiye ayırır", () => {
  // custom → .html; service/location → uzantısız. Aynı kök, iki farklı kanonik.
  assert.equal(canonicalPathForNode({ fullPath: "haberler/gundem", kind: "custom" }), "/haberler/gundem.html");
  assert.equal(canonicalPathForNode({ fullPath: "hizmetler/mobil-uygulama", kind: "service" }), "/hizmetler/mobil-uygulama");
  assert.equal(
    canonicalPathForNode({ fullPath: "hizmetler/mobil-uygulama/elazig-palu", kind: "location" }),
    "/hizmetler/mobil-uygulama/elazig-palu",
  );
  // Admin'in hizmet kökü altına açtığı YENİ düğüm .html korur (sahiplenen yol).
  assert.equal(
    canonicalPathForNode({ fullPath: "hizmetler/kirik-test-hizmet", kind: "custom" }),
    "/hizmetler/kirik-test-hizmet.html",
  );
});

test("DATABASE_URL yoksa politika fail-open: liste kararı aynen geçerli", async () => {
  const { shouldStripHtmlExtension } = await import("../middleware-utils/seo-normalize");
  // Legacy kök → sökülür (eski forum URL'leri eskisi gibi /blog akışına düşer).
  assert.equal(await shouldStripHtmlExtension("/forum/a/b"), true);
  assert.equal(await shouldStripHtmlExtension("/news/eski-yazi"), true);
  // Kod rotaları → sökülür.
  assert.equal(await shouldStripHtmlExtension("/blog"), true);
  assert.equal(await shouldStripHtmlExtension("/hizmetler"), true);
  // Hizmet/konum adresleri prefix listesinde → uzantı SÖKÜLÜR (canlı davranış).
  assert.equal(await shouldStripHtmlExtension("/hizmetler/mobil-uygulama"), true);
  assert.equal(await shouldStripHtmlExtension("/hizmetler/mobil-uygulama/istanbul"), true);
  // Ağaç sahiplenmesi olmayan serbest yol → `.html` kanonik kalır.
  assert.equal(await shouldStripHtmlExtension("/haberler/gundem"), false);
});
