"use client";

import { useState } from "react";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import { stockAlertsRepo } from "@/lib/data/repositories";
import { alreadySubscribed } from "@/lib/stockAlerts";
import { normalizeNumber, isValidNumber } from "@/lib/sms";

/**
 * Shown in place of the buy button when a product is sold out.
 *
 * Signed-in shoppers get their number prefilled; anyone can leave one.
 * Re-subscribing the same number is treated as success rather than an
 * error — the outcome the shopper wanted is already true.
 */
export function BackInStockForm({ productId }: { productId: string }) {
  const { t } = useI18n();
  const { user } = useAuth();

  const [mobile, setMobile] = useState(user?.mobile ?? "");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeNumber(mobile);

    if (!isValidNumber(normalized)) {
      setError(t("validation.mobileInvalid"));
      return;
    }
    setError(null);
    setState("saving");

    try {
      if (!alreadySubscribed(stockAlertsRepo.all(), productId, normalized)) {
        await stockAlertsRepo.create({
          productId,
          mobile: normalized,
          userId: user?.id,
          createdAt: new Date().toISOString().slice(0, 10),
          notifiedAt: null,
        });
      }
      setState("done");
    } catch {
      setState("idle");
      setError(t("common.error"));
    }
  }

  if (state === "done") {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
        <Icon name="check" className="h-4 w-4 shrink-0" />
        {t("stockAlert.subscribed")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon name="bell" className="h-4 w-4 text-indigo-500" />
        {t("stockAlert.title")}
      </p>
      <p className="mt-1 text-sm text-slate-500">{t("stockAlert.body")}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="tel"
          value={mobile}
          onChange={(e) => {
            setMobile(e.target.value);
            setError(null);
          }}
          placeholder="09xxxxxxxxx"
          aria-label={t("auth.mobile")}
          aria-invalid={Boolean(error)}
          className={`min-w-0 flex-1 rounded-lg border bg-white px-3 py-2.5 text-sm outline-none ${
            error ? "border-rose-300" : "border-slate-200 focus:border-indigo-500"
          }`}
        />
        <button
          type="submit"
          disabled={state === "saving"}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {state === "saving" ? t("common.loading") : t("stockAlert.notifyMe")}
        </button>
      </div>

      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </form>
  );
}
