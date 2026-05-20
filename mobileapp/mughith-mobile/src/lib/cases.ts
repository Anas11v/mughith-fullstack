import { api } from './api';
import type {
  CaseStatus,
  EmergencyCase,
  PaginatedResponse,
  SeverityLevel,
} from '../types';

export const listCases = async (params?: {
  page?: number;
  limit?: number;
  status?: CaseStatus;
  severity?: SeverityLevel;
}): Promise<PaginatedResponse<EmergencyCase>> => {
  const res = await api.get<PaginatedResponse<EmergencyCase>>('/cases', { params });
  return res.data;
};

export const getCase = async (id: string): Promise<EmergencyCase> => {
  const res = await api.get<EmergencyCase>(`/cases/${id}`);
  return res.data;
};

export const getCaseHistory = async (): Promise<EmergencyCase[]> => {
  const res = await api.get<EmergencyCase[]>('/cases/history');
  return res.data;
};

export const createCase = async (input: {
  address: string;
  severity: SeverityLevel;
  notes?: string;
  radiusKm?: number;
  latitude?: number;
  longitude?: number;
}): Promise<EmergencyCase> => {
  const res = await api.post<EmergencyCase>('/cases', input);
  return res.data;
};

export const updateCaseStatus = async (
  id: string,
  status: CaseStatus,
): Promise<EmergencyCase> => {
  const res = await api.patch<EmergencyCase>(`/cases/${id}/status`, { status });
  return res.data;
};

export const closeCase = async (id: string, outcome: string): Promise<EmergencyCase> => {
  const res = await api.patch<EmergencyCase>(`/cases/${id}/close`, { outcome });
  return res.data;
};

export const updateAmbulanceInfo = async (
  id: string,
  input: { plate?: string; eta?: string; crew?: string },
): Promise<EmergencyCase> => {
  const res = await api.patch<EmergencyCase>(`/cases/${id}/ambulance-info`, input);
  return res.data;
};

export const triggerPanic = async (id: string): Promise<EmergencyCase> => {
  const res = await api.patch<EmergencyCase>(`/cases/${id}/panic`);
  return res.data;
};
