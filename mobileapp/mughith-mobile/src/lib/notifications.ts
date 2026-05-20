import { api } from './api';
import type { AppNotification } from '../types';

export const listNotifications = async (unread?: boolean): Promise<AppNotification[]> => {
  const res = await api.get<AppNotification[]>('/notifications', {
    params: unread ? { unread: true } : undefined,
  });
  return res.data;
};

export const markRead = async (id: string): Promise<AppNotification> => {
  const res = await api.patch<AppNotification>(`/notifications/${id}/read`);
  return res.data;
};

export const markAllRead = async (): Promise<{ count: number }> => {
  const res = await api.patch<{ count: number }>('/notifications/read-all');
  return res.data;
};
