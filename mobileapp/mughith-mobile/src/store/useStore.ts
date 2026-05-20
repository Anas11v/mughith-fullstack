import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppNotification, EmergencyCase, User } from '../types';

interface AppState {
  user: User | null;
  accessToken: string | null;
  cases: EmergencyCase[];
  donators: User[];
  notifications: AppNotification[];
  activeCaseId: string | null;
  hydrated: boolean;

  setSession: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;

  setCases: (cases: EmergencyCase[]) => void;
  upsertCase: (c: EmergencyCase) => void;

  setDonators: (donators: User[]) => void;
  upsertDonator: (d: User) => void;

  setNotifications: (n: AppNotification[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  setActiveCaseId: (id: string | null) => void;
  setHydrated: (v: boolean) => void;
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
      hydrated: false,

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
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: 'mughith-mobile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        activeCaseId: state.activeCaseId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
