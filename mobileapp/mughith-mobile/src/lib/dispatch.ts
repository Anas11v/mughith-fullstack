import { api } from './api';
import type { EmergencyCase, NearbyDonator } from '../types';

export const acceptCase = async (caseId: string): Promise<EmergencyCase> => {
  const res = await api.post<EmergencyCase>(`/dispatch/${caseId}/accept`);
  return res.data;
};

export const rejectCase = async (caseId: string): Promise<{ ok: boolean }> => {
  const res = await api.post<{ ok: boolean }>(`/dispatch/${caseId}/reject`);
  return res.data;
};

export const nearbyDonators = async (caseId: string): Promise<NearbyDonator[]> => {
  const res = await api.get<NearbyDonator[]>(`/dispatch/${caseId}/nearby`);
  return res.data;
};
