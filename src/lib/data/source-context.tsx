"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_SOURCE } from "@/lib/data/config";
import type { DataSource } from "@/lib/types";

const STORAGE_KEY = "store.dataSource";

interface SourceContextValue {
  source: DataSource;
  setSource: (source: DataSource) => void;
}

const SourceContext = createContext<SourceContextValue | null>(null);

export function DataSourceProvider({ children }: { children: React.ReactNode }) {
  const [source, setSourceState] = useState<DataSource>(DEFAULT_SOURCE);

  // Hydrate the user's saved choice.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "mock" || saved === "api") setSourceState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setSource = useCallback((next: DataSource) => {
    setSourceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ source, setSource }), [source, setSource]);

  return <SourceContext.Provider value={value}>{children}</SourceContext.Provider>;
}

export function useDataSource(): SourceContextValue {
  const ctx = useContext(SourceContext);
  if (!ctx) {
    throw new Error("useDataSource must be used within a DataSourceProvider");
  }
  return ctx;
}
