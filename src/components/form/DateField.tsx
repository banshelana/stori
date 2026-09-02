"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, formatNumber, formatYear } from "@/lib/format";
import {
  gregorianFromIso,
  isoFromGregorian,
  isoToJalali,
  jalaliMonthLength,
  jalaliToIso,
  JALALI_MONTHS,
  JALALI_WEEKDAYS,
  persianWeekday,
  todayIso,
  toJalali,
} from "@/lib/jalali";

const GREGORIAN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const GREGORIAN_WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Date picker that draws whichever calendar the locale actually uses.
 *
 * Persian dates were already *displayed* on the Solar Hijri calendar
 * while every filter input was a Gregorian `<input type="date">` — so a
 * Farsi user reading "۸ شهریور" had to work out that they needed to
 * type 2026-08-30. This shows Farvardin–Esfand directly.
 *
 * The value in and out is always a Gregorian ISO string, so nothing
 * downstream has to know a second calendar exists.
 */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  className = "",
}: {
  label: string;
  /** Gregorian YYYY-MM-DD, or "" for empty. */
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const isJalali = locale === "fa";
  const id = useId();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // The month on screen, held in whichever calendar we are drawing.
  const [view, setView] = useState(() => viewFor(value, isJalali));
  const [focusDay, setFocusDay] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setView(viewFor(value, isJalali));
    setFocusDay(null);
  }, [open, value, isJalali]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const monthNames = isJalali ? JALALI_MONTHS : GREGORIAN_MONTHS;
  const weekdays = isJalali ? JALALI_WEEKDAYS : GREGORIAN_WEEKDAYS;

  const grid = useMemo(
    () => buildGrid(view.year, view.month, isJalali),
    [view.year, view.month, isJalali]
  );

  const today = todayIso();

  function pick(iso: string) {
    if (min && iso < min) return;
    if (max && iso > max) return;
    onChange(iso);
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    setView(({ year, month }) => {
      const next = month + delta;
      if (next < 1) return { year: year - 1, month: 12 };
      if (next > 12) return { year: year + 1, month: 1 };
      return { year, month: next };
    });
  }

  // Roving focus: arrows move by day/week, so the grid is usable without
  // a pointer and without putting 31 buttons in the tab order.
  function onGridKeyDown(e: React.KeyboardEvent) {
    const deltas: Record<string, number> = {
      ArrowRight: isJalali ? -1 : 1,
      ArrowLeft: isJalali ? 1 : -1,
      ArrowDown: 7,
      ArrowUp: -7,
    };
    const delta = deltas[e.key];
    if (delta === undefined) return;
    e.preventDefault();

    const current = focusDay ?? grid.selectedDay ?? 1;
    const next = current + delta;
    if (next < 1 || next > grid.length) return;
    setFocusDay(next);
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)
      ?.focus();
  }

  return (
    <div className={className} ref={containerRef}>
      <span
        id={`${id}-label`}
        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
      </span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={`${id}-label`}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-colors hover:bg-white focus:border-indigo-500 focus:bg-white"
        >
          <span className={value ? "text-slate-900" : "text-slate-400"}>
            {value ? formatDate(value, locale) : t("date.choose")}
          </span>
          <Icon name="calendar" className="h-4 w-4 shrink-0 text-slate-400" />
        </button>

        {open && (
          <div
            role="dialog"
            aria-label={label}
            className="animate-scale-in absolute z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
          >
            {/* Month navigation. The chevrons mirror in RTL. */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label={t("date.previousMonth")}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <Icon name="arrowRight" className="rtl-flip h-4 w-4 rotate-180" />
              </button>

              <span className="text-sm font-bold text-slate-900">
                {monthNames[view.month - 1]} {formatYear(view.year, locale)}
              </span>

              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label={t("date.nextMonth")}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <Icon name="arrowRight" className="rtl-flip h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center">
              {weekdays.map((day, i) => (
                <span
                  key={i}
                  className="py-1 text-[11px] font-semibold text-slate-400"
                >
                  {day}
                </span>
              ))}
            </div>

            <div
              ref={gridRef}
              className="grid grid-cols-7 gap-0.5"
              onKeyDown={onGridKeyDown}
            >
              {Array.from({ length: grid.leading }).map((_, i) => (
                <span key={`pad-${i}`} />
              ))}

              {grid.days.map(({ day, iso }) => {
                const selected = iso === value;
                const isToday = iso === today;
                const disabled = Boolean(
                  (min && iso < min) || (max && iso > max)
                );
                const tabbable =
                  day === (focusDay ?? grid.selectedDay ?? 1);

                return (
                  <button
                    key={iso}
                    type="button"
                    data-day={day}
                    disabled={disabled}
                    tabIndex={tabbable ? 0 : -1}
                    aria-pressed={selected}
                    onClick={() => pick(iso)}
                    className={`h-8 rounded-lg text-sm transition-colors ${
                      selected
                        ? "bg-indigo-600 font-bold text-white"
                        : isToday
                          ? "bg-indigo-50 font-semibold text-indigo-700"
                          : "text-slate-700 hover:bg-slate-100"
                    } disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent`}
                  >
                    {formatNumber(day, locale)}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => pick(today)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                {t("date.today")}
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  {t("date.clear")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Which month to open on: the selected date, else today. */
function viewFor(iso: string, isJalali: boolean): { year: number; month: number } {
  const source = iso || todayIso();
  if (isJalali) {
    const j = isoToJalali(source);
    if (j) return { year: j.jy, month: j.jm };
    const now = toJalali(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate()
    );
    return { year: now.jy, month: now.jm };
  }
  const g = gregorianFromIso(source);
  if (g) return { year: g.gy, month: g.gm };
  return { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
}

function buildGrid(year: number, month: number, isJalali: boolean) {
  const length = isJalali
    ? jalaliMonthLength(year, month)
    : new Date(Date.UTC(year, month, 0)).getUTCDate();

  const days = Array.from({ length }, (_, i) => {
    const day = i + 1;
    const iso = isJalali
      ? jalaliToIso(year, month, day)
      : isoFromGregorian({ gy: year, gm: month, gd: day });
    return { day, iso };
  });

  // Persian weeks start on Saturday, Gregorian on Sunday.
  const firstIso = days[0]?.iso ?? todayIso();
  const leading = isJalali
    ? persianWeekday(firstIso)
    : new Date(`${firstIso}T00:00:00Z`).getUTCDay();

  return { days, leading, length, selectedDay: null as number | null };
}
