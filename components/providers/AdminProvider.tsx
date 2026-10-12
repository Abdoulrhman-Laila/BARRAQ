"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo } from "react";
import { authApi } from "@/lib/api/auth-client";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { beginSessionExpiredRedirect, isUnauthorizedError } from "@/lib/auth/session-expired";
import { adminKeys } from "@/lib/query/keys";
import type { AdminMe } from "@/types/api";

interface AdminContextValue {
  admin: AdminMe | null;
  loading: boolean;
  error: string | null;
  can: (permission?: string, section?: string) => boolean;
  reload: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

/** Thrown when session gate fails and a login redirect was started (not a user-facing load error). */
class SessionGateError extends Error {
  constructor() {
    super("SESSION_GATE");
    this.name = "SessionGateError";
  }
}

function isSessionGateError(reason: unknown): boolean {
  return reason instanceof SessionGateError;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: adminKeys.me,
    queryFn: async () => {
      // Keep serial gate: session must pass before loading RBAC profile.
      const sessionPayload = await authApi.session();
      const authenticated = Boolean(sessionPayload?.data?.authenticated);
      const verified = Boolean(sessionPayload?.data?.verified);
      const unreachable = Boolean(sessionPayload?.data?.unreachable);
      if (!authenticated || (!verified && !unreachable)) {
        beginSessionExpiredRedirect();
        throw new SessionGateError();
      }
      const response = await api.get<AdminMe>(endpoints.admin.me);
      return response.data;
    },
    // Auth/RBAC must not serve a previous user's cached profile.
    staleTime: 0,
    retry: (failureCount, reason) => {
      if (isUnauthorizedError(reason) || isSessionGateError(reason)) return false;
      return failureCount < 1;
    }
  });

  const reload = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.me });
  }, [queryClient]);

  const admin = result.data ?? null;
  const loading = result.isFetching;
  const error =
    result.error && !isUnauthorizedError(result.error) && !isSessionGateError(result.error)
      ? result.error instanceof Error
        ? result.error.message
        : "تعذر تحميل صلاحيات الحساب"
      : null;

  const value = useMemo<AdminContextValue>(
    () => ({
      admin,
      loading,
      error,
      can(permission, section) {
        if (!admin) return false;
        if (admin.is_superuser) return true;
        // A named permission is decisive. This used to fall through to the
        // section check, so holding `users.view` (which grants the `users`
        // section) also satisfied `can("users.suspend", "users")` -- the UI
        // offered actions the backend then refused with a 403.
        if (permission) return admin.permissions.includes(permission);
        if (section) return Boolean(admin.allowed_sections[section]);
        return true;
      },
      reload
    }),
    [admin, loading, error, reload]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used within AdminProvider");
  return value;
}
