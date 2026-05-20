import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, EmergencyCase, Notification } from '../types';

interface AppState {
  user: User | null;
  accessToken: string | null;
  cases: EmergencyCase[];
  donators: User[];
  notifications: Notification[];
  activeCaseId: string | null;

  setSession: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;

  setCases: (cases: EmergencyCase[]) => void;
  upsertCase: (c: EmergencyCase) => void;

  setDonators: (donators: User[]) => void;
  upsertDonator: (d: User) => void;

  setNotifications: (n: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  setActiveCaseId: (id: string | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      cases: [],
      donators: [],
      notifications: [],
      activeCaseId: null,

      setSession: (user, accessToken) => set({ user, accessToken }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          cases: [],
          donators: [],
          notifications: [],
          activeCaseId: null,
        }),

      setCases: (cases) => set({ cases }),
      upsertCase: (c) =>
        set((state) => {
          const i = state.cases.findIndex((x) => x.id === c.id);
          if (i === -1) return { cases: [c, ...state.cases] };
          const next = [...state.cases];
          next[i] = { ...next[i], ...c };
          return { cases: next };
        }),

      setDonators: (donators) => set({ donators }),
      upsertDonator: (d) =>
        set((state) => {
          const i = state.donators.findIndex((x) => x.id === d.id);
          if (i === -1) return { donators: [d, ...state.donators] };
          const next = [...state.donators];
          next[i] = { ...next[i], ...d };
          return { donators: next };
        }),

      setNotifications: (n) => set({ notifications: n }),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),
      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      setActiveCaseId: (id) => set({ activeCaseId: id }),
    }),
    {
      name: 'mughith-app',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        activeCaseId: state.activeCaseId,
      }),
    },
  ),
);
