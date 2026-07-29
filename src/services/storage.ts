import * as SecureStore from 'expo-secure-store';
import { MMKV } from 'react-native-mmkv';

/**
 * Two storage tiers, chosen deliberately:
 *  - SecureStore: JWT access/refresh tokens only. Encrypted (iOS Keychain /
 *    Android Keystore) — never put bulk data here, it's slow and small.
 *  - MMKV: everything else (query cache, offline mutation queue, device
 *    diagnostics). Fast synchronous key-value storage backed by disk.
 *
 * NOTE: react-native-mmkv is a native module — it will NOT load in Expo Go.
 * Run via `expo run:ios` / `expo run:android` or an EAS dev client build.
 *
 * Pinned to react-native-mmkv 2.x (not the newer 3.x) because 3.x requires
 * the New Architecture (TurboModules) and this project's dev client build
 * doesn't have it enabled. 2.x uses the classic bridge and works as-is.
 */

// ---- Secure (tokens) ----

const ACCESS_TOKEN_KEY = 'openDispatch.accessToken';
const REFRESH_TOKEN_KEY = 'openDispatch.refreshToken';

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setTokens(tokens: { accessToken: string; refreshToken: string }) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

// ---- MMKV (cache, query persistence, diagnostics) ----

/**
 * MMKV requires JSI (synchronous on-device calls) and throws at
 * construction time if the app is running under a remote JS debugger
 * (legacy Chrome debugging forces JS off-device). That throw happens at
 * module-import time, which — left unguarded — takes down the entire
 * expo-router tree before it ever renders (see the app crashing with an
 * unrelated "Cannot read property 'ErrorBoundary' of undefined" error from
 * useScreens.js as a downstream symptom).
 *
 * Falls back to an in-memory Map with the same surface so a dev's debugger
 * choice can't crash the whole app; falls back silently to nothing being
 * persisted across reloads in that mode. Real devices/dev-client builds
 * without remote debugging attached always get the real MMKV instance.
 */
function createCacheStorage(): NativeMMKVLike {
  try {
    return new MMKV({ id: 'open-dispatch-cache' });
  } catch (error) {
    console.warn(
      '[storage] MMKV unavailable (likely remote JS debugging is enabled — disable it in the ' +
        'dev menu for real on-device caching). Falling back to an in-memory store for this session.',
      error,
    );
    return createInMemoryFallback();
  }
}

interface NativeMMKVLike {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  getAllKeys(): string[];
  clearAll(): void;
}

function createInMemoryFallback(): NativeMMKVLike {
  const store = new Map<string, string>();
  return {
    getString: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value);
    },
    delete: (key) => {
      store.delete(key);
    },
    getAllKeys: () => Array.from(store.keys()),
    clearAll: () => {
      store.clear();
    },
  };
}

export const cacheStorage = createCacheStorage();

/** Sync key-value helpers used directly by app code (e.g. sync-status screen). */
export const kv = {
  getString(key: string): string | undefined {
    return cacheStorage.getString(key);
  },
  setString(key: string, value: string) {
    cacheStorage.set(key, value);
  },
  getJson<T>(key: string): T | undefined {
    const raw = cacheStorage.getString(key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  },
  setJson<T>(key: string, value: T) {
    cacheStorage.set(key, JSON.stringify(value));
  },
  remove(key: string) {
    cacheStorage.delete(key);
  },
  clearAll() {
    cacheStorage.clearAll();
  },
  /**
   * Approximate cache size in bytes. react-native-mmkv 2.x has no built-in
   * `.size` accessor (added in 3.x), so this sums the UTF-16 length of
   * every stored string as a rough proxy — fine for a diagnostics display,
   * not exact byte-for-byte disk usage.
   */
  sizeBytes(): number {
    return cacheStorage
      .getAllKeys()
      .reduce((total, key) => total + (cacheStorage.getString(key)?.length ?? 0), 0);
  },
};

/**
 * Synchronous storage adapter satisfying the `Storage` interface expected by
 * @tanstack/query-sync-storage-persister (getItem/setItem/removeItem).
 */
export const mmkvQueryStorage = {
  getItem: (key: string) => cacheStorage.getString(key) ?? null,
  setItem: (key: string, value: string) => cacheStorage.set(key, value),
  removeItem: (key: string) => cacheStorage.delete(key),
};
