"use client";

import { useEffect, useId, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

/**
 * Two-thumb price range.
 *
 * Built from two real `<input type="range">` elements stacked on one
 * track rather than a custom pointer widget: each thumb is then a native
 * slider, so it is keyboard operable and announced properly by screen
 * readers for free. The visible track is a div underneath; the inputs
 * are transparent and only their thumbs receive pointer events.
 *
 * Dragging is local state; the committed value is debounced so the URL
 * updates once the shopper settles rather than on every pixel.
 */
export function PriceRange({
  min,
  max,
  value,
  currency,
  onChange,
}: {
  min: number;
  max: number;
  /** [low, high] in minor units. */
  value: [number, number];
  currency: string;
  onChange: (next: [number, number]) => void;
}) {
  const { t, locale } = useI18n();
  const id = useId();

  const [low, setLow] = useState(value[0]);
  const [high, setHigh] = useState(value[1]);

  // Adopt external changes (Reset, a category switch narrowing bounds).
  useEffect(() => {
    setLow(value[0]);
    setHigh(value[1]);
  }, [value]);

  const debouncedLow = useDebouncedValue(low, 350);
  const debouncedHigh = useDebouncedValue(high, 350);

  useEffect(() => {
    if (debouncedLow === value[0] && debouncedHigh === value[1]) return;
    onChange([debouncedLow, debouncedHigh]);
    // onChange identity is not stable in callers; the value guard above
    // is what prevents a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLow, debouncedHigh]);

  const span = Math.max(1, max - min);
  const leftPct = ((low - min) / span) * 100;
  const rightPct = ((high - min) / span) * 100;

  const step = Math.max(1, Math.round(span / 100));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("product.priceRange")}
        </span>
        <span className="text-xs font-medium text-slate-700">
          {formatPrice(low, currency, locale)} –{" "}
          {formatPrice(high, currency, locale)}
        </span>
      </div>

      <div className="relative h-6">
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200" />
        {/* Selected span. Uses inset-inline so it fills from the correct
            edge in RTL without recomputing the percentages. */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          style={{
            insetInlineStart: `${leftPct}%`,
            width: `${Math.max(0, rightPct - leftPct)}%`,
          }}
        />

        <input
          id={`${id}-low`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          aria-label={t("product.priceMin")}
          onChange={(e) => setLow(Math.min(Number(e.target.value), high))}
          className="range-thumb absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent"
        />
        <input
          id={`${id}-high`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          aria-label={t("product.priceMax")}
          onChange={(e) => setHigh(Math.max(Number(e.target.value), low))}
          className="range-thumb absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent"
        />
      </div>
    </div>
  );
}
