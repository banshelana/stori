"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/panel/Icon";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { UserMenu } from "@/components/UserMenu";
import { useI18n } from "@/i18n/I18nProvider";
import { localePath, stripLocale } from "@/i18n/paths";
import { useAuth } from "@/lib/auth/auth-context";
import type { NavItem } from "@/lib/nav";

/**
 * Sidebar shell shared by the admin and account areas.
 *
 * The nav is filtered by permission, so the same component renders a
 * super-admin's eight sections and a support agent's six without either
 * side knowing about roles.
 */
export function PanelShell({
  nav,
  titleKey,
  children,
}: {
  nav: NavItem[];
  titleKey: string;
  children: React.ReactNode;
}) {
  const { can, signOut } = useAuth();
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const visible = nav.filter((item) => can(item.permission));
  const current = stripLocale(pathname);

  function isActive(href: string) {
    // The index route must match exactly or it stays lit on every child.
    return href === "/admin" || href === "/account"
      ? current === href
      : current === href || current.startsWith(`${href}/`);
  }

  const sidebar = (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
      {visible.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={localePath(locale, item.href)}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {/* Marker on the reading edge, so the active row is legible
                without relying on the tint alone. */}
            {active && (
              <span className="absolute inset-y-1.5 -start-3 w-1 rounded-e-full bg-indigo-600" />
            )}
            <Icon
              name={item.icon}
              className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110"
            />
            <span className="truncate">{t(item.labelKey)}</span>
          </Link>
        );
      })}

      <div className="mt-auto space-y-1 border-t border-slate-200 pt-3">
        <Link
          href={localePath(locale, "/")}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <Icon name="box" className="h-5 w-5 shrink-0" />
          <span>{t("nav.home")}</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            signOut();
            router.push(localePath(locale, "/"));
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
        >
          <Icon name="logout" className="h-5 w-5 shrink-0 rtl-flip" />
          <span>{t("nav.logout")}</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar. `border-e` flips to the correct edge in RTL. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-slate-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-sm">
            {t("common.appName").charAt(0)}
          </span>
          <span className="truncate font-bold text-slate-900">{t(titleKey)}</span>
        </div>
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("common.cancel")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
          />
          <aside className="absolute inset-y-0 start-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
              <span className="font-bold text-slate-900">{t(titleKey)}</span>
              <button type="button" onClick={() => setOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/75 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label={t("common.actions")}
          >
            <Icon name="menu" />
          </button>

          <div className="min-w-0 flex-1" />

          <div className="flex items-center gap-3">
            <LocaleSwitcher compact />
            <UserMenu showRole />
          </div>
        </header>

        <main className="animate-fade-in flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
