import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatRange,
  matchesAttributes,
  matchesFacet,
  parseRange,
  priceBounds,
} from "@/lib/attributes";
import type { FilterSpec, Product } from "@/lib/types";

function product(
  attributes: Product["attributes"] = {}
): Product {
  return {
    id: "p",
    slug: "p",
    title: { en: "p", fa: "p" },
    description: { en: "", fa: "" },
    price: 1000,
    compareAtPrice: null,
    currency: "EUR",
    brandId: null,
    attributes,
    images: [],
    primaryImageId: null,
    active: true,
    adjustments: [],
    categoryId: "c",
    tags: [],
    rating: 4,
    stock: 1,
    createdAt: "2026-01-01",
  };
}

const multi: FilterSpec = {
  key: "connectivity",
  kind: "multi",
  label: { en: "Connectivity", fa: "" },
  options: [],
};

const select: FilterSpec = {
  key: "form",
  kind: "select",
  label: { en: "Form", fa: "" },
  options: [],
};

const range: FilterSpec = {
  key: "batteryHours",
  kind: "range",
  label: { en: "Battery", fa: "" },
  min: 0,
  max: 60,
};

const bool: FilterSpec = {
  key: "noiseCancelling",
  kind: "boolean",
  label: { en: "ANC", fa: "" },
};

describe("parseRange / formatRange", () => {
  it("round-trips both bounds", () => {
    assert.deepEqual(parseRange("10-40"), { min: 10, max: 40 });
    assert.equal(formatRange(10, 40), "10-40");
  });

  it("treats a blank side as unbounded", () => {
    assert.deepEqual(parseRange("-40"), { min: null, max: 40 });
    assert.deepEqual(parseRange("10-"), { min: 10, max: null });
  });
});

describe("matchesFacet", () => {
  it("passes everything when nothing is selected", () => {
    assert.equal(matchesFacet(product(), multi, []), true);
  });

  it("ORs values within a multi facet", () => {
    const p = product({ connectivity: ["bluetooth", "usb-c"] });
    assert.equal(matchesFacet(p, multi, ["wired", "usb-c"]), true);
    assert.equal(matchesFacet(p, multi, ["wired"]), false);
  });

  it("matches a scalar attribute against a select", () => {
    const p = product({ form: "over-ear" });
    assert.equal(matchesFacet(p, select, ["over-ear"]), true);
    assert.equal(matchesFacet(p, select, ["in-ear"]), false);
  });

  it("applies numeric bounds for a range", () => {
    const p = product({ batteryHours: 40 });
    assert.equal(matchesFacet(p, range, ["10-60"]), true);
    assert.equal(matchesFacet(p, range, ["45-60"]), false);
    assert.equal(matchesFacet(p, range, ["-30"]), false);
    assert.equal(matchesFacet(p, range, ["30-"]), true);
  });

  it("rejects a product missing the attribute a range asks about", () => {
    assert.equal(matchesFacet(product(), range, ["0-60"]), false);
  });

  it("only narrows on a checked boolean", () => {
    assert.equal(matchesFacet(product({ noiseCancelling: true }), bool, ["true"]), true);
    assert.equal(matchesFacet(product({ noiseCancelling: false }), bool, ["true"]), false);
    // An unchecked box is absent from the URL, so it must not exclude.
    assert.equal(matchesFacet(product({ noiseCancelling: false }), bool, []), true);
  });
});

describe("matchesAttributes", () => {
  const specs = [multi, range, bool];

  it("ANDs across facets", () => {
    const p = product({
      connectivity: ["bluetooth"],
      batteryHours: 40,
      noiseCancelling: true,
    });
    assert.equal(
      matchesAttributes(p, specs, {
        connectivity: ["bluetooth"],
        batteryHours: ["20-60"],
        noiseCancelling: ["true"],
      }),
      true
    );
    assert.equal(
      matchesAttributes(p, specs, {
        connectivity: ["bluetooth"],
        batteryHours: ["45-60"],
      }),
      false
    );
  });

  it("ignores selections for facets the category does not declare", () => {
    const p = product({ connectivity: ["bluetooth"] });
    assert.equal(
      matchesAttributes(p, [multi], { somethingElse: ["x"] }),
      true
    );
  });

  it("passes when there are no selections at all", () => {
    assert.equal(matchesAttributes(product(), specs, undefined), true);
  });
});

describe("priceBounds", () => {
  it("returns the extent", () => {
    assert.deepEqual(priceBounds([500, 100, 900]), { min: 100, max: 900 });
  });

  it("handles an empty catalog without producing Infinity", () => {
    assert.deepEqual(priceBounds([]), { min: 0, max: 0 });
  });
});
