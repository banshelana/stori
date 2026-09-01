"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { localePath } from "@/i18n/paths";
import { useAuth } from "@/lib/auth/auth-context";
import { homePathFor } from "@/lib/auth/permissions";
import { DEMO_ACCOUNTS } from "@/lib/data/users";
import { normalizeMobile, validateMobile } from "@/lib/validation";

function LoginFormInner() {
  const { signIn, pending } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!validateMobile(mobile)) errors.mobile = t("validation.mobileInvalid");
    if (!password) errors.password = t("validation.required");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const user = await signIn({ mobile: normalizeMobile(mobile), password });

      // Honour the page the guard bounced us from, but only when it's a
      // relative path — an absolute URL here would be an open redirect.
      const next = searchParams.get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") ? next : null;

      router.replace(localePath(locale, safeNext ?? homePathFor(user.role)));
    } catch {
      setError(t("auth.invalidCredentials"));
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{t("auth.loginTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("auth.loginSubtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <Field
            id="mobile"
            label={t("auth.mobile")}
            type="tel"
            value={mobile}
            onChange={setMobile}
            error={fieldErrors.mobile}
            autoComplete="tel"
            placeholder="09120000001"
          />
          <Field
            id="password"
            label={t("auth.password")}
            type="password"
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
            autoComplete="current-password"
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
            {pending ? t("common.loading") : t("auth.submitLogin")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t("auth.noAccount")}{" "}
          <Link
            href={localePath(locale, "/register")}
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {t("auth.signUpHere")}
          </Link>
        </p>
      </div>

      {/* Every sub-role is one click away so the permission model is
          walkable without hand-typing credentials. */}
      <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-700">
          {t("auth.demoAccounts")}
        </summary>
        <ul className="mt-3 space-y-1.5">
          {DEMO_ACCOUNTS.map((acct) => (
            <li key={acct.mobile}>
              <button
                type="button"
                onClick={() => {
                  setMobile(acct.mobile);
                  setPassword(acct.password);
                  setFieldErrors({});
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-start hover:bg-slate-50"
              >
                <span className="text-slate-700">{acct.name}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {t(`roles.${acct.subRole}`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function LoginForm() {
  // useSearchParams needs a boundary for this page to stay static.
  return (
    <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-slate-200" />}>
      <LoginFormInner />
    </Suspense>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white ${
          error
            ? "border-rose-300 focus:border-rose-500"
            : "border-slate-200 focus:border-indigo-500"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
