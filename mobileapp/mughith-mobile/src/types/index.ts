export type CaseStatus = 'OPEN' | 'ASSIGNED' | 'ON_SCENE' | 'CLOSED' | 'EXPIRED';
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type UserRole = 'DISPATCHER' | 'AMBULANCE_CREW' | 'ADMIN' | 'DONATOR';
export type NotificationType =
  | 'CASE_ALERT'
  | 'CASE_ASSIGNED'
  | 'CASE_CANCELLED'
  | 'CASE_CLOSED'
  | 'GENERAL';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  certification: string | null;
  certExpiry: string | null;
  isVerified: boolean;
  isAvailable: boolean;
  isBusy: boolean;
  latitude: number | null;
  longitude: number | null;
  fcmToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRef {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface EmergencyCase {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  severity: SeverityLevel;
  status: CaseStatus;
  notes: string | null;
  outcome: string | null;
  radiusKm: number;
  expiresAt: string | null;
  ambulancePlate: string | null;
  ambulanceEta: string | null;
  ambulanceCrew: string | null;
  panicTriggered: boolean;
  createdById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  createdBy?: UserRef;
  assignedTo?: UserRef | null;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  userId: string;
  caseId: string | null;
  createdAt: string;
}

export interface NearbyDonator {
  id: string;
  name: string;
  phone: string | null;
  distanceKm: number;
  etaMinutes: number;
  latitude: number;
  longitude: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}
