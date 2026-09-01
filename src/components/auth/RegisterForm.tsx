"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/form/Field";
import { useI18n } from "@/i18n/I18nProvider";
import { localePath } from "@/i18n/paths";
import { useAuth } from "@/lib/auth/auth-context";
import { useFormErrors } from "@/lib/useFormErrors";
import {
  normalizeMobile,
  validateMinLength,
  validateMobile,
  validateRequired,
} from "@/lib/validation";

/**
 * Registration is deliberately minimal: name, family and mobile. Everything
 * else is collected later from the profile page, so signup never blocks on
 * information the user may not want to give up front.
 */
export function RegisterForm() {
  const { signUp, pending } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const {
    errors: fieldErrors,
    setErrors: setFieldErrors,
    clear,
  } = useFormErrors();

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    clear(key);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!validateRequired(form.firstName)) {
      errors.firstName = t("validation.required");
    }
    if (!validateRequired(form.lastName)) {
      errors.lastName = t("validation.required");
    }
    if (!validateMobile(form.mobile)) {
      errors.mobile = t("validation.mobileInvalid");
    }
    if (!validateMinLength(form.password, 6)) {
      errors.password = t("validation.minLength", { min: 6 });
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await signUp({
        ...form,
        mobile: normalizeMobile(form.mobile),
      });
      router.replace(localePath(locale, "/"));
    } catch (err) {
      setError(
        err instanceof Error && err.message === "MOBILE_TAKEN"
          ? t("auth.mobileTaken")
          : t("common.error")
      );
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">
        {t("auth.registerTitle")}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{t("auth.registerSubtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("auth.firstName")}
            value={form.firstName}
            onChange={(v) => set("firstName", v)}
            error={fieldErrors.firstName}
            autoComplete="given-name"
          />
          <TextField
            label={t("auth.lastName")}
            value={form.lastName}
            onChange={(v) => set("lastName", v)}
            error={fieldErrors.lastName}
            autoComplete="family-name"
          />
        </div>

        <TextField
          label={t("auth.mobile")}
          type="tel"
          value={form.mobile}
          onChange={(v) => set("mobile", v)}
          error={fieldErrors.mobile}
          hint={t("auth.mobileHint")}
          autoComplete="tel"
          placeholder="09xxxxxxxxx"
        />

        <TextField
          label={t("auth.password")}
          type="password"
          value={form.password}
          onChange={(v) => set("password", v)}
          error={fieldErrors.password}
          autoComplete="new-password"
        />

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t("common.loading") : t("auth.submitRegister")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {t("auth.haveAccount")}{" "}
        <Link
          href={localePath(locale, "/login")}
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          {t("auth.signInHere")}
        </Link>
      </p>
    </div>
  );
}
