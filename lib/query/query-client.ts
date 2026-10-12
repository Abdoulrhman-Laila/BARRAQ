import { QueryClient } from "@tanstack/react-query";

/**
 * Factory for a browser/request-scoped QueryClient.
 * Do not export a singleton — App Router can reuse module scope across requests on the server.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid immediate refetch storms once features migrate; still fresh enough for admin lists.
        staleTime: 30_000,
        // Keep unused cache briefly for back-navigation without long retention.
        gcTime: 5 * 60_000,
        // One retry is enough for transient network blips; avoid hammering BFF/backend.
        retry: 1,
        // Admin dashboard: focus refetch is noisy and duplicates existing manual refresh UX.
        refetchOnWindowFocus: false,
        refetchOnReconnect: true
      },
      mutations: {
        retry: 0
      }
    }
  });
}
