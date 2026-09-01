import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_BASE_URL, API_TOKEN } from "@/lib/data/config";

// ---------------------------------------------------------------
// Single axios instance for the whole app. Phase 1 runs on mock data
// so nothing calls through here yet; the interceptors are in place so
// flipping the header toggle to "API" is the only change needed.
// ---------------------------------------------------------------

export const AUTH_STORAGE_KEY = "store.session";
export const LOCALE_HEADER = "Accept-Language";

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

function readLocale(): string {
  if (typeof window === "undefined") return "en";
  const segment = window.location.pathname.split("/")[1];
  return segment === "fa" ? "fa" : "en";
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // The session token wins; API_TOKEN is the build-time fallback for
  // endpoints that are public but still gated by a project key.
  const token = readStoredToken() ?? API_TOKEN;
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  config.headers.set(LOCALE_HEADER, readLocale());
  return config;
});

/** Normalised error the UI can branch on without knowing about axios. */
export interface ApiError {
  status: number | null;
  code: string;
  message: string;
}

function toApiError(error: AxiosError<{ message?: string; code?: string }>): ApiError {
  if (error.response) {
    return {
      status: error.response.status,
      code: error.response.data?.code ?? `HTTP_${error.response.status}`,
      message: error.response.data?.message ?? error.message,
    };
  }
  if (error.code === "ECONNABORTED") {
    return { status: null, code: "TIMEOUT", message: "The request timed out." };
  }
  return { status: null, code: "NETWORK", message: "Network unreachable." };
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; code?: string }>) => {
    const normalized = toApiError(error);

    // A rejected token means the stored session is dead — clear it so the
    // app stops rendering as signed-in, and let the route guard redirect.
    if (normalized.status === 401 && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        window.dispatchEvent(new Event("auth:unauthorized"));
      } catch {
        /* ignore */
      }
    }

    return Promise.reject(normalized);
  }
);

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}
