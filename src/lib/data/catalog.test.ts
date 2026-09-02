import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from "@/lib/data/mock";
import { MOCK_BRANDS } from "@/lib/data/brands";

/**
 * Category filter specs and product attributes are two halves of one
 * contract: a facet the category declares is useless if products don't
 * carry it, and an attribute no category declares can never be filtered.
 * These assertions catch the two halves drifting apart.
 */
describe("catalog integrity", () => {
  const byId = new Map(MOCK_CATEGORIES.map((c) => [c.id, c]));

  it("every product belongs to a real category", () => {
    for (const product of MOCK_PRODUCTS) {
      assert.ok(
        byId.has(product.categoryId),
        `${product.slug} references unknown category ${product.categoryId}`
      );
    }
  });

  it("every product carries exactly the facets its category declares", () => {
    for (const product of MOCK_PRODUCTS) {
      const category = byId.get(product.categoryId)!;
      const declared = category.filters.map((f) => f.key).sort();
      const actual = Object.keys(product.attributes ?? {}).sort();
      assert.deepEqual(
        actual,
        declared,
        `${product.slug} (${category.slug}) attribute keys do not match its category`
      );
    }
  });

  it("every product references a real brand", () => {
    const brandIds = new Set(MOCK_BRANDS.map((b) => b.id));
    for (const product of MOCK_PRODUCTS) {
      if (product.brandId === null) continue;
      assert.ok(
        brandIds.has(product.brandId),
        `${product.slug} references unknown brand ${product.brandId}`
      );
    }
  });

  it("select and multi facets declare options", () => {
    for (const category of MOCK_CATEGORIES) {
      for (const spec of category.filters) {
        if (spec.kind === "select" || spec.kind === "multi") {
          assert.ok(
            (spec.options ?? []).length > 0,
            `${category.slug}.${spec.key} has no options`
          );
        }
        if (spec.kind === "range") {
          assert.ok(
            typeof spec.min === "number" && typeof spec.max === "number",
            `${category.slug}.${spec.key} is missing numeric bounds`
          );
        }
      }
    }
  });

  it("facet values on products exist in their spec options", () => {
    for (const product of MOCK_PRODUCTS) {
      const category = byId.get(product.categoryId)!;
      for (const spec of category.filters) {
        if (spec.kind !== "select" && spec.kind !== "multi") continue;
        const allowed = new Set((spec.options ?? []).map((o) => o.value));
        const raw = product.attributes[spec.key];
        const values = Array.isArray(raw) ? raw : [raw];
        for (const value of values) {
          assert.ok(
            allowed.has(String(value)),
            `${product.slug}.${spec.key} = "${value}" is not an option of ${category.slug}.${spec.key}`
          );
        }
      }
    }
  });
});
