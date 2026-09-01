"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TextField } from "@/components/form/Field";
import { useFormErrors } from "@/lib/useFormErrors";
import { useI18n } from "@/i18n/I18nProvider";
import { localePath } from "@/i18n/paths";
import { useAuth } from "@/lib/auth/auth-context";
import { hasPermission } from "@/lib/auth/permissions";
import { permissionForPath } from "@/lib/nav";
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
  const {
    errors: fieldErrors,
    setErrors: setFieldErrors,
    clear,
  } = useFormErrors();

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

      // Honour the page the guard bounced us from, but only when it is
      // safe to follow. Two separate checks:
      //   1. relative path — an absolute URL here would be an open redirect;
      //   2. this user can actually reach it — whoever signs in is not
      //      necessarily whoever was bounced, and following a stale `next`
      //      would land them on the "no access" page instead of their home.
      const next = searchParams.get("next");
      const isRelative =
        Boolean(next) && next!.startsWith("/") && !next!.startsWith("//");
      const required = isRelative ? permissionForPath(next!) : undefined;
      const reachable =
        isRelative && (!required || hasPermission(user.subRole, required));

      // Everyone lands on the storefront home; their panel is one click
      // away in the user menu. A guard's `next` still wins when the user
      // can actually reach it.
      router.replace(localePath(locale, reachable ? next! : "/"));
    } catch (err) {
      // A disabled account is a different problem from a wrong password,
      // and telling someone to keep retrying credentials that are correct
      // is worse than useless.
      setError(
        err instanceof Error && err.message === "ACCOUNT_DISABLED"
          ? t("auth.accountDisabled")
          : t("auth.invalidCredentials")
      );
    }
  }

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_10px_40px_-20px_rgb(15_23_42/0.35)]">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t("auth.loginTitle")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("auth.loginSubtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <TextField
            label={t("auth.mobile")}
            type="tel"
            value={mobile}
            onChange={(v) => {
              setMobile(v);
              clear("mobile");
            }}
            error={fieldErrors.mobile}
            autoComplete="tel"
            placeholder="09120000001"
          />
          <TextField
            label={t("auth.password")}
            type="password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              clear("password");
            }}
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
            className="btn-glow w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
      <details className="animate-fade-up mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm" style={{ animationDelay: "220ms" }}>
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
      <Suspense fallback={<div className="skeleton h-96 w-full rounded-2xl" />}>
      <LoginFormInner />
    </Suspense>
  );
}
