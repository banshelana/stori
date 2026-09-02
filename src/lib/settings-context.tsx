"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  SETTINGS_STORAGE_KEY,
  type StoreSettings,
} from "@/lib/settings";

interface SettingsContextValue {
  settings: StoreSettings;
  /** False until localStorage has been read. */
  ready: boolean;
  save: (next: StoreSettings) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) setSettings(mergeSettings(JSON.parse(raw)));
    } catch {
      /* ignore — fall back to defaults */
    }
    hydrated.current = true;
    setReady(true);
  }, []);

  // Settings changed in another tab should not be silently stale here.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== SETTINGS_STORAGE_KEY) return;
      try {
        setSettings(e.newValue ? mergeSettings(JSON.parse(e.newValue)) : DEFAULT_SETTINGS);
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((next: StoreSettings) => {
    setSettings(next);
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore — private mode or storage disabled */
    }
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ settings, ready, save, reset }),
    [settings, ready, save, reset]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
