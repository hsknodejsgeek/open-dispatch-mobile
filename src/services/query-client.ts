import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client. MMKV-backed offline persistence is wired up
 * in Phase 3 (services layer) — this phase only establishes the provider so
 * later screens/hooks have a client to attach to.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
    },
  },
});
