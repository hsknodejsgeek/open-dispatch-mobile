import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';

import { logActivity } from '@/services/activity-log';
import { recordLatency } from '@/services/api-latency';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/services/storage';

/**
 * API base URL resolution:
 *  - EXPO_PUBLIC_API_URL, if set, always wins (works for physical devices /
 *    staging by pointing at a LAN IP or deployed host).
 *  - Otherwise fall back to the Fastify dev server on :3001, adjusting
 *    localhost for the Android emulator's host-loopback address.
 */
const DEV_PORT = 3001;
const DEFAULT_BASE_URL =
  Platform.OS === 'android' ? `http://10.0.2.2:${DEV_PORT}` : `http://localhost:${DEV_PORT}`;

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'X-Client-Type': 'mobile',
  },
});

/**
 * Called when the refresh flow itself fails (refresh token missing/expired).
 * Screens/hooks built in later phases can subscribe to force a logout
 * redirect; kept as a simple callback list to avoid a circular import back
 * into expo-router from a plain service module.
 */
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorized() {
  for (const listener of unauthorizedListeners) listener();
}

interface TimedConfig extends InternalAxiosRequestConfig {
  _requestStartedAt?: number;
}

api.interceptors.request.use(async (config: TimedConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  config._requestStartedAt = Date.now();
  return config;
});

// Records real round-trip latency for the Sync & Diagnostics screen's "API
// Latency" stat (Phase 8) — actual measured timings, not a fabricated
// number. Runs on both success and failure paths.
api.interceptors.response.use(
  (response) => {
    const startedAt = (response.config as TimedConfig)._requestStartedAt;
    if (startedAt) recordLatency(Date.now() - startedAt);
    return response;
  },
  (error: AxiosError) => {
    const startedAt = (error.config as TimedConfig | undefined)?._requestStartedAt;
    if (startedAt) recordLatency(Date.now() - startedAt);
    return Promise.reject(error);
  },
);

// Single-flight refresh: concurrent 401s share one in-flight refresh call
// instead of each racing their own POST /v1/auth/refresh.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post(
      `${API_BASE_URL}/v1/auth/refresh`,
      { refreshToken },
      { headers: { 'X-Client-Type': 'mobile' } },
    );
    const { accessToken, refreshToken: newRefreshToken } = response.data as {
      accessToken: string;
      refreshToken: string;
    };
    await setTokens({ accessToken, refreshToken: newRefreshToken });
    logActivity('Token re-authenticated', 'neutral');
    return accessToken;
  } catch {
    await clearTokens();
    logActivity('Session expired — signed out', 'warning');
    notifyUnauthorized();
    return null;
  }
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isAuthRoute = originalRequest?.url?.includes('/v1/auth/');

    if (status === 401 && originalRequest && !originalRequest._retried && !isAuthRoute) {
      originalRequest._retried = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
