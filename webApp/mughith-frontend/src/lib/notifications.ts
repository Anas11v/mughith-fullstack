import { api } from './api';
import type { Notification } from '../types';

export const listNotifications = async (unread?: boolean): Promise<Notification[]> => {
  const res = await api.get<Notification[]>('/notifications', {
    params: unread ? { unread: true } : undefined,
  });
  return res.data;
};

export const markRead = async (id: string): Promise<Notification> => {
  const res = await api.patch<Notification>(`/notifications/${id}/read`);
  return res.data;
};

export const markAllRead = async (): Promise<{ count: number }> => {
  const res = await api.patch<{ count: number }>('/notifications/read-all');
  return res.data;
};
