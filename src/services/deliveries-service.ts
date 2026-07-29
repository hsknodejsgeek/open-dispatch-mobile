import { api } from '@/services/api';
import type {
  Delivery,
  DeliveryStatus,
  ListDeliveriesParams,
  ListDeliveriesResponse,
} from '@/types/api';

export async function listDeliveries(
  params: ListDeliveriesParams = {},
): Promise<ListDeliveriesResponse> {
  const { data } = await api.get<ListDeliveriesResponse>('/v1/deliveries', { params });
  return data;
}

/**
 * TODO(Phase 4): GET /v1/deliveries/:id doesn't exist on the server yet
 * (only list/create/status-patch). This call will 404 until that route is
 * added — wired up now so Phase 6/7 hooks have a stable service function to
 * import.
 */
export async function getDelivery(id: string): Promise<Delivery> {
  const { data } = await api.get<Delivery>(`/v1/deliveries/${id}`);
  return data;
}

export async function updateDeliveryStatus(
  id: string,
  status: DeliveryStatus,
): Promise<Delivery> {
  const { data } = await api.patch<Delivery>(`/v1/deliveries/${id}/status`, { status });
  return data;
}
