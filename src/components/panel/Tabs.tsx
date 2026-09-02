"use client";

import { useId } from "react";

export interface TabDef {
  id: string;
  label: string;
  /** Shown as a count pill beside the label. */
  badge?: string | number;
}

/**
 * Tab strip following the WAI-ARIA tabs pattern: arrow keys move between
 * tabs, Home/End jump to the ends, and only the active tab is in the tab
 * order so Tab moves out of the strip rather than through every tab.
 */
export function Tabs({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const base = useId();

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((t) => t.id === active);
    if (index === -1) return;

    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;

    e.preventDefault();
    onChange(tabs[next].id);
    document.getElementById(`${base}-${tabs[next].id}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            id={`${base}-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`${base}-${tab.id}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              selected
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={`rounded-full px-1.5 text-xs font-bold ${
                  selected
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: string;
  children: React.ReactNode;
}) {
  if (id !== active) return null;
  return (
    <div role="tabpanel" className="animate-fade-in">
      {children}
    </div>
  );
}
