import NetInfo from '@react-native-community/netinfo';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { onlineManager, QueryClient } from '@tanstack/react-query';

import { kv, mmkvQueryStorage } from '@/services/storage';

const BACKGROUND_SYNC_KEY = 'openDispatch.backgroundSyncEnabled';

/**
 * Whether reconnect-triggered refetching is enabled — the "Background
 * Sync" toggle on the Sync & Diagnostics screen (Phase 8). Defaults on.
 * Persisted so the preference survives app restarts.
 */
export function isBackgroundSyncEnabled(): boolean {
  return kv.getJson<boolean>(BACKGROUND_SYNC_KEY) ?? true;
}

export function setBackgroundSyncEnabled(enabled: boolean) {
  kv.setJson(BACKGROUND_SYNC_KEY, enabled);
  queryClient.setDefaultOptions({
    queries: {
      ...queryClient.getDefaultOptions().queries,
      refetchOnReconnect: enabled,
    },
  });
}

/**
 * Wires TanStack Query's connectivity awareness to the device's actual
 * network state. Without this, `onlineManager` in a React Native
 * environment has no real signal — queries would never know when the
 * device goes offline, and paused mutations would never know when to
 * resume. This is what makes offline detection and mutation-queue
 * behavior (see use-update-job-status.ts) real instead of simulated.
 */
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
});

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
      refetchOnReconnect: isBackgroundSyncEnabled(),
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
