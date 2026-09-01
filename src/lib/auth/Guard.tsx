"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { localePath, stripLocale } from "@/i18n/paths";
import { useAuth } from "@/lib/auth/auth-context";
import { panelPathFor } from "@/lib/auth/permissions";
import type { Permission } from "@/lib/auth/types";

/**
 * Client-side route guard.
 *
 * Note this protects the UI, not the data — a real backend must enforce the
 * same permissions on every endpoint. With the session in localStorage there
 * is no server-side check available, which is the trade-off of the storage
 * choice; the axios 401 interceptor is the backstop.
 */
export function Guard({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { user, ready, can } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = can(permission);

  useEffect(() => {
    if (!ready || user) return;
    const next = encodeURIComponent(stripLocale(pathname));
    router.replace(`${localePath(locale, "/login")}?next=${next}`);
  }, [ready, user, router, pathname, locale]);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
          aria-label={t("common.loading")}
        />
      </div>
    );
  }

  if (!user) return null; // redirect in flight

  if (!allowed) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl">
          ⛔
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          {t("auth.unauthorizedTitle")}
        </h1>
        <p className="mt-2 text-slate-500">{t("auth.unauthorizedBody")}</p>
        <button
          type="button"
          onClick={() => router.replace(localePath(locale, panelPathFor(user.role)))}
          className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("common.back")}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

/** Renders children only when the permission is held — for menu items. */
export function Can({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : null;
}
