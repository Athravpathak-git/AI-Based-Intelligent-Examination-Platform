import axios from "axios";

export const PRODUCTION_API_URL = "https://ai-based-intelligent-examination-platform.onrender.com";

/**
 * Returns the backend root origin (e.g. "https://ai-based-intelligent-examination-platform.onrender.com")
 * without a trailing slash and without the /api suffix.
 */
export function getBackendOrigin(): string {
  // 1. Check NEXT_PUBLIC_API_URL if defined in environment
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    // If running in browser on a non-localhost domain, don't use localhost from env
    if (typeof window !== "undefined") {
      const isLocalHost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "0.0.0.0";
      if (!isLocalHost && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
        return PRODUCTION_API_URL;
      }
    }
    return envUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  }

  // 2. Browser runtime: if running on Vercel or any non-localhost domain, default to production Render backend
  if (typeof window !== "undefined") {
    const isLocalHost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "0.0.0.0";
    if (!isLocalHost) {
      return PRODUCTION_API_URL;
    }
  }

  // 3. Node/build environment check
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_API_URL;
  }

  // 4. Default for local development
  return "http://127.0.0.1:8000";
}

/**
 * Returns the REST API base URL with /api suffix (without trailing slash).
 * e.g., "https://ai-based-intelligent-examination-platform.onrender.com/api"
 */
export function getApiBaseUrl(): string {
  const origin = getBackendOrigin();
  return `${origin}/api`;
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Dynamic interceptor to ensure baseURL is always correct in browser runtime and attach token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Formats error messages cleanly from FastAPI responses
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.detail) {
      if (typeof error.response.data.detail === "string") {
        return error.response.data.detail;
      }
      if (Array.isArray(error.response.data.detail)) {
        return error.response.data.detail
          .map((d: { msg?: string; loc?: string[] }) => d.msg || JSON.stringify(d))
          .join(", ");
      }
    }
    if (error.response?.status === 401) {
      return "Session expired or unauthorized. Please log in again.";
    }
    if (error.response?.status === 403) {
      return error.response.data?.detail || "Access forbidden. Insufficient permissions.";
    }
    if (error.response?.status === 404) {
      return error.response.data?.detail || "The requested resource was not found.";
    }
    if (!error.response && (error.message === "Network Error" || error.code === "ERR_NETWORK")) {
      return "Backend service unavailable. Please check backend connection and server status.";
    }
    return error.message || "An unexpected communication error occurred.";
  }
  return String(error);
}

// Health check helper to verify backend service availability
export async function checkBackendHealth(): Promise<{ status: string; app?: string; version?: string } | null> {
  try {
    const res = await api.get("/health");
    return res.data;
  } catch {
    return null;
  }
}

// Generates production-ready WebSocket URLs based on NEXT_PUBLIC_API_URL or environment
export function getWebSocketUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (process.env.NEXT_PUBLIC_WS_URL) {
    const base = process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, "");
    return `${base}${cleanPath}`;
  }
  const origin = getBackendOrigin();
  try {
    const parsed = new URL(origin);
    const wsProto = parsed.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${parsed.host}${cleanPath}`;
  } catch {
    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = typeof window !== "undefined" && window.location.hostname === "localhost" ? "127.0.0.1:8000" : (typeof window !== "undefined" ? window.location.host : "127.0.0.1:8000");
    return `${protocol}//${host}${cleanPath}`;
  }
}
