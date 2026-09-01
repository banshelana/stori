// Single place the REST surface is described, so renaming a backend
// route is a one-line change rather than a grep across the codebase.
export const ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    me: "/auth/me",
    logout: "/auth/logout",
  },
  users: {
    list: "/users",
    detail: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
  },
  products: {
    list: "/products",
    bySlug: (slug: string) => `/products/${slug}`,
    byId: (id: string) => `/products/id/${id}`,
    featured: "/products/featured",
    categories: "/categories",
  },
  orders: {
    list: "/orders",
    detail: (id: string) => `/orders/${id}`,
    mine: "/orders/me",
  },
  payments: {
    list: "/payments",
    mine: "/payments/me",
  },
  reviews: { list: "/reviews", detail: (id: string) => `/reviews/${id}` },
  contacts: { list: "/contacts", detail: (id: string) => `/contacts/${id}` },
  messages: { list: "/messages", send: "/messages" },
  geo: {
    countries: "/geo/countries",
    provinces: "/geo/provinces",
    cities: "/geo/cities",
  },
} as const;
