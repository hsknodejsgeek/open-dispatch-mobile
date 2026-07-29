import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { jobsKeys } from '@/hooks/query-keys';
import mockJobsResponse from '@/mocks/jobs.json';
import { listDeliveries } from '@/services/deliveries-service';
import type { Delivery, ListDeliveriesParams, ListDeliveriesResponse } from '@/types/api';

const PAGE_SIZE = 20;

/**
 * Infinite-scrolling assigned jobs feed for the (tabs)/index FlashList
 * screen. Persisted to MMKV via the app-wide query persister (Phase 3), so
 * a cold start with no signal renders the last-seen page instantly before
 * revalidating.
 *
 * Falls back to src/mocks/jobs.json (once, as a single page) if the API
 * call fails outright, so the screen stays interactive without a backend.
 */
export function useAssignedJobs(params: Omit<ListDeliveriesParams, 'page' | 'limit'> = {}) {
  const query = useInfiniteQuery({
    queryKey: jobsKeys.infiniteList(params),
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<ListDeliveriesResponse> => {
      try {
        return await listDeliveries({ ...params, page: pageParam, limit: PAGE_SIZE });
      } catch (error) {
        console.warn('[useAssignedJobs] API unavailable, falling back to mock data', error);
        return mockJobsResponse as ListDeliveriesResponse;
      }
    },
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.limit;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });

  const items = useMemo<Delivery[]>(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return { ...query, items };
}
