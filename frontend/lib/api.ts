import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
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

// Generates production-ready WebSocket URLs based on NEXT_PUBLIC_API_URL or environment
export function getWebSocketUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (process.env.NEXT_PUBLIC_WS_URL) {
    const base = process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, "");
    return `${base}${cleanPath}`;
  }
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  try {
    const parsed = new URL(rawApiUrl);
    const wsProto = parsed.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${parsed.host}${cleanPath}`;
  } catch (e) {
    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = typeof window !== "undefined" && window.location.hostname === "localhost" ? "127.0.0.1:8000" : (typeof window !== "undefined" ? window.location.host : "127.0.0.1:8000");
    return `${protocol}//${host}${cleanPath}`;
  }
}

