import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isIndexableLocation,
  isKeepableLocation,
  isPriorityDistrict,
} from "@/config/priority-locations";

test("17.10.2026: yalnızca İstanbul'un ilçeleri korunur", () => {
  // İstanbul ilçeleri (allowlist'te olmasa da) korunur.
  assert.equal(isPriorityDistrict("istanbul", "kadikoy"), true);
  assert.equal(isPriorityDistrict("istanbul", "arnavutkoy"), true);
  // Diğer illerin ilçeleri (top-10 dahil) artık korunmaz.
  assert.equal(isPriorityDistrict("ankara", "kadikoy"), false);
  assert.equal(isPriorityDistrict("yozgat", "kadikoy"), false);
});

test("diğer illerdeki büyük/ticari ilçeler artık korunmaz (kaldırıldı)", () => {
  assert.equal(isPriorityDistrict("mugla", "bodrum"), false);
  assert.equal(isPriorityDistrict("denizli", "pamukkale"), false);
  assert.equal(isPriorityDistrict("sakarya", "adapazari"), false);
  assert.equal(isPriorityDistrict("samsun", "atakum"), false);
  assert.equal(isPriorityDistrict("diyarbakir", "kayapinar"), false);
  assert.equal(isPriorityDistrict("sanliurfa", "siverek"), false);
  assert.equal(isPriorityDistrict("hatay", "iskenderun"), false);
  assert.equal(isPriorityDistrict("tekirdag", "suleymanpasa"), false);
});

test("province pages are retained but templates remain noindex", () => {
  const templateProvince = { locationType: "province", sourceType: "template" };
  assert.equal(isKeepableLocation(templateProvince), true);
  assert.equal(isIndexableLocation(templateProvince), false);
  assert.equal(isIndexableLocation({ ...templateProvince, sourceType: "manual" }), true);
});

test("İstanbul ilçeleri içerik kalitesine göre indexlenir; şablonlar noindex kalır", () => {
  const templateDistrict = {
    locationType: "district",
    parentLocationSlug: "istanbul",
    locationSlug: "kadikoy",
    sourceType: "template",
  };
  assert.equal(isKeepableLocation(templateDistrict), true);
  assert.equal(isIndexableLocation(templateDistrict), false);
  assert.equal(isIndexableLocation({ ...templateDistrict, sourceType: "manual" }), true);
  assert.equal(
    isIndexableLocation({
      ...templateDistrict,
      isCustom: true,
      isIndexed: true,
      localIntroLength: 200,
    }),
    true,
  );
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
