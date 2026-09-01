export type Role = "admin" | "customer";

export type AdminSubRole = "super-admin" | "manager" | "support";
export type CustomerSubRole = "regular" | "vip";
export type SubRole = AdminSubRole | CustomerSubRole;

/**
 * Every guarded surface names a permission, never a role. Adding a sub-role
 * later means adding one row to ROLE_PERMISSIONS — no guard or menu changes.
 */
export type Permission =
  // Admin surfaces
  | "dashboard.view"
  | "customers.view"
  | "customers.write"
  | "sales.view"
  | "sales.write"
  | "products.view"
  | "products.write"
  | "payments.view"
  | "payments.write"
  | "reviews.view"
  | "reviews.write"
  | "contacts.view"
  | "contacts.write"
  | "messages.view"
  | "messages.send"
  | "settings.manage"
  // Customer surfaces
  | "account.view"
  | "account.orders"
  | "account.payments";

export type Sex = "male" | "female" | "other";

export interface UserAddress {
  id: string;
  countryId: string;
  provinceId: string;
  cityId: string;
  street: string;
  alley?: string;
  buildingNo?: string;
  floor?: string;
  unit?: string;
  postalCode: string;
  isDefault?: boolean;
}

/** Fields captured at registration — deliberately minimal. */
export interface UserBasicInfo {
  firstName: string;
  lastName: string;
  mobile: string;
}

/** Everything the user fills in afterwards; all optional by design. */
export interface UserDetails {
  email?: string;
  phone?: string;
  age?: number;
  sex?: Sex;
  addresses?: UserAddress[];
}

export interface User extends UserBasicInfo, UserDetails {
  id: string;
  role: Role;
  subRole: SubRole;
  createdAt: string;
  avatarColor?: string;
  /** Uploaded profile photo as a data URL; falls back to coloured initials. */
  avatarUrl?: string;
  /** A disabled account keeps its data but cannot sign in. */
  active: boolean;
}

export interface Session {
  user: User;
  token: string;
  issuedAt: string;
}

export interface RegisterInput extends UserBasicInfo {
  password: string;
}

export interface LoginInput {
  mobile: string;
  password: string;
}
