import { api } from '@/services/api';
import type { MeResponse } from '@/types/api';

/** GET /v1/auth/me (added in Phase 4) — current user + driver profile. */
export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/v1/auth/me');
  return data;
}
