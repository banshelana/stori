import type { AttributeValue, FilterSpec, Product } from "@/lib/types";

// ---------------------------------------------------------------
// Matching a product against a category's declared facets.
//
// Selections arrive from the URL as strings, while attribute values
// on a product are strings, numbers, booleans or arrays of those.
// Everything is compared as strings except ranges, which are numeric.
// ---------------------------------------------------------------

/** Every selected value in a facet, as a flat string list. */
function valuesOf(
  raw: AttributeValue | AttributeValue[] | undefined
): string[] {
  if (raw === undefined || raw === null) return [];
  return (Array.isArray(raw) ? raw : [raw]).map(String);
}

/** Range facets encode as "min-max"; either side may be blank. */
export function parseRange(selection: string): {
  min: number | null;
  max: number | null;
} {
  const [rawMin, rawMax] = selection.split("-");
  const min = rawMin === "" || rawMin === undefined ? null : Number(rawMin);
  const max = rawMax === "" || rawMax === undefined ? null : Number(rawMax);
  return {
    min: Number.isFinite(min) ? (min as number) : null,
    max: Number.isFinite(max) ? (max as number) : null,
  };
}

export function formatRange(min: number | null, max: number | null): string {
  return `${min ?? ""}-${max ?? ""}`;
}

/**
 * True when a product satisfies one facet selection.
 *
 * Within a facet the selected values are ORed (Bluetooth *or* wired);
 * the caller ANDs across facets.
 */
export function matchesFacet(
  product: Product,
  spec: FilterSpec,
  selected: string[]
): boolean {
  if (selected.length === 0) return true;

  const actual = valuesOf(product.attributes?.[spec.key]);

  switch (spec.kind) {
    case "boolean":
      // Only "true" narrows; an unchecked box is absent from the URL.
      return selected.includes("true") ? actual.includes("true") : true;

    case "range": {
      const { min, max } = parseRange(selected[0] ?? "");
      const raw = product.attributes?.[spec.key];
      const value = typeof raw === "number" ? raw : Number(raw);
      // A product missing the attribute cannot satisfy a numeric bound.
      if (!Number.isFinite(value)) return false;
      if (min !== null && value < min) return false;
      if (max !== null && value > max) return false;
      return true;
    }

    case "select":
    case "multi":
    default:
      return selected.some((value) => actual.includes(value));
  }
}

/** ANDs every facet the category declares. */
export function matchesAttributes(
  product: Product,
  specs: FilterSpec[],
  selections: Record<string, string[]> | undefined
): boolean {
  if (!selections) return true;
  return specs.every((spec) =>
    matchesFacet(product, spec, selections[spec.key] ?? [])
  );
}

/** Lowest and highest price across a set, for the slider's bounds. */
export function priceBounds(prices: number[]): { min: number; max: number } {
  if (prices.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
