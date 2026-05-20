import { api } from './api';
import type { PaginatedResponse, User } from '../types';

export const getProfile = async (): Promise<User> => {
  const res = await api.get<User>('/users/profile');
  return res.data;
};

export const updateProfile = async (input: Partial<User>): Promise<User> => {
  const res = await api.patch<User>('/users/profile', input);
  return res.data;
};

export const setAvailability = async (isAvailable: boolean): Promise<User> => {
  const res = await api.patch<User>('/users/availability', { isAvailable });
  return res.data;
};

export const verifyDonator = async (id: string): Promise<User> => {
  const res = await api.patch<User>(`/users/${id}/verify`);
  return res.data;
};

export const listDonators = async (params?: {
  page?: number;
  limit?: number;
  available?: boolean;
}): Promise<PaginatedResponse<User>> => {
  const res = await api.get<PaginatedResponse<User>>('/users/donators', { params });
  return res.data;
};
