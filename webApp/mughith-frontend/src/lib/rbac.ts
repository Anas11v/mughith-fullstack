import type { UserRole } from '../types';

export const canCreateCase = (role: UserRole | undefined): boolean =>
  role === 'DISPATCHER' || role === 'ADMIN';

export const canCloseCase = (role: UserRole | undefined): boolean =>
  role === 'DISPATCHER' || role === 'ADMIN';

export const canViewAdmin = (role: UserRole | undefined): boolean => role === 'ADMIN';

export const isMobileOnly = (role: UserRole | undefined): boolean => role === 'DONATOR';

export const ROLE_LABEL: Record<UserRole, string> = {
  DISPATCHER: '911 Dispatcher',
  AMBULANCE_CREW: 'Ambulance Crew',
  ADMIN: 'System Administrator',
  DONATOR: 'Mughith Donator',
};
