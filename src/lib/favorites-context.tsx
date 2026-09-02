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
import { useAuth } from "@/lib/auth/auth-context";

const STORAGE_PREFIX = "store.favorites.";
const GUEST_BUCKET = "guest";

/**
 * Favourites are per person, so each account gets its own bucket and a
 * signed-out visitor writes to a guest one. Signing in merges the guest
 * list into the account rather than discarding it — someone who browsed,
 * hearted a few things and only then registered would otherwise lose
 * everything they picked.
 */
function keyFor(userId: string | null): string {
  return `${STORAGE_PREFIX}${userId ?? GUEST_BUCKET}`;
}

function read(userId: string | null): string[] {
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function write(userId: string | null, ids: string[]) {
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(ids));
  } catch {
    /* ignore — private mode or storage disabled */
  }
}

interface FavoritesContextValue {
  ids: string[];
  count: number;
  /** False until localStorage has been read. */
  ready: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const userId = user?.id ?? null;

  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const mergedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!authReady) return;

    let next = read(userId);

    // On first load for a signed-in account, fold in anything hearted
    // while signed out, then empty the guest bucket so it cannot be
    // merged a second time into a different account.
    if (userId && mergedFor.current !== userId) {
      const guest = read(null);
      if (guest.length > 0) {
        next = [...new Set([...next, ...guest])];
        write(userId, next);
        write(null, []);
      }
      mergedFor.current = userId;
    }

    setIds(next);
    setReady(true);
  }, [authReady, userId]);

  const persist = useCallback(
    (next: string[]) => {
      setIds(next);
      write(userId, next);
    },
    [userId]
  );

  const has = useCallback((productId: string) => ids.includes(productId), [ids]);

  const toggle = useCallback(
    (productId: string) => {
      persist(
        ids.includes(productId)
          ? ids.filter((id) => id !== productId)
          : [...ids, productId]
      );
    },
    [ids, persist]
  );

  const remove = useCallback(
    (productId: string) => persist(ids.filter((id) => id !== productId)),
    [ids, persist]
  );

  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo(
    () => ({ ids, count: ids.length, ready, has, toggle, remove, clear }),
    [ids, ready, has, toggle, remove, clear]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return ctx;
}
