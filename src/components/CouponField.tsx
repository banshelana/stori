"use client";

import { useState } from "react";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { checkCoupon, type CouponCheck } from "@/lib/coupons";
import { couponsRepo } from "@/lib/data/repositories";
import { useCoupon } from "@/lib/coupon-context";
import { formatPrice } from "@/lib/format";

/**
 * Applies a discount code to the basket.
 *
 * The check runs against the live subtotal every render, so a code that
 * was valid at 200 and stops being valid when the basket drops to 50
 * reports itself as no longer applicable rather than silently keeping a
 * discount the shopper is no longer entitled to.
 */
export function CouponField({
  subtotal,
  currency,
  check,
}: {
  subtotal: number;
  currency: string;
  check: CouponCheck | null;
}) {
  const { t, locale } = useI18n();
  const { code, apply, remove } = useCoupon();
  const [draft, setDraft] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    apply(draft);
    setDraft("");
  }

  if (code && check?.ok) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <Icon name="tag" className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="truncate font-semibold text-emerald-800">{code}</span>
          <span className="shrink-0 text-emerald-700">
            −{formatPrice(check.discount, currency, locale)}
          </span>
        </span>
        <button
          type="button"
          onClick={remove}
          className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
        >
          {t("coupon.remove")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("coupon.placeholder")}
          aria-label={t("coupon.label")}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm uppercase outline-none focus:border-indigo-500 focus:bg-white"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {t("coupon.apply")}
        </button>
      </form>

      {/* A rejected code stays visible with its reason, so the shopper
          can see which code failed and why. */}
      {code && check && !check.ok && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-rose-600">
          <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-semibold">{code}</span>{" "}
            {check.reason === "belowMinimum" && check.shortfall !== undefined
              ? t("coupon.reason.belowMinimum", {
                  amount: formatPrice(check.shortfall, currency, locale),
                })
              : t(`coupon.reason.${check.reason}`)}
            <button
              type="button"
              onClick={remove}
              className="ms-2 font-semibold underline hover:no-underline"
            >
              {t("coupon.remove")}
            </button>
          </span>
        </p>
      )}
    </div>
  );
}
