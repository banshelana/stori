import { API_BASE_URL, API_TOKEN } from "@/lib/data/config";
import type { Category, Product, SearchFilters } from "@/lib/types";

// ---------------------------------------------------------------
// REST backend client. The endpoints below mirror the shape used
// by the mock source. Adjust the paths to match your own API.
//
//   GET  {base}/products              -> Product[]
//   GET  {base}/products/{slug}       -> Product
//   GET  {base}/products/id/{id}      -> Product
//   GET  {base}/categories            -> Category[]
//   GET  {base}/products/featured     -> Product[]
// ---------------------------------------------------------------

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
    },
    // Keep caching lightweight; rely on client cache.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function apiList(filters: SearchFilters = {}): Promise<Product[]> {
  return request<Product[]>(
    `/products${buildQuery({
      q: filters.q,
      category: filters.category,
      maxPrice: filters.maxPrice?.toString(),
      minRating: filters.minRating?.toString(),
      inStock: filters.inStock?.toString(),
      sort: filters.sort,
    })}`
  );
}

export async function apiGetBySlug(slug: string): Promise<Product | undefined> {
  return request<Product>(`/products/${encodeURIComponent(slug)}`);
}

export async function apiGetById(id: string): Promise<Product | undefined> {
  return request<Product>(`/products/id/${encodeURIComponent(id)}`);
}

export async function apiCategories(): Promise<Category[]> {
  return request<Category[]>("/categories");
}

export async function apiFeatured(limit = 4): Promise<Product[]> {
  return request<Product[]>(`/products/featured${buildQuery({ limit: limit.toString() })}`);
}
