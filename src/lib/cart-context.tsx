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
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "store.cart";

interface CartContextValue {
  items: CartItem[];
  count: number;
  /** False until localStorage has been read. */
  hydrated: boolean;
  addItem: (productId: string, quantity?: number, maxStock?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number, maxStock?: number) => void;
  quantityOf: (productId: string) => number;
  clear: () => void;
  has: (productId: string) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

function readCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop anything malformed rather than letting it poison the cart.
    return parsed.filter(
      (i): i is CartItem =>
        typeof i === "object" &&
        i !== null &&
        typeof (i as CartItem).productId === "string" &&
        Number.isFinite((i as CartItem).quantity)
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    setItems(readCart());
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Without this guard the first commit writes the empty initial state
    // over the saved cart before hydration has had a chance to load it.
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore — private mode or storage disabled */
    }
  }, [items]);

  const addItem = useCallback(
    (productId: string, quantity = 1, maxStock?: number) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === productId);
        const cap = maxStock ?? Number.POSITIVE_INFINITY;
        if (existing) {
          const next = Math.min(existing.quantity + quantity, cap);
          if (next === existing.quantity) return prev;
          return prev.map((i) =>
            i.productId === productId ? { ...i, quantity: next } : i
          );
        }
        const next = Math.min(quantity, cap);
        if (next <= 0) return prev;
        return [...prev, { productId, quantity: next }];
      });
    },
    []
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const setQuantity = useCallback(
    (productId: string, quantity: number, maxStock?: number) => {
      const capped = Math.min(quantity, maxStock ?? Number.POSITIVE_INFINITY);
      setItems((prev) =>
        capped <= 0
          ? prev.filter((i) => i.productId !== productId)
          : prev.map((i) =>
              i.productId === productId ? { ...i, quantity: capped } : i
            )
      );
    },
    []
  );

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const quantityOf = useCallback(
    (productId: string) =>
      items.find((i) => i.productId === productId)?.quantity ?? 0,
    [items]
  );

  const has = useCallback(
    (productId: string) => items.some((i) => i.productId === productId),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      count,
      hydrated,
      addItem,
      removeItem,
      setQuantity,
      quantityOf,
      clear,
      has,
    }),
    [
      items,
      count,
      hydrated,
      addItem,
      removeItem,
      setQuantity,
      quantityOf,
      clear,
      has,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
