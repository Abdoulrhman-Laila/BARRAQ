"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "@/lib/api/client";
import { normalizeList } from "@/lib/api/normalize";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import type { AnyRecord, ListPayload, Paginated } from "@/types/api";

export interface ResourceQuery {
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

const emptyList: Paginated<AnyRecord> = {
  count: 0,
  next: null,
  previous: null,
  results: []
};

/** Stable query key prefix for list resources (invalidate by endpoint after mutations). */
export function resourceQueryKey(endpoint: string, query?: ResourceQuery) {
  return query === undefined ? (["resource", endpoint] as const) : (["resource", endpoint, query] as const);
}

export function useResource(endpoint: string, query: ResourceQuery) {
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: resourceQueryKey(endpoint, query),
    queryFn: async () => {
      const response = await api.get<ListPayload<AnyRecord>>(endpoint, query);
      return normalizeList(response.data);
    },
    retry: (failureCount, reason) => {
      if (isUnauthorizedError(reason)) return false;
      return failureCount < 1;
    }
  });

  const reload = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: resourceQueryKey(endpoint) });
  }, [endpoint, queryClient]);

  const error =
    result.error && !isUnauthorizedError(result.error)
      ? result.error instanceof Error
        ? result.error.message
        : "تعذر تحميل البيانات"
      : null;

  return {
    data: result.data ?? emptyList,
    // Match prior UX: show loading on initial fetch and on refresh/filter refetch.
    loading: result.isFetching,
    error,
    reload
  };
}
