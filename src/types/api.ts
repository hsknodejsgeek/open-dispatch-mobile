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

export type DriverStatus = 'IDLE' | 'ON_TRIP';

export interface DriverProfile {
  id: string;
  vehicleNo: string;
  status: DriverStatus;
  currentLat: number | null;
  currentLng: number | null;
}

/** GET /v1/auth/me (Phase 4) response shape. */
export interface MeResponse {
  id: string;
  email: string;
  role: Role;
  driver: DriverProfile | null;
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
  /** Server-side filter, added in Phase 4 (GET /v1/deliveries?driverId=...). */
  driverId?: string;
}

export interface ListDeliveriesResponse {
  items: Delivery[];
  total: number;
  page: number;
  limit: number;
}
