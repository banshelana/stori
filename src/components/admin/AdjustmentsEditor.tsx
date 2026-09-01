"use client";

import { Icon } from "@/components/panel/Icon";
import { Badge } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import {
  isInEffect,
  priceBreakdown,
  todayISO,
  type PriceBreakdown,
} from "@/lib/pricing";
import {
  ADJUSTMENT_KINDS,
  ADJUSTMENT_MODES,
  type AdjustmentKind,
  type PriceAdjustment,
  type Product,
} from "@/lib/types";
import { toAsciiDigits } from "@/lib/validation";

const KIND_TONE: Record<AdjustmentKind, "info" | "success" | "warning"> = {
  offset: "info",
  discount: "success",
  tax: "warning",
};

function blank(kind: AdjustmentKind): PriceAdjustment {
  return {
    id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    mode: "percent",
    value: 0,
    label: "",
    // No dates by default: permanent until an admin disables or deletes it.
    startsAt: null,
    endsAt: null,
    active: true,
  };
}

/**
 * Manages a product's offsets, discounts and tax.
 *
 * Rows are edited inline rather than in a nested dialog, and a live
 * breakdown sits underneath so the order of operations is visible while
 * you type — which matters, because tax is charged on the post-discount
 * amount and stacked percents are additive.
 */
export function AdjustmentsEditor({
  adjustments,
  basePrice,
  currency,
  onChange,
}: {
  adjustments: PriceAdjustment[];
  basePrice: number;
  currency: string;
  onChange: (next: PriceAdjustment[]) => void;
}) {
  const { t, locale } = useI18n();
  const today = todayISO();

  function update(id: string, patch: Partial<PriceAdjustment>) {
    onChange(adjustments.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function remove(id: string) {
    onChange(adjustments.filter((a) => a.id !== id));
  }

  // The preview prices a stand-in product carrying exactly these rules.
  const preview: PriceBreakdown = priceBreakdown(
    {
      price: basePrice,
      compareAtPrice: null,
      adjustments,
    } as Product,
    today
  );

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("adjust.title")}
        </span>
        <span className="text-xs text-slate-400">{t("adjust.orderHint")}</span>
      </div>

      {adjustments.length > 0 && (
        <ul className="space-y-2">
          {adjustments.map((a) => {
            const live = isInEffect(a, today);
            return (
              <li
                key={a.id}
                className={`rounded-xl border p-3 ${
                  live
                    ? "border-slate-200 bg-white"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-end gap-2">
                  <Select
                    label={t("adjust.kind")}
                    value={a.kind}
                    onChange={(v) => update(a.id, { kind: v as AdjustmentKind })}
                    options={ADJUSTMENT_KINDS.map((k) => ({
                      value: k,
                      label: t(`adjust.kinds.${k}`),
                    }))}
                  />
                  <Select
                    label={t("adjust.mode")}
                    value={a.mode}
                    onChange={(v) =>
                      update(a.id, { mode: v as PriceAdjustment["mode"] })
                    }
                    options={ADJUSTMENT_MODES.map((m) => ({
                      value: m,
                      label: t(`adjust.modes.${m}`),
                    }))}
                  />

                  <label className="block w-24">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {a.mode === "percent"
                        ? t("adjust.percent")
                        : t("adjust.amount")}
                    </span>
                    <input
                      inputMode="numeric"
                      value={String(a.value)}
                      onChange={(e) =>
                        update(a.id, {
                          value: Number(toAsciiDigits(e.target.value)) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </label>

                  <label className="block min-w-32 flex-1">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t("adjust.label")}
                    </span>
                    <input
                      value={a.label ?? ""}
                      onChange={(e) => update(a.id, { label: e.target.value })}
                      placeholder={t("adjust.labelPlaceholder")}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    aria-label={t("common.delete")}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-end gap-2">
                  {/* Empty dates mean unbounded on that side, so a rule with
                      neither runs permanently. */}
                  <DateField
                    label={t("adjust.startsAt")}
                    value={a.startsAt}
                    onChange={(v) => update(a.id, { startsAt: v })}
                  />
                  <DateField
                    label={t("adjust.endsAt")}
                    value={a.endsAt}
                    onChange={(v) => update(a.id, { endsAt: v })}
                  />

                  <label className="flex items-center gap-2 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={a.active}
                      onChange={(e) => update(a.id, { active: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    {t("common.active")}
                  </label>

                  <span className="ms-auto flex items-center gap-2 py-2">
                    <Badge tone={KIND_TONE[a.kind]}>
                      {t(`adjust.kinds.${a.kind}`)}
                    </Badge>
                    {!a.startsAt && !a.endsAt && a.active && (
                      <Badge tone="neutral">{t("adjust.permanent")}</Badge>
                    )}
                    {!live && (
                      <Badge tone="neutral">{t("adjust.notInEffect")}</Badge>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {ADJUSTMENT_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => onChange([...adjustments, blank(kind)])}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Icon name="plus" className="h-4 w-4" />
            {t(`adjust.kinds.${kind}`)}
          </button>
        ))}
      </div>

      {/* Live breakdown — the same engine the storefront prices with. */}
      <dl className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
        <Row
          label={t("adjust.basePrice")}
          value={formatPrice(preview.base, currency, locale)}
        />
        {preview.offsetTotal !== 0 && (
          <Row
            label={t("adjust.kinds.offset")}
            value={formatPrice(preview.offsetTotal, currency, locale)}
            tone="slate"
          />
        )}
        {preview.discountTotal !== 0 && (
          <Row
            label={t("adjust.kinds.discount")}
            value={`− ${formatPrice(preview.discountTotal, currency, locale)}`}
            tone="emerald"
          />
        )}
        {preview.taxTotal !== 0 && (
          <Row
            label={t("adjust.kinds.tax")}
            value={`+ ${formatPrice(preview.taxTotal, currency, locale)}`}
            tone="amber"
          />
        )}
        <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900">
          <dt>{t("adjust.finalPrice")}</dt>
          <dd>{formatPrice(preview.total, currency, locale)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber";
}) {
  const colour = {
    slate: "text-slate-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  }[tone];

  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium ${colour}`}>{value}</dd>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type="date"
        value={value ?? ""}
        // Clearing the field restores the unbounded side.
        onChange={(e) => onChange(e.target.value || null)}
        // The native picker is Gregorian in every locale; a Jalali picker
        // would be a separate component.
        dir="ltr"
        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
      />
    </label>
  );
}
