import type { LoginInput, RegisterInput, User } from "@/lib/auth/types";

// ---------------------------------------------------------------
// Mock user store. Phase 2 replaces these with POST /auth/login,
// POST /auth/register and GET /users/me over the axios client.
//
// Passwords live in plain text here purely because this is a mock
// fixture with no server; never carry this pattern into the API.
// ---------------------------------------------------------------

export interface MockUser extends User {
  password: string;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: "u-001",
    firstName: "Sara",
    lastName: "Ahmadi",
    mobile: "09120000001",
    password: "admin123",
    role: "admin",
    subRole: "super-admin",
    email: "sara@storefront.test",
    phone: "02122334455",
    age: 34,
    sex: "female",
    createdAt: "2025-03-11",
    avatarColor: "#4f46e5",
    addresses: [
      {
        id: "a-001",
        countryId: "ir",
        provinceId: "ir-thr",
        cityId: "ir-thr-tehran",
        street: "Valiasr",
        alley: "Bahar",
        buildingNo: "14",
        floor: "3",
        unit: "7",
        postalCode: "1234567890",
        isDefault: true,
      },
    ],
  },
  {
    id: "u-002",
    firstName: "Reza",
    lastName: "Karimi",
    mobile: "09120000002",
    password: "manager123",
    role: "admin",
    subRole: "manager",
    email: "reza@storefront.test",
    age: 41,
    sex: "male",
    createdAt: "2025-05-02",
    avatarColor: "#0891b2",
  },
  {
    id: "u-003",
    firstName: "Mina",
    lastName: "Tehrani",
    mobile: "09120000003",
    password: "support123",
    role: "admin",
    subRole: "support",
    email: "mina@storefront.test",
    age: 27,
    sex: "female",
    createdAt: "2025-08-19",
    avatarColor: "#7c3aed",
  },
  {
    id: "u-004",
    firstName: "Ali",
    lastName: "Mohammadi",
    mobile: "09120000004",
    password: "customer123",
    role: "customer",
    subRole: "regular",
    createdAt: "2026-01-08",
    avatarColor: "#059669",
    // Deliberately has no details yet — exercises the "complete your
    // profile" path a freshly registered user sees.
  },
  {
    id: "u-005",
    firstName: "Neda",
    lastName: "Rostami",
    mobile: "09120000005",
    password: "vip123",
    role: "customer",
    subRole: "vip",
    email: "neda@example.com",
    phone: "03133445566",
    age: 30,
    sex: "female",
    createdAt: "2025-06-14",
    avatarColor: "#e11d48",
    addresses: [
      {
        id: "a-002",
        countryId: "ir",
        provinceId: "ir-esf",
        cityId: "ir-esf-isfahan",
        street: "Chaharbagh",
        alley: "Golha",
        buildingNo: "88",
        floor: "1",
        unit: "2",
        postalCode: "8144556677",
        isDefault: true,
      },
    ],
  },
];

/** Accounts surfaced on the login screen so the template is walkable. */
export const DEMO_ACCOUNTS = MOCK_USERS.map((u) => ({
  mobile: u.mobile,
  password: u.password,
  subRole: u.subRole,
  name: `${u.firstName} ${u.lastName}`,
}));

function strip(user: MockUser): User {
  const { password: _password, ...rest } = user;
  return rest;
}

function delay(ms = 350) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Digits only, so "0912 000 0001" and "09120000001" are the same account. */
function normalizeMobile(mobile: string): string {
  return mobile.replace(/\D/g, "");
}

export async function mockLogin({ mobile, password }: LoginInput): Promise<User> {
  await delay();
  const target = normalizeMobile(mobile);
  const found = MOCK_USERS.find(
    (u) => normalizeMobile(u.mobile) === target && u.password === password
  );
  if (!found) throw new Error("INVALID_CREDENTIALS");
  return strip(found);
}

export async function mockRegister(input: RegisterInput): Promise<User> {
  await delay();
  const target = normalizeMobile(input.mobile);
  if (MOCK_USERS.some((u) => normalizeMobile(u.mobile) === target)) {
    throw new Error("MOBILE_TAKEN");
  }

  const created: MockUser = {
    id: `u-${String(MOCK_USERS.length + 1).padStart(3, "0")}`,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    mobile: target,
    password: input.password,
    // Registration always produces a plain customer; elevating to an admin
    // sub-role is an operation the admin panel performs, never signup.
    role: "customer",
    subRole: "regular",
    createdAt: new Date().toISOString().slice(0, 10),
    avatarColor: "#0ea5e9",
  };

  MOCK_USERS.push(created);
  return strip(created);
}

export async function mockUpdateProfile(
  id: string,
  patch: Partial<User>
): Promise<User> {
  await delay(250);
  const index = MOCK_USERS.findIndex((u) => u.id === id);
  if (index === -1) throw new Error("USER_NOT_FOUND");

  // role/subRole are never self-editable from the profile form.
  const { role: _r, subRole: _s, id: _i, ...safe } = patch;
  MOCK_USERS[index] = { ...MOCK_USERS[index], ...safe };
  return strip(MOCK_USERS[index]);
}

export async function mockListCustomers(): Promise<User[]> {
  await delay(200);
  return MOCK_USERS.filter((u) => u.role === "customer").map(strip);
}

export async function mockGetUser(id: string): Promise<User | undefined> {
  await delay(150);
  const found = MOCK_USERS.find((u) => u.id === id);
  return found ? strip(found) : undefined;
}
