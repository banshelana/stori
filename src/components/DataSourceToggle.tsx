"use client";

import { useDataSource } from "@/lib/data/source-context";
import type { DataSource } from "@/lib/types";

const OPTIONS: { value: DataSource; label: string }[] = [
  { value: "mock", label: "Mock" },
  { value: "api", label: "API" },
];

// The front-end setting the user asked for: switch between Mock data
// and a live Backend/API at runtime, persisted to localStorage.
export function DataSourceToggle() {
  const { source, setSource } = useDataSource();

  return (
    <div
      className="inline-flex items-center gap-0 rounded-full border border-slate-200 bg-white p-0.5 text-sm font-medium shadow-sm"
      role="group"
      aria-label="Data source"
    >
      <span className="hidden pl-2.5 pr-1 text-xs uppercase tracking-wide text-slate-400 sm:inline">
        Data
      </span>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setSource(opt.value)}
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
  );
}
