// ---------------------------------------------------------------
// Cart-level discount codes.
//
// Distinct from the per-product PriceAdjustment rules in pricing.ts:
// those change what a product costs, a coupon reduces what the whole
// basket costs and is entered by the shopper.
// ---------------------------------------------------------------

export const COUPON_KINDS = ["percent", "amount"] as const;
export type CouponKind = (typeof COUPON_KINDS)[number];

export interface Coupon {
  id: string;
  /** Compared case-insensitively; stored upper-case. */
  code: string;
  kind: CouponKind;
  /** Percent: 10 means 10%. Amount: minor units. */
  value: number;
  /** Minimum cart subtotal in minor units before the code applies. */
  minSubtotal: number;
  /** Caps a percentage discount in minor units; 0 means uncapped. */
  maxDiscount: number;
  /** YYYY-MM-DD, inclusive. Null means unbounded on that side. */
  startsAt: string | null;
  endsAt: string | null;
  /** 0 means unlimited. */
  usageLimit: number;
  usedCount: number;
  active: boolean;
}

export const MOCK_COUPONS: Coupon[] = [
  {
    id: "cpn-001",
    code: "WELCOME10",
    kind: "percent",
    value: 10,
    minSubtotal: 0,
    maxDiscount: 5000,
    startsAt: null,
    endsAt: null,
    usageLimit: 0,
    usedCount: 12,
    active: true,
  },
  {
    id: "cpn-002",
    code: "FREESHIP",
    kind: "amount",
    value: 500,
    minSubtotal: 10000,
    maxDiscount: 0,
    startsAt: null,
    endsAt: null,
    usageLimit: 100,
    usedCount: 4,
    active: true,
  },
  {
    id: "cpn-003",
    code: "SUMMER25",
    kind: "percent",
    value: 25,
    minSubtotal: 20000,
    maxDiscount: 10000,
    startsAt: "2026-06-01",
    endsAt: "2026-08-31",
    usageLimit: 50,
    usedCount: 50,
    active: true,
  },
];
