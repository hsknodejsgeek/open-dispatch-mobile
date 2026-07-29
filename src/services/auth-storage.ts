import * as SecureStore from 'expo-secure-store';

/**
 * Minimal SecureStore token accessor used by the root layout's auth gate.
 * This will be superseded/expanded by the full storage service in Phase 3
 * (services/storage.ts) — kept intentionally small here since Phase 2 is
 * navigation-only.
 */
export const ACCESS_TOKEN_KEY = 'openDispatch.accessToken';

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}
