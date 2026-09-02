"use client";

import { CheckboxField, SelectField, TextField } from "@/components/form/Field";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import type {
  AttributeValue,
  Category,
  FilterSpec,
} from "@/lib/types";

type Attributes = Record<string, AttributeValue | AttributeValue[]>;

/**
 * Renders the attribute inputs a category declares.
 *
 * The same `FilterSpec[]` that drives the storefront filter panel drives
 * this form, so a facet added to a category in the database gets an
 * editor here with no code change — and the two can never drift into
 * asking for different fields.
 */
export function AttributesEditor({
  category,
  value,
  onChange,
}: {
  category: Category | undefined;
  value: Attributes;
  onChange: (next: Attributes) => void;
}) {
  const { t, locale } = useI18n();

  if (!category) return null;

  if (category.filters.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
        {t("product.noAttributes")}
      </p>
    );
  }

  function set(key: string, next: AttributeValue | AttributeValue[] | undefined) {
    const copy = { ...value };
    if (next === undefined || next === "") delete copy[key];
    else copy[key] = next;
    onChange(copy);
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {t("product.attributes")} — {localized(category.name, locale)}
      </p>

      {category.filters.map((spec) => (
        <AttributeField
          key={spec.key}
          spec={spec}
          value={value[spec.key]}
          onChange={(next) => set(spec.key, next)}
        />
      ))}
    </div>
  );
}

function AttributeField({
  spec,
  value,
  onChange,
}: {
  spec: FilterSpec;
  value: AttributeValue | AttributeValue[] | undefined;
  onChange: (next: AttributeValue | AttributeValue[] | undefined) => void;
}) {
  const { t, locale } = useI18n();
  const label = localized(spec.label, locale);

  switch (spec.kind) {
    case "boolean":
      return (
        <CheckboxField
          label={label}
          checked={value === true || value === "true"}
          onChange={(checked) => onChange(checked)}
        />
      );

    case "range":
      return (
        <TextField
          label={`${label}${spec.unit ? ` (${spec.unit})` : ""}`}
          inputMode="numeric"
          hint={t("product.rangeHint", {
            min: String(spec.min ?? 0),
            max: String(spec.max ?? 0),
          })}
          value={value === undefined ? "" : String(value)}
          onChange={(v) => onChange(v === "" ? undefined : Number(v))}
        />
      );

    case "multi": {
      // Stored as an array; each option is an independent checkbox.
      const selected = Array.isArray(value) ? value.map(String) : [];
      return (
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </span>
          <div className="flex flex-wrap gap-3">
            {(spec.options ?? []).map((option) => {
              const on = selected.includes(option.value);
              return (
                <CheckboxField
                  key={option.value}
                  label={localized(option.label, locale)}
                  checked={on}
                  onChange={(checked) =>
                    onChange(
                      checked
                        ? [...selected, option.value]
                        : selected.filter((v) => v !== option.value)
                    )
                  }
                />
              );
            })}
          </div>
        </div>
      );
    }

    case "select":
    default:
      return (
        <SelectField
          label={label}
          value={value === undefined ? "" : String(value)}
          placeholder={t("common.none")}
          onChange={(v) => onChange(v || undefined)}
          options={(spec.options ?? []).map((option) => ({
            value: option.value,
            label: localized(option.label, locale),
          }))}
        />
      );
  }
}
