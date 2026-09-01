"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { formatNumber } from "@/lib/format";

export function Rating({ value }: { value: number }) {
  const { locale, isRtl } = useI18n();
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative h-4 w-20">
        <div className="absolute inset-0 text-sm text-slate-300" aria-hidden>
          &#9733;&#9733;&#9733;&#9733;&#9733;
        </div>
        {/* The fill has to grow from the reading edge, which flips in RTL. */}
        <div
          className="absolute inset-y-0 overflow-hidden text-sm text-amber-400"
          style={{ width: `${pct}%`, [isRtl ? "right" : "left"]: 0 }}
          aria-hidden
        >
          &#9733;&#9733;&#9733;&#9733;&#9733;
        </div>
      </div>
      <span className="text-xs text-slate-500">
        {formatNumber(Number(value.toFixed(1)), locale)}
      </span>
    </div>
  );
}
