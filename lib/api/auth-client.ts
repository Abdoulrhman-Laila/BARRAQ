"use client";

import axios, { AxiosError } from "axios";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const part = document.cookie.split("; ").find((item) => item.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : null;
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  if (typeof record.detail === "string" && record.detail.trim()) return record.detail;
  return fallback;
}

const authHttp = axios.create({
  baseURL: "/api/auth",
  withCredentials: true,
  headers: {
    Accept: "application/json"
  }
});

authHttp.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = readCookie("baraq_csrf");
    if (csrf) config.headers.set("X-CSRF-Token", csrf);
  }
  if (config.data !== undefined && !(config.data instanceof FormData)) {
    config.headers.set("Content-Type", "application/json");
  }
  return config;
});

function toAuthError(reason: unknown, fallback: string): Error {
  if (reason instanceof AxiosError) {
    if (reason.code === "ERR_NETWORK" || reason.message === "Network Error") {
      return new Error("تعذر الاتصال بالخادم");
    }
    return new Error(messageFromPayload(reason.response?.data, fallback));
  }
  if (reason instanceof Error) return reason;
  return new Error(fallback);
}

export const authApi = {
  async login(body: { email: string; password: string }, fallbackError: string) {
    try {
      await authHttp.post("/login", body);
    } catch (reason) {
      throw toAuthError(reason, fallbackError);
    }
  },

  async logout() {
    try {
      await authHttp.post("/logout");
    } catch {
      // Always clear local session UX even if upstream logout fails.
    }
  },

  async session() {
    const response = await authHttp.get("/session", {
      headers: { "Cache-Control": "no-store" }
    });
    return response.data as {
      success?: boolean;
      data?: {
        authenticated?: boolean;
        verified?: boolean;
        unreachable?: boolean;
        offline?: boolean;
      };
    };
  },

  async passwordReset(body: { email: string }, fallbackError: string) {
    try {
      const response = await authHttp.post<{ message?: string }>("/password-reset", body);
      return response.data;
    } catch (reason) {
      throw toAuthError(reason, fallbackError);
    }
  },

  async passwordResetConfirm(
    body: { uid: string; token: string; new_password: string },
    fallbackError: string
  ) {
    try {
      const response = await authHttp.post<{ message?: string }>("/password-reset/confirm", body);
      return response.data;
    } catch (reason) {
      throw toAuthError(reason, fallbackError);
    }
  }
};
