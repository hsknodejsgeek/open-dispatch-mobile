import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';

import { mmkvQueryStorage } from '@/services/storage';

/**
 * Shared TanStack Query client. `gcTime` doubles as the persisted-cache
 * lifetime: entries older than this are dropped from MMKV on restore.
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

/**
 * MMKV-backed persister: on cold start (no signal, app just killed and
 * reopened) assigned jobs render from disk immediately, then revalidate
 * over the network once connectivity is available.
 */
export const queryPersister = createSyncStoragePersister({
  storage: mmkvQueryStorage,
  key: 'OPEN_DISPATCH_QUERY_CACHE',
});
