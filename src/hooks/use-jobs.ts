import { useQuery } from '@tanstack/react-query';

import { jobsKeys } from '@/hooks/query-keys';
import mockJobsResponse from '@/mocks/jobs.json';
import { listDeliveries } from '@/services/deliveries-service';
import type { ListDeliveriesParams, ListDeliveriesResponse } from '@/types/api';

/**
 * Assigned jobs list. Query results are persisted to MMKV (wired in
 * query-client.ts), so on a cold start with no signal this resolves
 * instantly from disk before revalidating over the network.
 *
 * Fallback mock layer: if the request fails outright (no backend running,
 * offline with nothing cached yet), falls back to src/mocks/jobs.json so
 * the app stays interactive standalone.
 */
export function useJobs(params: ListDeliveriesParams = {}) {
  return useQuery({
    queryKey: jobsKeys.list(params),
    queryFn: async (): Promise<ListDeliveriesResponse> => {
      try {
        return await listDeliveries(params);
      } catch (error) {
        console.warn('[useJobs] API unavailable, falling back to mock data', error);
        return mockJobsResponse as ListDeliveriesResponse;
      }
    },
  });
}
