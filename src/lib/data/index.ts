import {
  apiCategories,
  apiFeatured,
  apiGetById,
  apiGetBySlug,
  apiList,
} from "@/lib/data/api";
import { isApiConfigured } from "@/lib/data/config";
import {
  mockCategories,
  mockFeatured,
  mockGetById,
  mockGetBySlug,
  mockList,
} from "@/lib/data/mock";
import type {
  Category,
  DataSource,
  Product,
  SearchFilters,
} from "@/lib/types";

// ---------------------------------------------------------------
// One unified data-access layer. Every function takes an explicit
// DataSource so the runtime toggle can switch on the fly, and we
// fall back to mock whenever "api" is selected but not configured.
// ---------------------------------------------------------------

function effective(source: DataSource): DataSource {
  if (source === "api" && !isApiConfigured()) return "mock";
  return source;
}

export async function listProducts(
  source: DataSource,
  filters: SearchFilters = {}
): Promise<Product[]> {
  return effective(source) === "api" ? apiList(filters) : mockList(filters);
}

export async function getProductBySlug(
  source: DataSource,
  slug: string
): Promise<Product | undefined> {
  return effective(source) === "api"
    ? apiGetBySlug(slug)
    : mockGetBySlug(slug);
}

export async function getProductById(
  source: DataSource,
  id: string
): Promise<Product | undefined> {
  return effective(source) === "api" ? apiGetById(id) : mockGetById(id);
}

export async function getCategories(source: DataSource): Promise<Category[]> {
  return effective(source) === "api" ? apiCategories() : mockCategories();
}

export async function getFeatured(
  source: DataSource,
  limit = 4
): Promise<Product[]> {
  return effective(source) === "api" ? apiFeatured(limit) : mockFeatured(limit);
}
