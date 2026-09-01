import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { allTranslations } from "@/i18n/localized";
import type { Category, Product, SearchFilters } from "@/lib/types";

// A small regional storefront for demo purposes. All prices in EUR cents.
export const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: { en: "Audio", fa: "صوتی" }, slug: "audio" },
  { id: "cat-2", name: { en: "Wearables", fa: "پوشیدنی" }, slug: "wearables" },
  { id: "cat-3", name: { en: "Desk & Office", fa: "میز و اداری" }, slug: "desk" },
  { id: "cat-4", name: { en: "Home", fa: "خانه" }, slug: "home" },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p-001",
    slug: "aurora-wireless-headphones",
    title: { en: "Aurora Wireless Headphones", fa: "هدفون بی‌سیم آرورا" },
    description: {
      en: "Immersive over-ear headphones with active noise cancelling, 40h battery and multipoint Bluetooth.",
      fa: "هدفون روگوشی با حذف نویز فعال، ۴۰ ساعت شارژ و اتصال بلوتوث چنددستگاهه.",
    },
    price: 19900,
    compareAtPrice: 24900,
    currency: "EUR",
    images: [{ id: "img-headphones", src: "/images/headphones.svg" }],
    primaryImageId: "img-headphones",
    active: true,
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
    title: { en: "Pulse Buds Pro", fa: "ایرباد پالس پرو" },
    description: {
      en: "Compact true-wireless earbuds with adaptive transparency and wireless charging case.",
      fa: "ایرباد کاملاً بی‌سیم و جمع‌وجور با حالت شفافیت تطبیقی و کیس شارژ بی‌سیم.",
    },
    price: 12900,
    compareAtPrice: null,
    currency: "EUR",
    images: [{ id: "img-earbuds", src: "/images/earbuds.svg" }],
    primaryImageId: "img-earbuds",
    active: true,
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
    title: { en: "Nomad Smartwatch", fa: "ساعت هوشمند نومَد" },
    description: {
      en: "Lightweight smartwatch with always-on AMOLED display, GPS and 7-day battery.",
      fa: "ساعت هوشمند سبک با نمایشگر AMOLED همیشه‌روشن، GPS و ۷ روز شارژدهی.",
    },
    price: 24900,
    compareAtPrice: 27900,
    currency: "EUR",
    images: [{ id: "img-smartwatch", src: "/images/smartwatch.svg" }],
    primaryImageId: "img-smartwatch",
    active: true,
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
    title: { en: "Orbit Fitness Band", fa: "مچ‌بند ورزشی اوربیت" },
    description: {
      en: "Slim activity tracker with heart-rate, sleep and stress monitoring plus 10-day battery.",
      fa: "مچ‌بند باریک با پایش ضربان قلب، خواب و استرس به‌همراه ۱۰ روز شارژدهی.",
    },
    price: 7900,
    compareAtPrice: null,
    currency: "EUR",
    images: [{ id: "img-fitness-band", src: "/images/fitness-band.svg" }],
    primaryImageId: "img-fitness-band",
    active: true,
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
    title: { en: "Vertex Mechanical Keyboard", fa: "کیبورد مکانیکی ورتکس" },
    description: {
      en: "Hot-swappable 75% keyboard with pre-lubed linear switches and PBT keycaps.",
      fa: "کیبورد مکانیکی فشرده با سوییچ هات‌سواپ، نوربندی RGB و بدنه آلومینیومی.",
    },
    price: 13900,
    compareAtPrice: null,
    currency: "EUR",
    images: [{ id: "img-keyboard", src: "/images/keyboard.svg" }],
    primaryImageId: "img-keyboard",
    active: true,
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
    title: { en: "Halo Desktop Speaker", fa: "اسپیکر رومیزی هیلو" },
    description: {
      en: "Compact 2.0 desktop speaker set with crisp highs and a punchy 3.5\" woofer.",
      fa: "اسپیکر رومیزی با صدای ۳۶۰ درجه، بلوتوث ۵٫۳ و بدنه پارچه‌ای.",
    },
    price: 8990,
    compareAtPrice: 10900,
    currency: "EUR",
    images: [{ id: "img-speaker", src: "/images/speaker.svg" }],
    primaryImageId: "img-speaker",
    active: true,
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
    title: { en: "Lumen Table Lamp", fa: "چراغ‌مطالعه لومن" },
    description: {
      en: "Dimmable LED lamp with warm/cool white presets and a touch slider for brightness.",
      fa: "چراغ رومیزی LED با دمای رنگ قابل تنظیم، دیمر لمسی و پورت شارژ USB-C.",
    },
    price: 6490,
    compareAtPrice: null,
    currency: "EUR",
    images: [{ id: "img-lamp", src: "/images/lamp.svg" }],
    primaryImageId: "img-lamp",
    active: true,
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
    title: { en: "Terra Ceramic Mug", fa: "ماگ سرامیکی ترا" },
    description: {
      en: "Hand-glazed 350ml stoneware mug. Dishwasher and microwave safe.",
      fa: "ماگ سرامیکی دست‌ساز با لعاب مات، مناسب ماشین ظرفشویی و مایکروویو.",
    },
    price: 1900,
    compareAtPrice: null,
    currency: "EUR",
    images: [{ id: "img-mug", src: "/images/mug.svg" }],
    primaryImageId: "img-mug",
    active: true,
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

export async function mockList(
  filters: SearchFilters = {},
  locale: Locale = DEFAULT_LOCALE
): Promise<Product[]> {
  await delay();
  // The storefront never sees a deactivated product; the admin reads
  // MOCK_PRODUCTS through its own repository instead.
  let items = MOCK_PRODUCTS.filter((p) => p.active);

  const q = filters.q?.trim().toLowerCase();
  if (q) {
    // Search every translation, so a Persian query still finds a product
    // the shopper first saw in English (and the other way round).
    items = items.filter((p) =>
      [
        ...allTranslations(p.title),
        ...allTranslations(p.description),
        ...p.tags,
      ].some((value) => value.toLowerCase().includes(q))
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
      // Persian collates differently from Latin, so sort in the caller's
      // language rather than by raw code points.
      items.sort((a, b) =>
        a.title[locale].localeCompare(b.title[locale], locale)
      );
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
  return MOCK_PRODUCTS.find((p) => p.slug === slug && p.active);
}

export async function mockGetById(id: string): Promise<Product | undefined> {
  await delay(120);
  // Deliberately ignores `active`: a cart holding a product that was just
  // deactivated should still resolve so the line can be priced and shown.
  return MOCK_PRODUCTS.find((p) => p.id === id);
}

export async function mockCategories(): Promise<Category[]> {
  await delay(80);
  return MOCK_CATEGORIES;
}

export async function mockFeatured(limit = 4): Promise<Product[]> {
  await delay(120);
  return MOCK_PRODUCTS.filter((p) => p.featured && p.active).slice(0, limit);
}
