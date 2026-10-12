"use client";

import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { bindingDisabledPayload, isApiBindingEnabled } from "@/lib/api/binding";
import { beginSessionExpiredRedirect } from "@/lib/auth/session-expired";
import { normalizeEnvelope, toApiError } from "@/lib/api/normalize";
import type { ApiEnvelope } from "@/types/api";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const part = document.cookie.split("; ").find((item) => item.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : null;
}

const http = axios.create({
  baseURL: "/api/bff",
  withCredentials: true,
  headers: {
    Accept: "application/json"
  }
});

http.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = readCookie("baraq_csrf");
    if (csrf) {
      config.headers.set("X-CSRF-Token", csrf);
    }
  }
  if (config.data !== undefined && !(config.data instanceof FormData)) {
    config.headers.set("Content-Type", "application/json");
  }
  return config;
});

async function request<T>(path: string, config: AxiosRequestConfig = {}): Promise<ApiEnvelope<T>> {
  const method = (config.method ?? "GET").toUpperCase();
  const cleanPath = path.replace(/^\/+/, "");

  if (!isApiBindingEnabled()) {
    throw toApiError(bindingDisabledPayload(), 503);
  }

  try {
    const response = await http.request<unknown>({
      ...config,
      url: cleanPath,
      method,
      // Avoid stale dashboard lists while operating.
      headers: {
        ...config.headers,
        "Cache-Control": "no-store"
      }
    });

    const payload = response.data;
    const envelope = normalizeEnvelope<T>(payload);
    if (envelope.success === false) {
      if (response.status === 401) beginSessionExpiredRedirect();
      throw toApiError(payload, response.status);
    }
    return envelope;
  } catch (reason) {
    if (reason instanceof AxiosError) {
      if (reason.code === "ERR_NETWORK" || reason.message === "Network Error") {
        throw toApiError({ message: "تعذر الاتصال بالخادم", code: "network_error" }, 0);
      }
      const status = reason.response?.status ?? 0;
      const payload = reason.response?.data ?? { message: reason.message };
      if (status === 401) beginSessionExpiredRedirect();
      throw toApiError(payload, status);
    }
    throw reason;
  }
}

export const api = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    const query: Record<string, string> = {};
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query[key] = String(value);
    });
    return request<T>(path, { method: "GET", params: query });
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "POST", data: body });
  },
  patch<T>(path: string, body: unknown) {
    return request<T>(path, { method: "PATCH", data: body });
  },
  put<T>(path: string, body: unknown) {
    return request<T>(path, { method: "PUT", data: body });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  }
};
