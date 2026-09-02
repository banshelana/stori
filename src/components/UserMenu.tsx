"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocaleHref } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import type { Permission } from "@/lib/auth/types";

interface MenuLink {
  href: string;
  label: string;
  icon: string;
  permission: Permission;
}

/**
 * The signed-in user's menu.
 *
 * Mounted in both chromes — the storefront header and the admin/account
 * panel header — so profile and sign-out stay reachable from every page
 * rather than only from the storefront.
 */
export function UserMenu({
  showRole = false,
}: {
  /** The panel chrome has room for the sub-role beside the avatar. */
  showRole?: boolean;
}) {
  const { user, ready, signOut, can } = useAuth();
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

  // A spacer rather than a wrong state while localStorage is read.
  if (!ready) return <div className="h-10 w-10" aria-hidden />;

  if (!user) {
    // Two buttons plus the cart and locale switcher overflow a 375px
    // header, so below `sm` only the sign-in link shows — the register
    // link lives on that page anyway.
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={href("/login")}
          className="whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
        >
          {t("nav.login")}
        </Link>
        <Link
          href={href("/register")}
          className="hidden whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 sm:inline-block"
        >
          {t("nav.register")}
        </Link>
      </div>
    );
  }

  // Entries are permission-gated like every other guarded surface, so an
  // admin sees the panel link and a customer sees their own pages.
  const links: MenuLink[] = (
    [
      {
        href: "/admin",
        label: t("nav.adminPanel"),
        icon: "dashboard",
        permission: "dashboard.view",
      },
      {
        href: "/account/profile",
        label: t("account.profile"),
        icon: "user",
        permission: "account.view",
      },
      {
        href: "/account/orders",
        label: t("account.orders"),
        icon: "cart",
        permission: "account.orders",
      },
      {
        href: "/account/payments",
        label: t("account.payments"),
        icon: "card",
        permission: "account.payments",
      },
      {
        href: "/account/addresses",
        label: t("account.addresses"),
        icon: "pin",
        permission: "account.view",
      },
    ] satisfies MenuLink[]
  ).filter((link) => can(link.permission));

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 ps-2 text-sm shadow-sm transition-colors hover:bg-slate-50"
      >
        {showRole ? (
          <span className="hidden text-end sm:block">
            <span className="block max-w-36 truncate text-sm font-semibold text-slate-900">
              {user.firstName} {user.lastName}
            </span>
            <span className="block text-xs text-slate-500">
              {t(`roles.${user.subRole}`)}
            </span>
          </span>
        ) : (
          <span className="hidden max-w-28 truncate font-medium text-slate-700 sm:inline">
            {user.firstName}
          </span>
        )}

        <Avatar
          firstName={user.firstName}
          lastName={user.lastName}
          avatarUrl={user.avatarUrl}
          avatarColor={user.avatarColor}
          size={showRole ? "md" : "sm"}
        />
      </button>

      {open && (
        <div
          role="menu"
          // Above the panel header, which is itself sticky at z-30.
          className="absolute end-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <Avatar
              firstName={user.firstName}
              lastName={user.lastName}
              avatarUrl={user.avatarUrl}
              avatarColor={user.avatarColor}
              size="md"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {user.firstName} {user.lastName}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {t(`roles.${user.subRole}`)}
              </span>
            </span>
          </div>

          <div className="py-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={href(link.href)}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Icon
                  name={link.icon}
                  className="h-4 w-4 shrink-0 text-slate-400"
                />
                {link.label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              signOut();
              setOpen(false);
              router.push(href("/"));
            }}
            role="menuitem"
            className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-start text-sm text-rose-600 hover:bg-rose-50"
          >
            <Icon name="logout" className="h-4 w-4 shrink-0 rtl-flip" />
            {t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
