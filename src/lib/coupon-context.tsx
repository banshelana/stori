"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { checkCoupon, type CouponCheck } from "@/lib/coupons";
import { couponsRepo } from "@/lib/data/repositories";

const STORAGE_KEY = "store.coupon";

interface CouponContextValue {
  /** The code the shopper has entered, if any. Validity is re-checked
   *  against the live subtotal wherever it is used. */
  code: string | null;
  ready: boolean;
  apply: (code: string) => void;
  remove: () => void;
}

const CouponContext = createContext<CouponContextValue | null>(null);

/**
 * Holds only the entered code, never the computed discount.
 *
 * The basket changes after a code is applied — items added, quantities
 * changed — so a stored discount would go stale. Re-deriving it from the
 * current subtotal means the total can never disagree with the lines.
 */
export function CouponProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCode(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const apply = useCallback((next: string) => {
    const trimmed = next.trim().toUpperCase();
    setCode(trimmed || null);
    try {
      if (trimmed) window.localStorage.setItem(STORAGE_KEY, trimmed);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const remove = useCallback(() => {
    setCode(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ code, ready, apply, remove }),
    [code, ready, apply, remove]
  );

  return <CouponContext.Provider value={value}>{children}</CouponContext.Provider>;
}

export function useCoupon(): CouponContextValue {
  const ctx = useContext(CouponContext);
  if (!ctx) throw new Error("useCoupon must be used within a CouponProvider");
  return ctx;
}

/**
 * Re-derives the coupon's validity and discount from the current
 * subtotal. Both the cart and the checkout call this, so the two can
 * never show a different total for the same basket.
 */
export function useCouponCheck(subtotal: number): CouponCheck | null {
  const { code } = useCoupon();
  return useMemo(() => {
    if (!code) return null;
    return checkCoupon(couponsRepo.all(), code, subtotal);
  }, [code, subtotal]);
}

export function couponDiscount(check: CouponCheck | null): number {
  return check?.ok ? check.discount : 0;
}
