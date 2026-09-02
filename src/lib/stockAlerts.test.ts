import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alreadySubscribed,
  crossedIntoStock,
  pendingCountByProduct,
  pendingFor,
} from "@/lib/stockAlerts";
import type { StockAlert } from "@/lib/data/stockAlerts";

const alerts: StockAlert[] = [
  { id: "1", productId: "p-1", mobile: "09120000001", createdAt: "2026-01-01", notifiedAt: null },
  { id: "2", productId: "p-1", mobile: "09120000002", createdAt: "2026-01-02", notifiedAt: null },
  { id: "3", productId: "p-1", mobile: "09120000003", createdAt: "2026-01-03", notifiedAt: "2026-02-01" },
  { id: "4", productId: "p-2", mobile: "09120000001", createdAt: "2026-01-04", notifiedAt: null },
];

describe("crossedIntoStock", () => {
  it("fires only when zero is crossed upward", () => {
    assert.equal(crossedIntoStock(0, 5), true);
    assert.equal(crossedIntoStock(-1, 1), true, "negative counts as unavailable");
  });

  it("does not fire on a restock that was already available", () => {
    // Someone waiting could already have bought it — this is not news.
    assert.equal(crossedIntoStock(3, 30), false);
  });

  it("does not fire on selling out or staying out", () => {
    assert.equal(crossedIntoStock(5, 0), false);
    assert.equal(crossedIntoStock(0, 0), false);
  });
});

describe("pending subscriptions", () => {
  it("excludes ones already notified", () => {
    assert.deepEqual(pendingFor(alerts, "p-1").map((a) => a.id), ["1", "2"]);
  });

  it("counts pending per product", () => {
    const counts = pendingCountByProduct(alerts);
    assert.equal(counts.get("p-1"), 2);
    assert.equal(counts.get("p-2"), 1);
  });

  it("detects an existing subscription", () => {
    assert.equal(alreadySubscribed(alerts, "p-1", "09120000001"), true);
    assert.equal(alreadySubscribed(alerts, "p-1", "09999999999"), false);
  });

  it("lets a number resubscribe once its previous alert was sent", () => {
    assert.equal(alreadySubscribed(alerts, "p-1", "09120000003"), false);
  });
});
