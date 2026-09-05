import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Order, OrderStatus } from "@/lib/data/commerce";
import {
  describeFilters,
  printFilename,
  totalsByCurrency,
} from "@/lib/printing";

function order(
  over: Partial<Order> & { total: number; status: OrderStatus }
): Order {
  return {
    id: "o-001",
    reference: "ORD-1",
    userId: "u-001",
    lines: [],
    currency: "EUR",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...over,
  };
}

describe("printFilename", () => {
  it("joins the parts with dashes", () => {
    assert.equal(printFilename(["order", "ORD-2026001"]), "order-ORD-2026001");
  });

  it("replaces spaces so the name survives a shell", () => {
    assert.equal(printFilename(["sales report"]), "sales-report");
  });

  it("strips characters Windows rejects in a filename", () => {
    assert.equal(printFilename(['a/b\\c:d*e?f"g<h>i|j']), "a-b-c-d-e-f-g-h-i-j");
  });

  it("collapses runs of dashes", () => {
    assert.equal(printFilename(["a  ///  b"]), "a-b");
  });

  it("trims leading and trailing dashes", () => {
    assert.equal(printFilename(["/order/"]), "order");
  });

  it("drops empty parts rather than leaving a gap", () => {
    assert.equal(printFilename(["sales", "", null, undefined, "2026-09-05"]), "sales-2026-09-05");
  });

  it("keeps Persian characters, which filesystems accept", () => {
    assert.equal(printFilename(["سفارش", "ORD-1"]), "سفارش-ORD-1");
  });

  it("falls back rather than returning an empty name", () => {
    assert.equal(printFilename([]), "document");
    assert.equal(printFilename(["///"]), "document");
  });

  it("accepts numbers", () => {
    assert.equal(printFilename(["page", 2]), "page-2");
  });
});

describe("totalsByCurrency", () => {
  it("returns nothing for no orders", () => {
    assert.deepEqual(totalsByCurrency([]), []);
  });

  it("sums orders sharing a currency", () => {
    const totals = totalsByCurrency([
      order({ total: 1000, status: "done" }),
      order({ total: 500, status: "pending" }),
    ]);
    assert.deepEqual(totals, [{ currency: "EUR", count: 2, total: 1500 }]);
  });

  it("counts a cancelled order but leaves it out of the total", () => {
    const totals = totalsByCurrency([
      order({ total: 1000, status: "done" }),
      order({ total: 900, status: "canceled" }),
    ]);
    assert.deepEqual(totals, [{ currency: "EUR", count: 2, total: 1000 }]);
  });

  it("keeps currencies apart instead of adding them together", () => {
    const totals = totalsByCurrency([
      order({ total: 1000, status: "done", currency: "EUR" }),
      order({ total: 2000, status: "done", currency: "IRR" }),
    ]);
    assert.deepEqual(totals, [
      { currency: "EUR", count: 1, total: 1000 },
      { currency: "IRR", count: 1, total: 2000 },
    ]);
  });

  it("orders currencies predictably, whatever order the rows arrive in", () => {
    const totals = totalsByCurrency([
      order({ total: 1, status: "done", currency: "USD" }),
      order({ total: 1, status: "done", currency: "EUR" }),
      order({ total: 1, status: "done", currency: "IRR" }),
    ]);
    assert.deepEqual(
      totals.map((t) => t.currency),
      ["EUR", "IRR", "USD"]
    );
  });

  it("reports a currency whose orders were all cancelled", () => {
    const totals = totalsByCurrency([
      order({ total: 900, status: "canceled" }),
    ]);
    assert.deepEqual(totals, [{ currency: "EUR", count: 1, total: 0 }]);
  });
});

describe("describeFilters", () => {
  it("renders label and value pairs", () => {
    assert.equal(
      describeFilters([
        { label: "Status", value: "Pending" },
        { label: "Search", value: "aurora" },
      ]),
      "Status: Pending · Search: aurora"
    );
  });

  it("skips entries with no value", () => {
    assert.equal(
      describeFilters([
        { label: "Status", value: undefined },
        { label: "Search", value: "aurora" },
      ]),
      "Search: aurora"
    );
  });

  it("skips a value that is only whitespace", () => {
    assert.equal(describeFilters([{ label: "Search", value: "   " }]), "");
  });

  it("returns empty when nothing is filtered", () => {
    assert.equal(describeFilters([]), "");
  });

  it("takes a separator, for a locale that reads better with one", () => {
    assert.equal(
      describeFilters(
        [
          { label: "وضعیت", value: "در انتظار" },
          { label: "جستجو", value: "آرورا" },
        ],
        "، "
      ),
      "وضعیت: در انتظار، جستجو: آرورا"
    );
  });
});
