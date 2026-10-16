import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isIndexableLocation,
  isKeepableLocation,
  isPriorityDistrict,
} from "@/config/priority-locations";

test("top-10 ilin tüm ilçeleri önceliklidir; diğer iller yalnızca allowlist ile", () => {
  // İstanbul (top-10) → allowlist'te olmayan ilçe bile öncelikli.
  assert.equal(isPriorityDistrict("istanbul", "kadikoy"), true);
  assert.equal(isPriorityDistrict("istanbul", "arnavutkoy"), true);
  assert.equal(isPriorityDistrict("ankara", "kadikoy"), true); // Ankara da top-10
  // Top-10 dışı ve allowlist'te olmayan ilçe öncelikli DEĞİL.
  assert.equal(isPriorityDistrict("yozgat", "kadikoy"), false);
});

test("diğer illerdeki büyük/ticari ilçeler (MAJOR_DISTRICTS) önceliklidir", () => {
  assert.equal(isPriorityDistrict("mugla", "bodrum"), true);
  assert.equal(isPriorityDistrict("denizli", "pamukkale"), true);
  assert.equal(isPriorityDistrict("sakarya", "adapazari"), true);
  assert.equal(isPriorityDistrict("samsun", "atakum"), true);
  // Top-100 nüfus verisiyle eklenen ilçeler (bkz. MAJOR_DISTRICTS doc).
  assert.equal(isPriorityDistrict("diyarbakir", "kayapinar"), true);
  assert.equal(isPriorityDistrict("diyarbakir", "baglar"), true);
  assert.equal(isPriorityDistrict("sanliurfa", "siverek"), true);
  assert.equal(isPriorityDistrict("hatay", "iskenderun"), true);
  assert.equal(isPriorityDistrict("tekirdag", "suleymanpasa"), true);
  // Aynı ilin listeye girmeyen ilçesi öncelikli değil.
  assert.equal(isPriorityDistrict("mugla", "datca"), false);
  assert.equal(isPriorityDistrict("sanliurfa", "viransehir"), false);
});

test("province pages are retained but templates remain noindex", () => {
  const templateProvince = { locationType: "province", sourceType: "template" };
  assert.equal(isKeepableLocation(templateProvince), true);
  assert.equal(isIndexableLocation(templateProvince), false);
  assert.equal(isIndexableLocation({ ...templateProvince, sourceType: "manual" }), true);
});

test("priority districts remain available but require manual content for indexing", () => {
  const templateDistrict = {
    locationType: "district",
    parentLocationSlug: "istanbul",
    locationSlug: "kadikoy",
    sourceType: "template",
  };
  assert.equal(isKeepableLocation(templateDistrict), true);
  assert.equal(isIndexableLocation(templateDistrict), false);
  assert.equal(isIndexableLocation({ ...templateDistrict, sourceType: "manual" }), true);
});

test("non-priority districts are not retained, even if marked manual", () => {
  const district = {
    locationType: "district",
    parentLocationSlug: "yozgat",
    locationSlug: "sorgun",
    sourceType: "manual",
  };
  assert.equal(isKeepableLocation(district), false);
  assert.equal(isIndexableLocation(district), false);
});
