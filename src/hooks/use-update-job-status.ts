import { useMutation, useQueryClient } from '@tanstack/react-query';

import { jobsKeys } from '@/hooks/query-keys';
import { logActivity } from '@/services/activity-log';
import { updateDeliveryStatus } from '@/services/deliveries-service';
import type { Delivery, DeliveryStatus, ListDeliveriesResponse } from '@/types/api';

export interface UpdateJobStatusInput {
  id: string;
  status: DeliveryStatus;
}

/**
 * Shared mutationKey so the Sync & Diagnostics screen (Phase 8) can read
 * this mutation's live state via useMutationState — pending/paused count
 * as "Uploads", error count as "Failed". With the default networkMode
 * ('online'), a mutation fired while offline is automatically paused
 * (not errored) and resumed once TanStack Query's onlineManager reports
 * connectivity again (wired to NetInfo in services/query-client.ts) — real
 * offline queueing behavior, not a simulated one.
 */
export const UPDATE_JOB_STATUS_MUTATION_KEY = ['jobStatusUpdate'];

/**
 * Optimistically updates both the job detail cache and any cached list
 * pages containing this job, so the "Start Delivery" / "Mark as Delivered"
 * action (Phase 7) feels instant. Rolls back on failure, always
 * revalidates against the server on settle.
 */
export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: UPDATE_JOB_STATUS_MUTATION_KEY,
    mutationFn: ({ id, status }: UpdateJobStatusInput) => updateDeliveryStatus(id, status),

    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: jobsKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: jobsKeys.all });

      const previousDetail = queryClient.getQueryData<Delivery>(jobsKeys.detail(id));
      const previousLists = queryClient.getQueriesData<ListDeliveriesResponse>({
        queryKey: jobsKeys.all,
      });

      if (previousDetail) {
        queryClient.setQueryData<Delivery>(jobsKeys.detail(id), {
          ...previousDetail,
          status,
        });
      }

      previousLists.forEach(([queryKey, data]) => {
        if (!data) return;
        queryClient.setQueryData<ListDeliveriesResponse>(queryKey, {
          ...data,
          items: data.items.map((item) => (item.id === id ? { ...item, status } : item)),
        });
      });

      return { previousDetail, previousLists };
    },

    onError: (_err, { id, status }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(jobsKeys.detail(id), context.previousDetail);
      }
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      logActivity(`Failed to update ${context?.previousDetail?.trackingNumber ?? id} to ${status}`, 'danger');
    },

    onSuccess: (data) => {
      logActivity(`Job ${data.trackingNumber} status updated to ${data.status}`, 'success');
    },

    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: jobsKeys.all });
    },
  });
}
