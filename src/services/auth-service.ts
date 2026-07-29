import { api } from '@/services/api';
import { clearTokens, setTokens } from '@/services/storage';
import type { AuthUser, LoginResponse } from '@/types/api';

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await api.post<LoginResponse>('/v1/auth/login', { email, password });
  await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/v1/auth/logout');
  } finally {
    // Mobile clients hold their own tokens (no server-side cookie to clear),
    // so local cleanup is what actually logs the driver out.
    await clearTokens();
  }
}
