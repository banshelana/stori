"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocaleHref } from "@/i18n/navigation";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth/auth-context";
import { homePathFor } from "@/lib/auth/permissions";

export function UserMenu() {
  const { user, ready, signOut } = useAuth();
  const { t } = useI18n();
  const href = useLocaleHref();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape, so the menu never traps focus.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Render nothing rather than a wrong state while localStorage is read.
  if (!ready) return <div className="h-10 w-10" aria-hidden />;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href={href("/login")}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          {t("nav.login")}
        </Link>
        <Link
          href={href("/register")}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("nav.register")}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 ps-2 text-sm shadow-sm hover:bg-slate-50"
      >
        <span className="hidden max-w-28 truncate font-medium text-slate-700 sm:inline">
          {user.firstName}
        </span>
        <Avatar
          firstName={user.firstName}
          lastName={user.lastName}
          avatarUrl={user.avatarUrl}
          avatarColor={user.avatarColor}
          size="sm"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {t(`roles.${user.subRole}`)}
            </p>
          </div>

          <Link
            href={href(homePathFor(user.role))}
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            role="menuitem"
          >
            {user.role === "admin" ? t("nav.adminPanel") : t("nav.myAccount")}
          </Link>

          {user.role === "customer" && (
            <Link
              href={href("/account/orders")}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              role="menuitem"
            >
              {t("account.orders")}
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              signOut();
              setOpen(false);
              router.push(href("/"));
            }}
            className="w-full border-t border-slate-100 px-4 py-2.5 text-start text-sm text-rose-600 hover:bg-rose-50"
            role="menuitem"
          >
            {t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
