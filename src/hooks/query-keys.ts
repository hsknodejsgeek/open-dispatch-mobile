import type { ListDeliveriesParams } from '@/types/api';

export const jobsKeys = {
  all: ['jobs'] as const,
  list: (params: ListDeliveriesParams = {}) => ['jobs', 'list', params] as const,
  // Separate from `list` because it's paged via useInfiniteQuery — a
  // different cached shape (pages[]) than the plain list query, so they
  // can't safely share a key even with identical filter params.
  infiniteList: (params: Omit<ListDeliveriesParams, 'page'> = {}) =>
    ['jobs', 'infinite', params] as const,
  detail: (id: string) => ['jobs', 'detail', id] as const,
};
