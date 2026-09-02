"use client";

import { useEffect, useState } from "react";
import {
  CheckboxField,
  TextField,
} from "@/components/form/Field";
import { Card, PageHeader } from "@/components/panel/ui";
import { LOCALE_LABEL, LOCALES } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import { DEFAULT_SETTINGS, type StoreSettings } from "@/lib/settings";
import { useSettings } from "@/lib/settings-context";
import { useFormErrors } from "@/lib/useFormErrors";
import { toAsciiDigits, validateEmail, validateRequired } from "@/lib/validation";

/** Money is stored in minor units but edited in major ones. */
function toMajor(minor: number): string {
  return minor === 0 ? "" : String(minor / 100);
}
function toMinor(major: string): number {
  const n = Number(toAsciiDigits(major));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function SettingsSection() {
  const { t, locale } = useI18n();
  const { settings, ready, save, reset } = useSettings();
  const { errors, setErrors, clear } = useFormErrors();

  const [form, setForm] = useState<StoreSettings>(settings);
  const [saved, setSaved] = useState(false);

  // Adopt the stored values once hydration has run.
  useEffect(() => {
    if (ready) setForm(settings);
  }, [ready, settings]);

  function set<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    clear(key as string);
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const next: Record<string, string> = {};
    for (const lang of LOCALES) {
      if (!validateRequired(form.storeName[lang])) {
        next[`storeName.${lang}`] = t("validation.required");
      }
    }
    if (!validateEmail(form.supportEmail)) {
      next.supportEmail = t("validation.emailInvalid");
    }
    if (form.taxPercent < 0 || form.taxPercent > 100) {
      next.taxPercent = t("settings.percentRange");
    }
    if (form.lowStockThreshold < 0) {
      next.lowStockThreshold = t("settings.notNegative");
    }
    if (form.overdueAfterDays < 1) {
      next.overdueAfterDays = t("settings.atLeastOne");
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    save(form);
    setSaved(true);
  }

  return (
    <>
      <PageHeader title={t("admin.settings")} subtitle={t("settings.hint")} />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* ------------------------------------------- identity */}
        <Card>
          <h2 className="font-bold text-slate-900">{t("settings.identity")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {LOCALES.map((lang) => (
              <TextField
                key={lang}
                label={`${t("settings.storeName")} — ${LOCALE_LABEL[lang]}`}
                required
                dir={lang === "fa" ? "rtl" : "ltr"}
                value={form.storeName[lang]}
                onChange={(v) =>
                  set("storeName", { ...form.storeName, [lang]: v })
                }
                error={errors[`storeName.${lang}`]}
              />
            ))}
            <TextField
              label={t("settings.supportEmail")}
              type="email"
              value={form.supportEmail}
              onChange={(v) => set("supportEmail", v)}
              error={errors.supportEmail}
            />
            <TextField
              label={t("settings.supportPhone")}
              type="tel"
              value={form.supportPhone}
              onChange={(v) => set("supportPhone", v)}
            />
          </div>
        </Card>

        {/* ----------------------------------------- fulfilment */}
        <Card>
          <h2 className="font-bold text-slate-900">{t("settings.fulfilment")}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t("settings.fulfilmentHint")}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <TextField
              label={t("settings.shippingFlatRate")}
              inputMode="numeric"
              hint={t("settings.majorUnits")}
              value={toMajor(form.shippingFlatRate)}
              onChange={(v) => set("shippingFlatRate", toMinor(v))}
            />
            <TextField
              label={t("settings.freeShippingThreshold")}
              inputMode="numeric"
              hint={t("settings.blankDisables")}
              value={
                form.freeShippingThreshold === null
                  ? ""
                  : toMajor(form.freeShippingThreshold)
              }
              onChange={(v) =>
                set("freeShippingThreshold", v.trim() ? toMinor(v) : null)
              }
            />
            <TextField
              label={t("settings.taxPercent")}
              inputMode="numeric"
              value={String(form.taxPercent)}
              onChange={(v) => set("taxPercent", Number(toAsciiDigits(v)) || 0)}
              error={errors.taxPercent}
            />
          </div>

          {form.shippingFlatRate > 0 && (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              {t("settings.shippingPreview", {
                rate: formatPrice(form.shippingFlatRate, "EUR", locale),
                threshold:
                  form.freeShippingThreshold === null
                    ? t("settings.never")
                    : formatPrice(form.freeShippingThreshold, "EUR", locale),
              })}
            </p>
          )}
        </Card>

        {/* ------------------------------------------ inventory */}
        <Card>
          <h2 className="font-bold text-slate-900">{t("settings.inventory")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              label={t("settings.lowStockThreshold")}
              inputMode="numeric"
              hint={t("settings.lowStockHint")}
              value={String(form.lowStockThreshold)}
              onChange={(v) =>
                set("lowStockThreshold", Number(toAsciiDigits(v)) || 0)
              }
              error={errors.lowStockThreshold}
            />
            <TextField
              label={t("settings.overdueAfterDays")}
              inputMode="numeric"
              hint={t("settings.overdueHint")}
              value={String(form.overdueAfterDays)}
              onChange={(v) =>
                set("overdueAfterDays", Number(toAsciiDigits(v)) || 1)
              }
              error={errors.overdueAfterDays}
            />
          </div>
          <CheckboxField
            className="mt-4"
            label={t("settings.enforceStock")}
            checked={form.enforceStock}
            onChange={(v) => set("enforceStock", v)}
          />
          <p className="mt-1 text-xs text-slate-400">
            {t("settings.enforceStockHint")}
          </p>
        </Card>

        {/* ------------------------------------------------ sms */}
        <Card>
          <h2 className="font-bold text-slate-900">{t("admin.messages")}</h2>
          <div className="mt-4 sm:max-w-sm">
            <TextField
              label={t("settings.smsSenderName")}
              value={form.smsSenderName}
              onChange={(v) => set("smsSenderName", v)}
            />
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="btn-glow rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white"
          >
            {t("common.saveChanges")}
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              setForm(DEFAULT_SETTINGS);
              setSaved(false);
            }}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {t("settings.restoreDefaults")}
          </button>
          {saved && (
            <p role="status" className="animate-fade-in text-sm font-medium text-emerald-600">
              {t("common.saved")}
            </p>
          )}
        </div>
      </form>
    </>
  );
}
