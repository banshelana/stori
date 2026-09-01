import type { Category, Product, SearchFilters } from "@/lib/types";

// A small regional storefront for demo purposes. All prices in EUR cents.
export const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Audio", slug: "audio" },
  { id: "cat-2", name: "Wearables", slug: "wearables" },
  { id: "cat-3", name: "Desk & Office", slug: "desk" },
  { id: "cat-4", name: "Home", slug: "home" },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p-001",
    slug: "aurora-wireless-headphones",
    title: "Aurora Wireless Headphones",
    description:
      "Immersive over-ear headphones with active noise cancelling, 40h battery and multipoint Bluetooth.",
    price: 19900,
    compareAtPrice: 24900,
    currency: "EUR",
    image: "/images/headphones.svg",
    categoryId: "cat-1",
    tags: ["audio", "bluetooth", "noise-cancelling"],
    rating: 4.7,
    stock: 24,
    featured: true,
    createdAt: "2025-11-02",
  },
  {
    id: "p-002",
    slug: "pulse-earbuds",
    title: "Pulse Buds Pro",
    description:
      "Compact true-wireless earbuds with adaptive transparency and wireless charging case.",
    price: 12900,
    compareAtPrice: null,
    currency: "EUR",
    image: "/images/earbuds.svg",
    categoryId: "cat-1",
    tags: ["audio", "bluetooth", "wireless"],
    rating: 4.4,
    stock: 61,
    featured: false,
    createdAt: "2026-01-15",
  },
  {
    id: "p-003",
    slug: "nomad-smartwatch",
    title: "Nomad Smartwatch",
    description:
      "Lightweight smartwatch with always-on AMOLED display, GPS and 7-day battery.",
    price: 24900,
    compareAtPrice: 27900,
    currency: "EUR",
    image: "/images/smartwatch.svg",
    categoryId: "cat-2",
    tags: ["wearable", "fitness", "gps"],
    rating: 4.5,
    stock: 18,
    featured: true,
    createdAt: "2025-09-20",
  },
  {
    id: "p-004",
    slug: "orbit-fitness-band",
    title: "Orbit Fitness Band",
    description:
      "Slim activity tracker with heart-rate, sleep and stress monitoring plus 10-day battery.",
    price: 7900,
    compareAtPrice: null,
    currency: "EUR",
    image: "/images/fitness-band.svg",
    categoryId: "cat-2",
    tags: ["wearable", "fitness"],
    rating: 4.2,
    stock: 90,
    featured: false,
    createdAt: "2026-03-04",
  },
  {
    id: "p-005",
    slug: "vertex-mechanical-keyboard",
    title: "Vertex Mechanical Keyboard",
    description:
      "Hot-swappable 75% keyboard with pre-lubed linear switches and PBT keycaps.",
    price: 13900,
    compareAtPrice: null,
    currency: "EUR",
    image: "/images/keyboard.svg",
    categoryId: "cat-3",
    tags: ["desk", "keyboard", "mechanical"],
    rating: 4.9,
    stock: 32,
    featured: true,
    createdAt: "2025-08-11",
  },
  {
    id: "p-006",
    slug: "halo-desktop-speaker",
    title: "Halo Desktop Speaker",
    description:
      "Compact 2.0 desktop speaker set with crisp highs and a punchy 3.5\" woofer.",
    price: 8990,
    compareAtPrice: 10900,
    currency: "EUR",
    image: "/images/speaker.svg",
    categoryId: "cat-3",
    tags: ["desk", "audio"],
    rating: 4.3,
    stock: 0,
    featured: false,
    createdAt: "2026-05-30",
  },
  {
    id: "p-007",
    slug: "lumen-table-lamp",
    title: "Lumen Table Lamp",
    description:
      "Dimmable LED lamp with warm/cool white presets and a touch slider for brightness.",
    price: 6490,
    compareAtPrice: null,
    currency: "EUR",
    image: "/images/lamp.svg",
    categoryId: "cat-4",
    tags: ["home", "lighting"],
    rating: 4.6,
    stock: 40,
    featured: true,
    createdAt: "2025-07-01",
  },
  {
    id: "p-008",
    slug: "terra-ceramic-mug",
    title: "Terra Ceramic Mug",
    description:
      "Hand-glazed 350ml stoneware mug. Dishwasher and microwave safe.",
    price: 1900,
    compareAtPrice: null,
    currency: "EUR",
    image: "/images/mug.svg",
    categoryId: "cat-4",
    tags: ["home", "kitchen"],
    rating: 4.8,
    stock: 120,
    featured: false,
    createdAt: "2026-02-14",
  },
];

// Simulated network latency so the loading states are visible.
function delay(ms = 250) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function mockList(filters: SearchFilters = {}): Promise<Product[]> {
  await delay();
  let items = [...MOCK_PRODUCTS];

  const q = filters.q?.trim().toLowerCase();
  if (q) {
    items = items.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (filters.category) {
    const cat = MOCK_CATEGORIES.find((c) => c.slug === filters.category);
    if (cat) items = items.filter((p) => p.categoryId === cat.id);
  }

  const maxPrice = filters.maxPrice;
  if (typeof maxPrice === "number" && maxPrice > 0) {
    items = items.filter((p) => p.price <= maxPrice);
  }

  const minRating = filters.minRating;
  if (typeof minRating === "number" && minRating > 0) {
    items = items.filter((p) => p.rating >= minRating);
  }

  if (filters.inStock) {
    items = items.filter((p) => p.stock > 0);
  }

  switch (filters.sort) {
    case "price-asc":
      items.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      items.sort((a, b) => b.price - a.price);
      break;
    case "name-asc":
      items.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "rating-desc":
      items.sort((a, b) => b.rating - a.rating);
      break;
    case "newest":
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "featured":
    default:
      items.sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
      break;
  }

  return items;
}

export async function mockGetBySlug(slug: string): Promise<Product | undefined> {
  await delay(150);
  return MOCK_PRODUCTS.find((p) => p.slug === slug);
}

export async function mockGetById(id: string): Promise<Product | undefined> {
  await delay(120);
  return MOCK_PRODUCTS.find((p) => p.id === id);
}

export async function mockCategories(): Promise<Category[]> {
  await delay(80);
  return MOCK_CATEGORIES;
}

export async function mockFeatured(limit = 4): Promise<Product[]> {
  await delay(120);
  return MOCK_PRODUCTS.filter((p) => p.featured).slice(0, limit);
}
