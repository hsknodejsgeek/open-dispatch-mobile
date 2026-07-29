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

export const cacheStorage = new MMKV({ id: 'open-dispatch-cache' });

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
  sizeBytes(): number {
    return cacheStorage.size;
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
