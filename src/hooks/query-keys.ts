import type { ListDeliveriesParams } from '@/types/api';

export const jobsKeys = {
  all: ['jobs'] as const,
  list: (params: ListDeliveriesParams = {}) => ['jobs', 'list', params] as const,
  detail: (id: string) => ['jobs', 'detail', id] as const,
};
