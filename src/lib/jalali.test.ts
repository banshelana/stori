import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gregorianFromIso,
  isJalaliLeapYear,
  isoToJalali,
  jalaliMonthLength,
  jalaliToIso,
  persianWeekday,
  toGregorian,
  toJalali,
} from "@/lib/jalali";

/**
 * Intl already knows the Persian calendar, which makes it an independent
 * oracle: if our arithmetic and the platform's disagree on any date, one
 * of them is wrong and it is almost certainly ours.
 */
const intlPersian = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

function intlJalali(gy: number, gm: number, gd: number) {
  const parts = intlPersian.formatToParts(new Date(Date.UTC(gy, gm - 1, gd)));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return { jy: get("year"), jm: get("month"), jd: get("day") };
}

describe("cross-checked against Intl", () => {
  it("agrees on every day across a six-year span", () => {
    let checked = 0;
    const cursor = new Date(Date.UTC(2022, 0, 1));
    const end = Date.UTC(2028, 0, 1);

    while (cursor.getTime() < end) {
      const gy = cursor.getUTCFullYear();
      const gm = cursor.getUTCMonth() + 1;
      const gd = cursor.getUTCDate();

      assert.deepEqual(
        toJalali(gy, gm, gd),
        intlJalali(gy, gm, gd),
        `mismatch on ${gy}-${gm}-${gd}`
      );

      checked += 1;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    assert.ok(checked > 2000, `expected a full sweep, checked ${checked}`);
  });

  it("agrees on Nowruz for a decade", () => {
    // 1 Farvardin is the year's start; a one-day drift here is the
    // classic symptom of a broken leap-year table.
    for (let jy = 1400; jy <= 1410; jy += 1) {
      const iso = jalaliToIso(jy, 1, 1);
      const back = isoToJalali(iso);
      assert.deepEqual(back, { jy, jm: 1, jd: 1 }, `Nowruz ${jy}`);

      const g = gregorianFromIso(iso)!;
      assert.deepEqual(intlJalali(g.gy, g.gm, g.gd), { jy, jm: 1, jd: 1 });
    }
  });
});

describe("round trips", () => {
  it("survives a Gregorian → Jalali → Gregorian round trip", () => {
    const samples = [
      [2026, 9, 2],
      [2026, 3, 21],
      [2026, 3, 20],
      [2024, 2, 29], // Gregorian leap day
      [2000, 1, 1],
      [1979, 2, 11],
    ];
    for (const [gy, gm, gd] of samples) {
      const j = toJalali(gy, gm, gd);
      assert.deepEqual(toGregorian(j.jy, j.jm, j.jd), { gy, gm, gd });
    }
  });
});

describe("month lengths", () => {
  it("gives 31 days to the first six months", () => {
    for (let m = 1; m <= 6; m += 1) {
      assert.equal(jalaliMonthLength(1405, m), 31);
    }
  });

  it("gives 30 days to months seven through eleven", () => {
    for (let m = 7; m <= 11; m += 1) {
      assert.equal(jalaliMonthLength(1405, m), 30);
    }
  });

  it("varies Esfand with the leap year", () => {
    for (let jy = 1400; jy <= 1412; jy += 1) {
      const expected = isJalaliLeapYear(jy) ? 30 : 29;
      assert.equal(jalaliMonthLength(jy, 12), expected, `Esfand ${jy}`);

      // The last day must exist and round-trip; day+1 must roll over.
      const iso = jalaliToIso(jy, 12, expected);
      assert.deepEqual(isoToJalali(iso), { jy, jm: 12, jd: expected });
    }
  });

  it("identifies leap years consistently with Nowruz spacing", () => {
    for (let jy = 1395; jy <= 1410; jy += 1) {
      const start = new Date(`${jalaliToIso(jy, 1, 1)}T00:00:00Z`).getTime();
      const nextStart = new Date(
        `${jalaliToIso(jy + 1, 1, 1)}T00:00:00Z`
      ).getTime();
      const days = Math.round((nextStart - start) / 86_400_000);
      assert.equal(days, isJalaliLeapYear(jy) ? 366 : 365, `year ${jy}`);
    }
  });
});

describe("iso helpers", () => {
  it("rejects malformed input rather than guessing", () => {
    assert.equal(gregorianFromIso("2026-9-2"), null);
    assert.equal(gregorianFromIso("nope"), null);
    assert.equal(gregorianFromIso("2026-13-01"), null);
    assert.equal(isoToJalali("nope"), null);
  });

  it("pads single-digit months and days", () => {
    assert.equal(jalaliToIso(1405, 1, 1), "2026-03-21");
  });

  it("puts Saturday at index zero", () => {
    // 2026-09-05 is a Saturday.
    assert.equal(persianWeekday("2026-09-05"), 0);
    assert.equal(persianWeekday("2026-09-06"), 1);
    assert.equal(persianWeekday("2026-09-11"), 6);
  });
});
