"use client";

import { useEffect, useRef, useState } from "react";

/** Shared across the storefront search boxes and useResourceList. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Returns `value` after it has stopped changing for `delay` ms.
 *
 * The first value is returned immediately rather than after a delay, so a
 * page that mounts with a query already in the URL renders its results on
 * the first paint instead of flashing an empty state.
 */
export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

/**
 * Debounced text input state for a search box.
 *
 * `value` drives the input and updates on every keystroke so typing never
 * feels laggy; `debounced` is what callers should query with. `sync` lets
 * an external source of truth (the URL, a Reset button) push a new value
 * in without it bouncing back through the debounce.
 */
export function useSearchInput(initial = "", delay = SEARCH_DEBOUNCE_MS) {
  const [value, setValue] = useState(initial);
  const debounced = useDebouncedValue(value, delay);
  const lastSynced = useRef(initial);

  function sync(next: string) {
    // Ignore echoes of a value this input itself produced.
    if (next === lastSynced.current) return;
    lastSynced.current = next;
    setValue(next);
  }

  function commit(next: string) {
    lastSynced.current = next;
  }

  return { value, setValue, debounced, sync, commit };
}
