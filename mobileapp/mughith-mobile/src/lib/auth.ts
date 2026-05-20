import { api } from './api';
import type { AuthResponse, User } from '../types';

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/login', { email, password });
  return res.data;
};

export const register = async (input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/register', input);
  return res.data;
};

export const me = async (): Promise<User> => {
  const res = await api.get<User>('/auth/me');
  return res.data;
};
