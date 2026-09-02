import type { LocalizedText } from "@/i18n/localized";

// ---------------------------------------------------------------
// Store settings.
//
// Everything here was previously a magic number scattered through the
// components — the three-day "overdue" line in the order queue, the
// five-unit low-stock badge, the hardcoded free shipping. Collecting
// them means an operator can change policy without a deploy.
// ---------------------------------------------------------------

export interface StoreSettings {
  storeName: LocalizedText;
  supportEmail: string;
  supportPhone: string;

  /** Fulfilment */
  shippingFlatRate: number; // minor units
  freeShippingThreshold: number | null; // minor units; null disables
  taxPercent: number;

  /** Inventory */
  lowStockThreshold: number;
  /** Block checkout when a line exceeds available stock. */
  enforceStock: boolean;

  /** Order queue */
  overdueAfterDays: number;

  /** SMS */
  smsSenderName: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: { en: "Storefront", fa: "فروشگاه" },
  supportEmail: "support@storefront.test",
  supportPhone: "02100000000",

  shippingFlatRate: 0,
  freeShippingThreshold: null,
  taxPercent: 0,

  lowStockThreshold: 5,
  enforceStock: true,

  overdueAfterDays: 3,

  smsSenderName: "Storefront",
};

export const SETTINGS_STORAGE_KEY = "store.settings";

/**
 * Merges stored settings over the defaults one key at a time.
 *
 * A stored blob written by an older build will be missing keys added
 * since; taking it wholesale would leave those undefined and crash the
 * consumers that assume a number.
 */
export function mergeSettings(stored: unknown): StoreSettings {
  if (!stored || typeof stored !== "object") return DEFAULT_SETTINGS;
  const input = stored as Partial<StoreSettings>;

  return {
    storeName: {
      en: input.storeName?.en || DEFAULT_SETTINGS.storeName.en,
      fa: input.storeName?.fa || DEFAULT_SETTINGS.storeName.fa,
    },
    supportEmail: input.supportEmail ?? DEFAULT_SETTINGS.supportEmail,
    supportPhone: input.supportPhone ?? DEFAULT_SETTINGS.supportPhone,

    shippingFlatRate: numberOr(
      input.shippingFlatRate,
      DEFAULT_SETTINGS.shippingFlatRate
    ),
    freeShippingThreshold:
      input.freeShippingThreshold === null
        ? null
        : numberOr(input.freeShippingThreshold, 0) || null,
    taxPercent: numberOr(input.taxPercent, DEFAULT_SETTINGS.taxPercent),

    lowStockThreshold: numberOr(
      input.lowStockThreshold,
      DEFAULT_SETTINGS.lowStockThreshold
    ),
    enforceStock: input.enforceStock ?? DEFAULT_SETTINGS.enforceStock,

    overdueAfterDays: numberOr(
      input.overdueAfterDays,
      DEFAULT_SETTINGS.overdueAfterDays
    ),

    smsSenderName: input.smsSenderName ?? DEFAULT_SETTINGS.smsSenderName,
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Shipping for a given subtotal, honouring the free-shipping threshold. */
export function shippingFor(
  subtotal: number,
  settings: StoreSettings
): number {
  if (settings.shippingFlatRate <= 0) return 0;
  const { freeShippingThreshold } = settings;
  if (freeShippingThreshold !== null && subtotal >= freeShippingThreshold) {
    return 0;
  }
  return settings.shippingFlatRate;
}

/** Cart-level tax, rounded to whole minor units. */
export function taxFor(amount: number, settings: StoreSettings): number {
  if (settings.taxPercent <= 0) return 0;
  return Math.round((amount * settings.taxPercent) / 100);
}

export function isLowStock(stock: number, settings: StoreSettings): boolean {
  return stock > 0 && stock <= settings.lowStockThreshold;
}
