import { useQuery } from '@tanstack/react-query';

import { jobsKeys } from '@/hooks/query-keys';
import mockJobsResponse from '@/mocks/jobs.json';
import { getDelivery } from '@/services/deliveries-service';
import type { Delivery, ListDeliveriesResponse } from '@/types/api';

/**
 * Single job detail. GET /v1/deliveries/:id doesn't exist server-side yet
 * (Phase 4 adds it) — falls back to mock data (or a cached list item, if
 * present) so the job detail screen (Phase 7) has something to render
 * against today.
 */
export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: jobsKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<Delivery> => {
      if (!id) throw new Error('useJob called without an id');
      try {
        return await getDelivery(id);
      } catch (error) {
        console.warn('[useJob] API unavailable, falling back to mock data', error);
        const mock = mockJobsResponse as ListDeliveriesResponse;
        const fallback = mock.items.find((item) => item.id === id) ?? mock.items[0];
        return fallback;
      }
    },
  });
}
