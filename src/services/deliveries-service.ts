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
