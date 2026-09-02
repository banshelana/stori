// ---------------------------------------------------------------
// Solar Hijri (Jalali) ↔ Gregorian conversion.
//
// The app already *displays* Persian dates through Intl, but Intl
// cannot parse one back, and `<input type="date">` only ever speaks
// Gregorian. A picker that shows a Persian calendar therefore needs a
// real two-way conversion.
//
// This is the Borkowski algorithm as implemented by jalaali-js —
// astronomically derived rather than a fixed leap-year cycle, which is
// why the `breaks` table exists. It is transcribed rather than
// invented, and the tests cross-check every result against Intl's own
// persian calendar over a multi-year range.
// ---------------------------------------------------------------

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

/** Years at which the 33-year leap pattern shifts. */
const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
];

export const MIN_JALALI_YEAR = BREAKS[0] + 1;
export const MAX_JALALI_YEAR = BREAKS[BREAKS.length - 1] - 1;

interface JalCal {
  /** 1 when the Jalali year is a leap year. */
  leap: number;
  gy: number;
  /** Gregorian day of March on which this Jalali year starts. */
  march: number;
}

function jalCal(jy: number, withoutLeap = false): JalCal {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jm = 0;
  let jump = 0;

  if (jy < jp || jy >= BREAKS[bl - 1]) {
    throw new RangeError(`Jalali year out of range: ${jy}`);
  }

  for (let i = 1; i < bl; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  let leap = 0;
  if (!withoutLeap) {
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
  }

  return { leap, gy, march };
}

/** Julian Day Number for a Gregorian date. */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): GregorianDate {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy, true);
  return (
    g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
  );
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy, false);
  const jdn1f = g2d(gy, 3, r.march);

  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      // First six months are 31 days each.
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }

  // Months 7–11 are 30 days; month 12 is 29 or 30.
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

export function toJalali(gy: number, gm: number, gd: number): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

export function toGregorian(jy: number, jm: number, jd: number): GregorianDate {
  return d2g(j2d(jy, jm, jd));
}

export function isJalaliLeapYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

/** 31 for months 1–6, 30 for 7–11, and 29 or 30 for Esfand. */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

// ---------------------------------------------------------------
// ISO helpers. Everything outside the picker speaks Gregorian
// YYYY-MM-DD, so conversion never leaks into the rest of the app.
// ---------------------------------------------------------------

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoFromGregorian({ gy, gm, gd }: GregorianDate): string {
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

export function gregorianFromIso(iso: string): GregorianDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const gy = Number(match[1]);
  const gm = Number(match[2]);
  const gd = Number(match[3]);
  if (gm < 1 || gm > 12 || gd < 1 || gd > 31) return null;
  return { gy, gm, gd };
}

export function isoToJalali(iso: string): JalaliDate | null {
  const g = gregorianFromIso(iso);
  if (!g) return null;
  return toJalali(g.gy, g.gm, g.gd);
}

export function jalaliToIso(jy: number, jm: number, jd: number): string {
  return isoFromGregorian(toGregorian(jy, jm, jd));
}

/** Day of week for a Gregorian date, 0 = Saturday (the Persian week). */
export function persianWeekday(iso: string): number {
  const g = gregorianFromIso(iso);
  if (!g) return 0;
  // getUTCDay: 0 = Sunday. Saturday-first shifts it by one.
  const day = new Date(Date.UTC(g.gy, g.gm - 1, g.gd)).getUTCDay();
  return (day + 1) % 7;
}

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

/** Saturday first, matching the Iranian week. */
export const JALALI_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function todayIso(): string {
  const now = new Date();
  return isoFromGregorian({
    gy: now.getFullYear(),
    gm: now.getMonth() + 1,
    gd: now.getDate(),
  });
}
