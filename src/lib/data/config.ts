import type { DataSource } from "@/lib/types";

export const DEFAULT_SOURCE: DataSource =
  (process.env.NEXT_PUBLIC_DATA_SOURCE as DataSource) === "api"
    ? "api"
    : "mock";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
export const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? "";

export function isApiConfigured(): boolean {
  return API_BASE_URL.length > 0;
}
