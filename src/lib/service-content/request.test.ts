import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentTreeNode } from "@/lib/content-tree";
import {
  SERVICE_CONTENT_ROOT,
  contentSegmentsOf,
  isServiceContentNode,
  serviceContentRequestFromRoute,
  serviceContentRequestFromTreePath,
} from "./request";

/** Testlara yetecek kadarı dolu bir `pages` düğümü. */
function node(kind: string, nodeType: "page" | "category"): Pick<ContentTreeNode, "kind" | "nodeType"> {
  return { kind, nodeType };
}

test("route üreticisi: kök segmentini ekler, .html'i pathSegments'ten söker ama requestPath'te bırakır", () => {
  const req = serviceContentRequestFromRoute(["web-yazilim", "adana.html"]);
  assert.deepEqual([...req.pathSegments], [SERVICE_CONTENT_ROOT, "web-yazilim", "adana"]);
  assert.equal(req.requestPath, "/hizmetler/web-yazilim/adana.html");
  assert.equal(req.resolvedTree, undefined);
});

test("tree üreticisi: kök segment ZATEN ham listede olduğu için iki kez eklemez", () => {
  const req = serviceContentRequestFromTreePath(["hizmetler", "web-yazilim", "adana.html"]);
  assert.deepEqual([...req.pathSegments], [SERVICE_CONTENT_ROOT, "web-yazilim", "adana"]);
  assert.equal(req.requestPath, "/hizmetler/web-yazilim/adana.html");
});

test("PARİTE: aynı adres iki rotadan geldiğinde aynı segmentleri ve aynı karşılaştırma yolunu üretir", () => {
  // Bu test, `hizmetler/[...slug]` silindikten SONRA davranışın değişmemesinin
  // tek kanıtıdır: zincir her iki rotada da birebir aynı girdiyi görür.
  const fromRoute = serviceContentRequestFromRoute(["mobil-uygulama", "istanbul-kadikoy"]);
  const fromTree = serviceContentRequestFromTreePath(["hizmetler", "mobil-uygulama", "istanbul-kadikoy"]);
  assert.deepEqual([...fromTree.pathSegments], [...fromRoute.pathSegments]);
  assert.equal(fromTree.requestPath, fromRoute.requestPath);
  assert.deepEqual(contentSegmentsOf(fromTree), contentSegmentsOf(fromRoute));
});

test("contentSegmentsOf kök/hub istekinde boş döner (hizmet zinciri tanımlı değil)", () => {
  assert.deepEqual(contentSegmentsOf(serviceContentRequestFromRoute([])), []);
  assert.deepEqual(contentSegmentsOf(serviceContentRequestFromTreePath([SERVICE_CONTENT_ROOT])), []);
  assert.deepEqual(contentSegmentsOf(serviceContentRequestFromTreePath([])), []);
});

test("hizmet ve hizmet×konum derinlikleri ayrışır (1 vs 2 içerik segmenti)", () => {
  assert.deepEqual(contentSegmentsOf(serviceContentRequestFromRoute(["siber-guvenlik"])), ["siber-guvenlik"]);
  assert.deepEqual(
    contentSegmentsOf(serviceContentRequestFromRoute(["siber-guvenlik", "izmir"])),
    ["siber-guvenlik", "izmir"],
  );
  assert.deepEqual(
    contentSegmentsOf(serviceContentRequestFromRoute(["siber-guvenlik", "izmir", "alt-sayfa"])),
    ["siber-guvenlik", "izmir", "alt-sayfa"],
  );
});

test("delegasyon: kind='location' | 'service' içerik satırı zincire devredilir", () => {
  assert.equal(
    isServiceContentNode(node("location", "page"), ["hizmetler", "web-yazilim-tasarim1", "adana"]),
    true,
  );
  assert.equal(
    isServiceContentNode(node("service", "page"), ["hizmetler", "mobil-uygulama"]),
    true,
  );
});

test("delegasyon: hub, derin yol, custom düğüm ve hizmet dışı kök ağaçta kalır", () => {
  assert.equal(isServiceContentNode(node("service", "category"), ["hizmetler"]), false);
  assert.equal(
    isServiceContentNode(node("location", "page"), ["hizmetler", "web-yazilim-tasarim1", "adana", "alt"]),
    false,
  );
  assert.equal(
    isServiceContentNode(node("custom", "page"), ["hizmetler", "kirik-test-hizmet"]),
    false,
  );
  assert.equal(
    isServiceContentNode(node("location", "page"), ["blog", "mobil-uygulama", "adana"]),
    false,
  );
});
