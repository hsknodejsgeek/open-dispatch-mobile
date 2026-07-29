export type Role = 'DISPATCHER' | 'DRIVER';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export type DeliveryStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Delivery {
  id: string;
  trackingNumber: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: DeliveryStatus;
  priority: Priority;
  driverId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListDeliveriesParams {
  status?: DeliveryStatus;
  page?: number;
  limit?: number;
  /**
   * TODO(Phase 4): not yet supported by GET /v1/deliveries on the server —
   * the endpoint currently has no driverId filter. Sent as a query param
   * once the server adds it; until then, filter client-side against the
   * authenticated driver's id if needed.
   */
  driverId?: string;
}

export interface ListDeliveriesResponse {
  items: Delivery[];
  total: number;
  page: number;
  limit: number;
}
