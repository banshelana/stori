import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeRange,
  EMPTY_RANGE,
  isEmptyRange,
  rangeBounds,
  rangeOverlaps,
  withinRange,
  type DateRange,
} from "@/lib/dateRange";

const range = (from: string, to: string): DateRange => ({ from, to });

describe("isEmptyRange", () => {
  it("is empty when both ends are blank", () => {
    assert.equal(isEmptyRange(EMPTY_RANGE), true);
  });

  it("is empty when undefined", () => {
    assert.equal(isEmptyRange(undefined), true);
  });

  it("is not empty with only a start", () => {
    assert.equal(isEmptyRange(range("2026-01-01", "")), false);
  });

  it("is not empty with only an end", () => {
    assert.equal(isEmptyRange(range("", "2026-01-01")), false);
  });
});

describe("withinRange", () => {
  it("passes everything when no range is set", () => {
    assert.equal(withinRange("2026-05-05", EMPTY_RANGE), true);
    assert.equal(withinRange("2026-05-05", undefined), true);
  });

  it("includes both ends", () => {
    const r = range("2026-08-01", "2026-08-31");
    assert.equal(withinRange("2026-08-01", r), true);
    assert.equal(withinRange("2026-08-31", r), true);
  });

  it("excludes a date before the start", () => {
    assert.equal(withinRange("2026-07-31", range("2026-08-01", "2026-08-31")), false);
  });

  it("excludes a date after the end", () => {
    assert.equal(withinRange("2026-09-01", range("2026-08-01", "2026-08-31")), false);
  });

  it("treats a start alone as “since”", () => {
    const r = range("2026-08-01", "");
    assert.equal(withinRange("2030-01-01", r), true);
    assert.equal(withinRange("2026-07-31", r), false);
  });

  it("treats an end alone as “until”", () => {
    const r = range("", "2026-08-31");
    assert.equal(withinRange("2020-01-01", r), true);
    assert.equal(withinRange("2026-09-01", r), false);
  });

  it("excludes a row with no date rather than letting it slip into a total", () => {
    assert.equal(withinRange(null, range("2026-08-01", "2026-08-31")), false);
    assert.equal(withinRange(undefined, range("2026-08-01", "")), false);
    assert.equal(withinRange("", range("", "2026-08-31")), false);
  });

  it("keeps a dateless row when nothing is filtered", () => {
    assert.equal(withinRange(null, EMPTY_RANGE), true);
  });

  it("matches nothing when the range is inverted", () => {
    // The pickers prevent this pair; the comparison stays correct anyway.
    assert.equal(withinRange("2026-08-15", range("2026-09-01", "2026-08-01")), false);
  });

  it("compares months and days, not just years", () => {
    const r = range("2026-08-05", "2026-08-09");
    assert.equal(withinRange("2026-08-04", r), false);
    assert.equal(withinRange("2026-08-06", r), true);
    assert.equal(withinRange("2026-08-10", r), false);
  });
});

describe("rangeOverlaps", () => {
  const august = range("2026-08-01", "2026-08-31");

  it("passes everything when no range is set", () => {
    assert.equal(
      rangeOverlaps({ startsAt: "2026-01-01", endsAt: "2026-01-02" }, EMPTY_RANGE),
      true
    );
  });

  it("includes a span sitting inside the window", () => {
    assert.equal(
      rangeOverlaps({ startsAt: "2026-08-10", endsAt: "2026-08-20" }, august),
      true
    );
  });

  it("includes a span that swallows the window", () => {
    assert.equal(
      rangeOverlaps({ startsAt: "2026-01-01", endsAt: "2026-12-31" }, august),
      true
    );
  });

  it("includes a span overlapping only the start", () => {
    assert.equal(
      rangeOverlaps({ startsAt: "2026-07-01", endsAt: "2026-08-01" }, august),
      true
    );
  });

  it("includes a span overlapping only the end", () => {
    assert.equal(
      rangeOverlaps({ startsAt: "2026-08-31", endsAt: "2026-09-30" }, august),
      true
    );
  });

  it("excludes a span ending the day before the window", () => {
    assert.equal(
      rangeOverlaps({ startsAt: "2026-06-01", endsAt: "2026-07-31" }, august),
      false
    );
  });

  it("excludes a span starting the day after the window", () => {
    assert.equal(
      rangeOverlaps({ startsAt: "2026-09-01", endsAt: "2026-09-30" }, august),
      false
    );
  });

  it("includes a permanent span, which is valid in every window", () => {
    assert.equal(rangeOverlaps({ startsAt: null, endsAt: null }, august), true);
  });

  it("includes an open-ended span that has already started", () => {
    assert.equal(
      rangeOverlaps({ startsAt: "2026-01-01", endsAt: null }, august),
      true
    );
  });

  it("excludes an open-ended span that starts after the window", () => {
    assert.equal(
      rangeOverlaps({ startsAt: "2027-01-01", endsAt: null }, august),
      false
    );
  });

  it("includes a span with no start that ends inside the window", () => {
    assert.equal(
      rangeOverlaps({ startsAt: null, endsAt: "2026-08-15" }, august),
      true
    );
  });

  it("excludes a span with no start that ended before the window", () => {
    assert.equal(
      rangeOverlaps({ startsAt: null, endsAt: "2026-07-01" }, august),
      false
    );
  });
});

describe("rangeBounds", () => {
  it("caps the start at the chosen end", () => {
    assert.deepEqual(rangeBounds(range("", "2026-08-31")), {
      fromMax: "2026-08-31",
      toMin: undefined,
    });
  });

  it("floors the end at the chosen start", () => {
    assert.deepEqual(rangeBounds(range("2026-08-01", "")), {
      fromMax: undefined,
      toMin: "2026-08-01",
    });
  });

  it("leaves both open when nothing is chosen", () => {
    assert.deepEqual(rangeBounds(EMPTY_RANGE), {
      fromMax: undefined,
      toMin: undefined,
    });
  });
});

describe("describeRange", () => {
  const labels = { between: "Between", since: "Since", until: "Until" };
  const format = (iso: string) => iso.slice(5);

  it("says nothing when nothing is filtered", () => {
    assert.equal(describeRange(EMPTY_RANGE, format, labels), undefined);
    assert.equal(describeRange(undefined, format, labels), undefined);
  });

  it("describes a closed range", () => {
    assert.equal(
      describeRange(range("2026-08-01", "2026-08-31"), format, labels),
      "Between 08-01 – 08-31"
    );
  });

  it("describes an open end", () => {
    assert.equal(
      describeRange(range("2026-08-01", ""), format, labels),
      "Since 08-01"
    );
  });

  it("describes an open start", () => {
    assert.equal(
      describeRange(range("", "2026-08-31"), format, labels),
      "Until 08-31"
    );
  });

  it("formats through the caller, so the sheet reads in its own calendar", () => {
    assert.equal(
      describeRange(range("2026-08-01", ""), () => "۱۰ مرداد ۱۴۰۵", {
        between: "بین",
        since: "از",
        until: "تا",
      }),
      "از ۱۰ مرداد ۱۴۰۵"
    );
  });
});
