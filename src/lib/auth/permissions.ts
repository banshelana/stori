import type { Permission, Role, SubRole } from "@/lib/auth/types";

// ---------------------------------------------------------------
// Sub-roles are data. To add one, add a key here and a label under
// "roles" in both dictionaries — guards and menus pick it up with
// no further changes.
// ---------------------------------------------------------------

const ADMIN_FULL: Permission[] = [
  "dashboard.view",
  "customers.view",
  "customers.write",
  "sales.view",
  "sales.write",
  "products.view",
  "products.write",
  "payments.view",
  "payments.write",
  "reviews.view",
  "reviews.write",
  "contacts.view",
  "contacts.write",
  "messages.view",
  "messages.send",
  "settings.manage",
];

const CUSTOMER_BASE: Permission[] = [
  "account.view",
  "account.orders",
  "account.payments",
];

export const ROLE_PERMISSIONS: Record<SubRole, Permission[]> = {
  // — Admin sub-roles ——————————————————————————————
  "super-admin": ADMIN_FULL,

  // A manager runs the store but cannot change platform settings.
  manager: ADMIN_FULL.filter((p) => p !== "settings.manage"),

  // Support handles the customer-facing side. Financial reporting (sales,
  // payments) is deliberately out of scope, so those sections disappear
  // from their menu rather than merely refusing on click.
  support: [
    "dashboard.view",
    "customers.view",
    "products.view",
    "reviews.view",
    "reviews.write",
    "contacts.view",
    "contacts.write",
    "messages.view",
    "messages.send",
  ],

  // — Customer sub-roles ————————————————————————————
  regular: CUSTOMER_BASE,
  vip: CUSTOMER_BASE,
};

export const ROLE_SUB_ROLES: Record<Role, SubRole[]> = {
  admin: ["super-admin", "manager", "support"],
  customer: ["regular", "vip"],
};

export function permissionsFor(subRole: SubRole): Permission[] {
  return ROLE_PERMISSIONS[subRole] ?? [];
}

export function hasPermission(
  subRole: SubRole | undefined,
  permission: Permission
): boolean {
  if (!subRole) return false;
  return permissionsFor(subRole).includes(permission);
}

export function hasAnyPermission(
  subRole: SubRole | undefined,
  permissions: Permission[]
): boolean {
  if (!subRole || permissions.length === 0) return false;
  const granted = permissionsFor(subRole);
  return permissions.some((p) => granted.includes(p));
}

/** Where a user lands after signing in. */
export function homePathFor(role: Role): string {
  return role === "admin" ? "/admin" : "/account/profile";
}
