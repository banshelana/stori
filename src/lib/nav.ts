import type { Permission } from "@/lib/auth/types";

export interface NavItem {
  /** Locale-less path; the sidebar prefixes the active locale. */
  href: string;
  /** Dictionary path for the label. */
  labelKey: string;
  /** Key into the ICONS map in components/panel/Icon.tsx. */
  icon: string;
  /** Menu entry renders only when the signed-in user holds this. */
  permission: Permission;
}

// Menus are derived from permissions, so a sub-role that loses a
// permission loses the menu entry and the page in one edit.
export const ADMIN_NAV: NavItem[] = [
  {
    href: "/admin",
    labelKey: "admin.dashboard",
    icon: "dashboard",
    permission: "dashboard.view",
  },
  {
    href: "/admin/customers",
    labelKey: "admin.customers",
    icon: "users",
    permission: "customers.view",
  },
  {
    href: "/admin/sales",
    labelKey: "admin.sales",
    icon: "cart",
    permission: "sales.view",
  },
  {
    href: "/admin/products",
    labelKey: "admin.products",
    icon: "box",
    permission: "products.view",
  },
  {
    href: "/admin/payments",
    labelKey: "admin.payments",
    icon: "card",
    permission: "payments.view",
  },
  {
    href: "/admin/reviews",
    labelKey: "admin.reviews",
    icon: "star",
    permission: "reviews.view",
  },
  {
    href: "/admin/contacts",
    labelKey: "admin.contacts",
    icon: "mail",
    permission: "contacts.view",
  },
  {
    href: "/admin/messages",
    labelKey: "admin.messages",
    icon: "chat",
    permission: "messages.view",
  },
];

export const ACCOUNT_NAV: NavItem[] = [
  {
    href: "/account/profile",
    labelKey: "account.profile",
    icon: "user",
    permission: "account.view",
  },
  {
    href: "/account/orders",
    labelKey: "account.orders",
    icon: "cart",
    permission: "account.orders",
  },
  {
    href: "/account/payments",
    labelKey: "account.payments",
    icon: "card",
    permission: "account.payments",
  },
  {
    href: "/account/addresses",
    labelKey: "account.addresses",
    icon: "pin",
    permission: "account.view",
  },
];

/**
 * Permission guarding a given app path, or undefined when the path is
 * public. Used to check a post-login redirect target before following it:
 * the person signing in is not necessarily the one who was bounced.
 */
export function permissionForPath(path: string): Permission | undefined {
  const all = [...ADMIN_NAV, ...ACCOUNT_NAV];
  // Longest match first, so /admin/payments beats /admin.
  const match = all
    .filter((item) => path === item.href || path.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (match) return match.permission;
  // Section roots with no nav entry of their own still need guarding.
  if (path === "/account" || path.startsWith("/account/")) return "account.view";
  if (path === "/admin" || path.startsWith("/admin/")) return "dashboard.view";
  return undefined;
}
