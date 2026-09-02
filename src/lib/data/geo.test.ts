import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CITIES,
  cityCountOf,
  cityCountOfCountry,
  COUNTRIES,
  isValidGeoSelection,
  PROVINCES,
  provinceCountOf,
  provincesOf,
  citiesOf,
} from "@/lib/data/geo";
import { isValidLat, isValidLatLon, isValidLon, roundCoord } from "@/lib/map";

describe("geo referential integrity", () => {
  it("every province points at a real country", () => {
    const ids = new Set(COUNTRIES.map((c) => c.id));
    for (const province of PROVINCES) {
      assert.ok(
        ids.has(province.countryId),
        `${province.id} references unknown country ${province.countryId}`
      );
    }
  });

  it("every city points at a real province", () => {
    const ids = new Set(PROVINCES.map((p) => p.id));
    for (const city of CITIES) {
      assert.ok(
        ids.has(city.provinceId),
        `${city.id} references unknown province ${city.provinceId}`
      );
    }
  });

  it("counts dependants so deletes can be blocked", () => {
    const iranProvinces = provincesOf("ir");
    assert.equal(provinceCountOf("ir"), iranProvinces.length);
    assert.ok(iranProvinces.length > 0);

    const tehranCities = citiesOf("ir-thr");
    assert.equal(cityCountOf("ir-thr"), tehranCities.length);

    // A country's city count spans all of its provinces.
    const viaProvinces = iranProvinces.reduce(
      (sum, p) => sum + cityCountOf(p.id),
      0
    );
    assert.equal(cityCountOfCountry("ir"), viaProvinces);
  });

  it("rejects a combination whose parts belong to different parents", () => {
    // Tehran province with an Isfahan city must not validate.
    assert.equal(isValidGeoSelection("ir", "ir-thr", "ir-esf-isfahan"), false);
    assert.equal(isValidGeoSelection("ir", "ir-thr", "ir-thr-karaj"), true);
    // Right province, wrong country.
    assert.equal(isValidGeoSelection("de", "ir-thr", "ir-thr-karaj"), false);
  });

  it("city coordinates, where present, are on Earth", () => {
    for (const city of CITIES) {
      if (city.lat === undefined && city.lon === undefined) continue;
      assert.ok(
        isValidLatLon({ lat: city.lat, lon: city.lon }),
        `${city.id} has an out-of-range coordinate`
      );
    }
  });
});

describe("coordinate helpers", () => {
  it("validates ranges", () => {
    assert.equal(isValidLat(35.7), true);
    assert.equal(isValidLat(91), false);
    assert.equal(isValidLon(51.4), true);
    assert.equal(isValidLon(-181), false);
    assert.equal(isValidLat(Number.NaN), false);
  });

  it("rejects a partial pair", () => {
    assert.equal(isValidLatLon(null), false);
    assert.equal(isValidLatLon({ lat: 35.7 }), false);
    assert.equal(isValidLatLon({ lat: 35.7, lon: 51.4 }), true);
  });

  it("rounds to six decimals", () => {
    assert.equal(roundCoord(35.68919444444), 35.689194);
  });
});
