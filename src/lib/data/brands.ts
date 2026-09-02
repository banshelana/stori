import type { Brand } from "@/lib/types";

// ---------------------------------------------------------------
// Brands are a flat reference list, the same shape the API will
// return from GET /brands. Names are not localised: a brand name is
// a proper noun and stays as written in both locales.
// ---------------------------------------------------------------

export const MOCK_BRANDS: Brand[] = [
  { id: "b-aurora", name: "Aurora", slug: "aurora" },
  { id: "b-pulse", name: "Pulse", slug: "pulse" },
  { id: "b-nomad", name: "Nomad", slug: "nomad" },
  { id: "b-orbit", name: "Orbit", slug: "orbit" },
  { id: "b-vertex", name: "Vertex", slug: "vertex" },
  { id: "b-halo", name: "Halo", slug: "halo" },
  { id: "b-lumen", name: "Lumen", slug: "lumen" },
  { id: "b-terra", name: "Terra", slug: "terra" },
];

export function findBrand(id: string | null | undefined): Brand | undefined {
  if (!id) return undefined;
  return MOCK_BRANDS.find((b) => b.id === id);
}

export function brandName(id: string | null | undefined): string {
  return findBrand(id)?.name ?? "";
}

function delay(ms = 150) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function mockBrands(): Promise<Brand[]> {
  await delay();
  return MOCK_BRANDS;
}
