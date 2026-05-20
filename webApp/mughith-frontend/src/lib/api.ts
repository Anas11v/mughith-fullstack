import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ message: string | string[]; error?: string }>) => {
    if (err.response?.status === 401) {
      const had = !!useStore.getState().accessToken;
      useStore.getState().logout();
      if (had && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        toast.error('Session expired — please sign in again.');
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  },
);

export const apiErrorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    return err.message;
  }
  return fallback;
};
