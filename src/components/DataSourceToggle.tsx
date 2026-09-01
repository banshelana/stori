"use client";

import { isApiConfigured } from "@/lib/data/config";
import { useDataSource } from "@/lib/data/source-context";
import type { DataSource } from "@/lib/types";

const OPTIONS: { value: DataSource; label: string }[] = [
  { value: "mock", label: "Mock" },
  { value: "api", label: "API" },
];

/** Switches between mock data and the live API at runtime. */
export function DataSourceToggle() {
  const { source, setSource } = useDataSource();

  // Selecting "API" without a configured base URL silently serves mock
  // data, so surface that instead of letting the label lie.
  const fallingBack = source === "api" && !isApiConfigured();

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5 text-sm font-medium shadow-sm"
        role="group"
        aria-label="Data source"
      >
        <span className="hidden ps-2.5 pe-1 text-xs uppercase tracking-wide text-slate-400 sm:inline">
          Data
        </span>
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSource(opt.value)}
            aria-pressed={source === opt.value}
            className={`rounded-full px-3 py-1 transition-colors ${
              source === opt.value
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {fallingBack && (
        <span
          title="NEXT_PUBLIC_API_URL is not set — serving mock data"
          className="cursor-help rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
        >
          !
        </span>
      )}
    </div>
  );
}
